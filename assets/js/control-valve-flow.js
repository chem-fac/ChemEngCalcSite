(function (root) {
  'use strict';
  const FACTORS = Object.freeze({ kPa: 1, MPa: 1000, bar: 100 });
  function fail(field, message) { const e = new Error(message); e.field = field; throw e; }
  function number(value, field, label, positive) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) fail(field, label + 'を入力してください。');
    const n = Number(value);
    if (!Number.isFinite(n)) fail(field, label + 'には有限の数値を入力してください。');
    if (positive && (n < 1e-12 || n > 1e12)) fail(field, label + 'は10⁻¹²〜10¹²の範囲で入力してください。');
    return n;
  }
  function calculate(input) {
    if (!Object.hasOwn(FACTORS, input.unit)) fail('pressure-unit', '圧力単位を選択してください。');
    if (!['Cv', 'Kv'].includes(input.type)) fail('coefficient-type', 'CvまたはKvを選択してください。');
    if (!['direct', 'difference'].includes(input.mode)) fail('pressure-mode', '圧力の入力方法を選択してください。');
    const coefficient = number(input.coefficient, 'coefficient', '流量係数', true);
    const density = number(input.density, 'density', '密度', true);
    const factor = FACTORS[input.unit];
    function pressure(value, field, label) {
      const n = number(value, field, label, false) * factor;
      if (!Number.isFinite(n) || Math.abs(n) > 1e12) fail(field, label + 'はkPa換算で絶対値10¹²以下にしてください。');
      return n;
    }
    let p1 = null, p2 = null, dp;
    if (input.mode === 'difference') {
      p1 = pressure(input.p1, 'p1', '上流圧力');
      p2 = pressure(input.p2, 'p2', '下流圧力');
      dp = p1 - p2;
    } else dp = pressure(input.dp, 'dp', '差圧Δp');
    if (!(dp > 0)) fail(input.mode === 'difference' ? 'p2' : 'dp', '差圧は正の値が必要です。上流圧力が下流圧力より大きい、または差圧が正になるよう入力を確認してください。逆差圧・差圧ゼロは計算しません。');
    if (dp > 1e12) fail(input.mode === 'difference' ? 'p1' : 'dp', '差圧はkPa換算で10¹²以下にしてください。');
    const kv = input.type === 'Kv' ? coefficient : coefficient * 0.865;
    const q = kv * Math.sqrt(10 * dp / density);
    const liters = q * 1000 / 60, mass = q * density;
    if (![q, liters, mass].every(n => Number.isFinite(n) && n > 0)) fail('coefficient', '計算結果が数値処理の範囲を超えました。入力値を確認してください。');
    return { q, liters, mass, kv, dp, p1, p2, density, coefficient, type: input.type, mode: input.mode, unit: input.unit };
  }
  if (typeof module === 'object' && module.exports) module.exports = { calculate, FACTORS };
  const doc = root.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) {
      const e = v.toExponential(sig - 1);
      const m = e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
      return e;
    }
    return Number(v.toPrecision(sig)).toString();
  }
  const $ = id => doc.getElementById(id);
  const PLACEHOLDER = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  let mode = 'difference';
  function clearError() { const e = $('error'); e.textContent = ''; e.style.display = 'none'; }
  function setError(message) {
    const e = $('error'); e.textContent = message; e.style.display = 'block';
    $('result-area').innerHTML = PLACEHOLDER;
  }
  function setMode(next) {
    mode = next;
    doc.querySelectorAll('.mode-tab').forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    doc.querySelectorAll('[data-show-when]').forEach(el => {
      el.style.display = el.dataset.showWhen === mode ? '' : 'none';
    });
    clearError();
    $('result-area').innerHTML = PLACEHOLDER;
  }
  // 各欄の単位で kPa に換算した値（空欄は空のまま渡し、検査は calculate に任せる）
  function inKPa(id) {
    const text = $(id).value.trim();
    if (text === '') return '';
    return Number(text) * FACTORS[$(id + '_unit').value];
  }
  function entered(id) { return String(Number($(id).value)); }
  function run() {
    clearError();
    let r;
    try {
      r = calculate({
        mode, unit: 'kPa', type: $('coef_type').value,
        coefficient: $('coef').value, density: $('rho').value,
        p1: mode === 'difference' ? inKPa('p1') : '', p2: mode === 'difference' ? inKPa('p2') : '', dp: mode === 'direct' ? inKPa('dp') : ''
      });
    } catch (e) {
      return setError(e.message);
    }
    const pressure = mode === 'difference'
      ? `P<sub>1</sub> = ${entered('p1')} ${$('p1_unit').value}、P<sub>2</sub> = ${entered('p2')} ${$('p2_unit').value}（同一の圧力基準）`
      : `Δp = ${entered('dp')} ${$('dp_unit').value}`;
    $('result-area').innerHTML = `
      <div class="result-target">体積流量 <span class="sym">Q</span>（運転状態）</div>
      <div class="result-value-big">${fmtNum(r.q)} <span class="unit">m³/h</span></div>
      <div class="result-detail-label">ほかの単位・途中の値</div>
      <table class="unit-table"><tbody>
        <tr><td>体積流量 <span class="sym">q</span></td><td class="num">${fmtNum(r.liters)} L/min</td></tr>
        <tr><td>質量流量 <span class="sym">ṁ</span></td><td class="num">${fmtNum(r.mass)} kg/h</td></tr>
        <tr><td>差圧 <span class="sym">Δp</span></td><td class="num">${fmtNum(r.dp)} kPa</td></tr>
        <tr><td>計算に使った <span class="sym">K<sub>v</sub></span></td><td class="num">${fmtNum(r.kv)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>${pressure}、実効${r.type} = ${entered('coef')}、ρ = ${entered('rho')} kg/m³</div>
        <div>単相・乱流・非チョーク、F<sub>p</sub> = 1 を仮定した簡易推定です。キャビテーションなどの発生は判定しません。</div>
      </div>
    `;
  }
  function reset() {
    ['p1', 'p2', 'dp', 'coef', 'rho'].forEach(id => { $(id).value = ''; });
    ['p1_unit', 'p2_unit', 'dp_unit'].forEach(id => { $(id).value = 'kPa'; });
    $('coef_type').value = 'Cv';
    setMode('difference');
  }
  doc.addEventListener('DOMContentLoaded', () => {
    doc.querySelectorAll('.mode-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    $('calc-btn').addEventListener('click', run);
    $('reset-btn').addEventListener('click', reset);
    setMode('difference');
  });
})(typeof window === 'object' ? window : globalThis);
