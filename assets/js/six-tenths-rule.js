(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const N_BASE = [0.6, 0.7];     // 0.6乗則・0.7乗則
  const N_MAX = 1.5;             // 指数の入力上限
  const RATIO_WARN = 3;          // 容量比がこれを超えたら注記（AIの設定）

  const yen = (v) => Math.round(v).toLocaleString('ja-JP');
  const myen = (v) => (v / 1e6).toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  function num(id) {
    const s = $(id).value.trim();
    return s === '' ? NaN : Number(s);
  }
  const blank = (id) => $(id).value.trim() === '';

  function setError(msg) {
    const e = $('error');
    e.textContent = msg;
    e.style.display = 'block';
    const ra = $('result-area');
    if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }
  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function calculate() {
    clearError();

    const c1 = num('c1');
    const s1 = num('s1');
    const s2 = num('s2');
    if (!isFinite(c1) || c1 <= 0) return setError('分かっている費用は正の数で入力してください。');
    if (!isFinite(s1) || s1 <= 0) return setError('その容量は正の数で入力してください。');
    if (!isFinite(s2) || s2 <= 0) return setError('新しい容量は正の数で入力してください。');

    let nUser = null;
    if (!blank('n')) {
      nUser = num('n');
      if (!isFinite(nUser) || nUser <= 0 || nUser > N_MAX) return setError(`指数は0より大きく${N_MAX}以下の数で入力してください。`);
    }

    let idx = 1;
    const b1 = blank('i1');
    const b2 = blank('i2');
    if (b1 !== b2) return setError('費用の年と今のコスト指数の両方を入れてください（補正しないなら両方空欄）。');
    if (!b1) {
      const i1 = num('i1');
      const i2 = num('i2');
      if (!isFinite(i1) || i1 <= 0 || !isFinite(i2) || i2 <= 0) return setError('コスト指数は正の数で入力してください。');
      idx = i2 / i1;
    }

    const ratio = s2 / s1;
    const ns = N_BASE.slice();
    if (nUser !== null && !N_BASE.includes(nUser)) ns.push(nUser);
    const rows = ns.map((n) => {
      const f = Math.pow(ratio, n);
      return { n, f, c2: c1 * f * idx, user: n === nUser };
    });
    if (rows.some((r) => !isFinite(r.c2) || r.c2 <= 0)) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }

    $('result-area').innerHTML = render({ c1, ratio, idx, indexed: !b1, rows, nUser });
  }

  function render(r) {
    const main = r.rows.find((x) => x.user) || r.rows[0];
    const rowsHtml = r.rows.map((x) => `
        <tr>
          <td>${x.user ? '入力した指数' : (x.n === 0.6 ? '0.6乗則' : '0.7乗則')}（n＝${Number(x.n.toFixed(3))}）</td>
          <td class="num">${fmtNum(x.f)}</td>
          <td class="num">${myen(x.c2)}</td>
        </tr>`).join('');

    const notes = [];
    const span = Math.max(r.ratio, 1 / r.ratio);
    if (span > RATIO_WARN) {
      notes.push(`容量比が${fmtNum(span)}倍あります。機器の最大寸法を超えて台数が増える範囲では、指数は1に近づきます。`);
    }
    if (!r.indexed) notes.push('コスト指数が空欄のため、時期の補正はしていません。');

    return `
      <div class="result-target">換算後の費用（n＝${Number(main.n.toFixed(3))}）</div>
      <div class="result-value-big">${myen(main.c2)} <span class="unit">百万円</span></div>
      <div class="result-meta">
        <div>${yen(main.c2)} 円</div>
      </div>

      <div class="result-detail-label">指数ごとの結果</div>
      <table class="unit-table">
        <tr><td><strong>指数</strong></td><td class="num"><strong>容量比のn乗</strong></td><td class="num"><strong>換算後［百万円］</strong></td></tr>
        ${rowsHtml}
      </table>

      <table class="unit-table">
        <tr><td>容量比 <span class="sym">S</span><sub>2</sub>/<span class="sym">S</span><sub>1</sub></td><td class="num">${fmtNum(r.ratio)}</td></tr>
        <tr><td>指数の比 <span class="sym">I</span><sub>2</sub>/<span class="sym">I</span><sub>1</sub></td><td class="num">${fmtNum(r.idx)}</td></tr>
        <tr><td>分かっている費用 <span class="sym">C</span><sub>1</sub></td><td class="num">${myen(r.c1)} 百万円</td></tr>
      </table>

      ${notes.length ? `<div class="result-meta">${notes.map((s) => `<div>${s}</div>`).join('')}</div>` : ''}`;
  }

  function reset() {
    ['c1', 's1', 's2', 'n', 'i1', 'i2'].forEach((id) => { $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
