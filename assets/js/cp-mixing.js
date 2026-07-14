(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const N_ROWS = 8;
  function fmtNum(v, sig = 4) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function buildRows() {
    const tb = $('cp-rows');
    tb.innerHTML = '';
    for (let i = 0; i < N_ROWS; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td><input type="text" data-name="${i}" placeholder="例：水"></td><td><input type="number" inputmode="decimal" step="any" data-w="${i}" placeholder=""></td><td><input type="number" inputmode="decimal" step="any" data-cp="${i}" placeholder=""></td>`;
      tb.appendChild(tr);
    }
  }

  function getFactorToSI() {
    // → returns multiplier to convert to "base" depending on mode
    const u = $('cp_unit').value;
    if (u === 'kJkgK') return 1000;  // → J/(kg·K)
    if (u === 'JkgK') return 1;
    if (u === 'JmolK') return 1;      // → J/(mol·K)
    if (u === 'kJmolK') return 1000;
    return 1;
  }
  function isMolar() { const u = $('cp_unit').value; return (u === 'JmolK' || u === 'kJmolK'); }

  function calc() {
    clearError();
    const components = [];
    for (let i = 0; i < N_ROWS; i++) {
      const w = parseFloat(document.querySelector(`[data-w="${i}"]`).value);
      const cp = parseFloat(document.querySelector(`[data-cp="${i}"]`).value);
      const name = (document.querySelector(`[data-name="${i}"]`).value || `成分${i + 1}`).trim();
      const hasW = document.querySelector(`[data-w="${i}"]`).value !== '';
      const hasCp = document.querySelector(`[data-cp="${i}"]`).value !== '';
      if (hasW !== hasCp) return setError(`${i + 1}行目は「分率／量」と「比熱」の両方を入力してください。`);
      if (hasW && (!(w > 0) || !(cp > 0))) return setError(`${i + 1}行目の「分率／量」と「比熱」は正の値で入力してください。`);
      if (isFinite(w) && w > 0 && isFinite(cp) && cp > 0) {
        components.push({ name, w, cp });
      }
    }
    if (components.length === 0) return setError('少なくとも1成分の「分率／量」と「比熱」を正の値で入力してください。');

    const sumW = components.reduce((s, c) => s + c.w, 0);
    const factor = getFactorToSI();
    const sumCpW = components.reduce((s, c) => s + c.w * c.cp * factor, 0);
    const cp_mix_SI = sumCpW / sumW;  // J/(kg·K) or J/(mol·K)
    const cp_mix_disp = cp_mix_SI / factor;  // back to user unit

    const isMolarMode = isMolar();
    const unitLabel = $('cp_unit').selectedOptions[0].text;
    const rows = components.map(c => {
      const frac = c.w / sumW;
      const contrib = frac * c.cp;
      return `<tr><td>${c.name}</td><td class="num">${fmtNum(c.w)}</td><td class="num">${fmtNum(frac)}</td><td class="num">${fmtNum(c.cp)}</td><td class="num">${fmtNum(contrib)}</td></tr>`;
    }).join('');

    $('result-area').innerHTML = `
      <div class="result-target">混合物の比熱 ${isMolarMode ? 'C_p,mix' : 'c_p,mix'}</div>
      <div class="result-value-big">${fmtNum(cp_mix_disp)} <span class="unit">${isMolarMode ? '（モル基準）' : '（質量基準）'}</span></div>
      <table class="unit-table"><tbody>
        <tr><td>混合物比熱（入力単位）</td><td class="num">${fmtNum(cp_mix_disp)} ${unitLabel.split('（')[0]}</td></tr>
        ${isMolarMode ? `<tr><td>SI（J/(mol·K)）</td><td class="num">${fmtNum(cp_mix_SI)} J/(mol·K)</td></tr>` : `<tr><td>SI（J/(kg·K)）</td><td class="num">${fmtNum(cp_mix_SI)} J/(kg·K)</td></tr>`}
        <tr><td>成分数</td><td class="num">${components.length}</td></tr>
        <tr><td>合計分量</td><td class="num">${fmtNum(sumW)}</td></tr>
      </tbody></table>
      <table class="cp-table" style="margin-top:10px;">
        <thead><tr><th>成分</th><th class="num">入力分量</th><th class="num">分率</th><th class="num">比熱</th><th class="num">寄与（分率×比熱）</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="result-meta">
        <div class="result-note">※ 線形和（理想混合）前提。非理想性が強い系では超過比熱の補正が必要です。</div>
      </div>
    `;
  }

  function reset() {
    document.querySelectorAll('#cp-rows input').forEach(el => el.value = '');
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function setMode(next) {
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    if (next === 'mass') $('cp_unit').value = 'kJkgK';
    else $('cp_unit').value = 'JmolK';
  }

  function syncModeTabToUnit() {
    const mode = isMolar() ? 'mole' : 'mass';
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildRows();
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('cp_unit').addEventListener('change', syncModeTabToUnit);
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
