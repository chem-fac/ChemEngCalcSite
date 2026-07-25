(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「換算する」を押してください</div>'; };

  let mode = 'toval';

  function allFinite(rows) {
    return rows.every(r => isFinite(r.value));
  }

  function ne43Note(I, dir) {
    if (I >= 4 && I <= 20) return '';
    if (dir === 'calc') return `計算上の電流 I = ${fmtNum(I)} mA は 4〜20 mA のレンジ外です。実際の伝送器は約 3.8〜20.5 mA で飽和するため、この電流はそのまま出力されません（NAMUR NE43）。`;
    if (I < 3.6) return `I = ${fmtNum(I)} mA は故障信号の領域です（NAMUR NE43：3.6 mA 未満はダウンスケール・バーンアウト）。伝送器の異常や断線の可能性を確認してください。`;
    if (I > 21) return `I = ${fmtNum(I)} mA は故障信号の領域です（NAMUR NE43：21 mA 超はアップスケール・バーンアウト）。伝送器の異常の可能性を確認してください。`;
    if (I < 3.8 || I > 20.5) return `I = ${fmtNum(I)} mA は有効測定域（NAMUR NE43：3.8〜20.5 mA）の外です。伝送器の状態を確認してください。`;
    return `I = ${fmtNum(I)} mA は 4〜20 mA のレンジ外（飽和域）です。プロセス値が校正レンジを外れている可能性があります。`;
  }

  function renderRows(rows, notes) {
    const body = rows.map(r =>
      `<tr><td>${r.label}</td><td class="num">${fmtNum(r.value)}</td><td>${r.unit}</td></tr>`
    ).join('');
    const noteHtml = notes.filter(n => n).map(n => `<div class="result-note">※ ${n}</div>`).join('');
    $('result-area').innerHTML = `
      <div class="result-target">換算結果</div>
      <table class="sig-table">
        <thead><tr><th>項目</th><th>値</th><th>単位</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="result-meta">${noteHtml}</div>
    `;
  }

  function calcToVal() {
    const I = val('I'), LRV = val('LRV'), URV = val('URV');
    const ch = $('char').value;
    if (!isFinite(I)) return setError('電流 I を入力してください。');
    if (!isFinite(LRV)) return setError('レンジ下限 LRV を入力してください。');
    if (!isFinite(URV)) return setError('レンジ上限 URV を入力してください。');
    if (URV === LRV) return setError('レンジ上限と下限が同じ値です。異なる値を入力してください。');

    const xI = (I - 4) / 16;
    const V = 0.25 * I;
    let rows, notes = [];

    if (ch === 'sqrt') {
      if (LRV > URV) return setError('開平特性は正レンジ（LRV < URV）のみ対応しています。リニア特性では逆レンジも換算できます。');
      if (I < 4) return setError('開平特性では 4 mA 未満は差圧が負（流量 0% 以下）に相当するため換算できません。ゼロ流量近傍では正常でも 4 mA をわずかに下回ることがあり、実機ではローカットにより流量 0% として扱われます。');
      const x = Math.sqrt(xI);
      const PV = LRV + (URV - LRV) * x;
      rows = [
        { label: '電流スパン比（差圧に対応）', value: xI * 100, unit: '%' },
        { label: '流量スパン比', value: x * 100, unit: '%' },
        { label: '流量（測定値 PV）', value: PV, unit: 'レンジ単位' },
        { label: '電圧換算（受信抵抗 250 Ω）', value: V, unit: 'V' },
      ];
      notes.push('開平換算：流量スパン比 = √(電流スパン比)。伝送器が開平演算内蔵の場合はリニアを使ってください。');
      if (xI > 1) notes.push('スパン比が 100% を超えています（オーバーレンジ）。');
    } else {
      const PV = LRV + (URV - LRV) * xI;
      rows = [
        { label: 'スパン比', value: xI * 100, unit: '%' },
        { label: '測定値 PV', value: PV, unit: 'レンジ単位' },
        { label: '電圧換算（受信抵抗 250 Ω）', value: V, unit: 'V' },
      ];
      if (xI < 0 || xI > 1) notes.push('スパン比がレンジ外です（外挿値として計算しています）。');
    }

    if (!allFinite(rows)) return setError('入力値が極端すぎて計算できません。値の桁を見直してください。');
    notes.push(ne43Note(I));
    renderRows(rows, notes);
  }

  function calcToMa() {
    const PV = val('PV'), LRV = val('LRV'), URV = val('URV');
    const ch = $('char').value;
    if (!isFinite(PV)) return setError('測定値 PV を入力してください。');
    if (!isFinite(LRV)) return setError('レンジ下限 LRV を入力してください。');
    if (!isFinite(URV)) return setError('レンジ上限 URV を入力してください。');
    if (URV === LRV) return setError('レンジ上限と下限が同じ値です。異なる値を入力してください。');

    const x = (PV - LRV) / (URV - LRV);
    let xI, rows, notes = [];

    if (ch === 'sqrt') {
      if (LRV > URV) return setError('開平特性は正レンジ（LRV < URV）のみ対応しています。リニア特性では逆レンジも換算できます。');
      if (x < 0) return setError('開平特性では、流量スパン比が負になる測定値は換算できません。測定値とレンジ（LRV・URV）を確認してください。');
      xI = x * x;
      const I = 4 + 16 * xI;
      rows = [
        { label: '流量スパン比', value: x * 100, unit: '%' },
        { label: '電流スパン比（差圧に対応）', value: xI * 100, unit: '%' },
        { label: '電流 I', value: I, unit: 'mA' },
        { label: '電圧換算（受信抵抗 250 Ω）', value: 0.25 * I, unit: 'V' },
      ];
      notes.push('開平換算：電流スパン比 = (流量スパン比)²。伝送器が開平演算内蔵の場合はリニアを使ってください。');
      if (!allFinite(rows)) return setError('入力値が極端すぎて計算できません。値の桁を見直してください。');
      if (x > 1) notes.push('測定値がレンジ上限を超えています（オーバーレンジ）。');
      notes.push(ne43Note(I, 'calc'));
    } else {
      xI = x;
      const I = 4 + 16 * xI;
      rows = [
        { label: 'スパン比', value: x * 100, unit: '%' },
        { label: '電流 I', value: I, unit: 'mA' },
        { label: '電圧換算（受信抵抗 250 Ω）', value: 0.25 * I, unit: 'V' },
      ];
      if (!allFinite(rows)) return setError('入力値が極端すぎて計算できません。値の桁を見直してください。');
      if (x < 0 || x > 1) notes.push('測定値がレンジ外です（外挿値として計算しています）。');
      notes.push(ne43Note(I, 'calc'));
    }
    renderRows(rows, notes);
  }

  function calculate() {
    clearError();
    if (mode === 'toval') calcToVal();
    else calcToMa();
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next);
    });
    clearError(); clearResult();
  }

  function reset() {
    ['I', 'PV', 'LRV', 'URV'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError(); clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
