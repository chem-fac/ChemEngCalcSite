(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const MW_WATER = 18.0153;
  function fmtNum(v, sig = 5) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function cToKgKg(v, unit) { return unit === 'g100' ? v / 100 : v; }

  function toggleHydrateRow() {
    const n = val('n');
    $('row-Msalt').hidden = !(isFinite(n) && n > 0);
  }

  function calc() {
    clearError();
    const c1 = cToKgKg(val('c1'), $('c1_unit').value);
    const c2 = cToKgKg(val('c2'), $('c2_unit').value);
    const mw0 = val('mw0');
    const ms0 = val('ms0');
    const E = val('E');
    const n = val('n');
    const Ms = val('Msalt');
    if (!(c1 > 0) || !(c2 > 0)) return setError('溶解度を正の値で入力してください。');
    if (c1 < c2) return setError('高温溶解度 c_1 は低温溶解度 c_2 より大きい必要があります（温度が下がると溶解度低下）。');
    if (!(mw0 > 0)) return setError('初期水量を正の値で入力してください。');
    if (!(ms0 > 0)) return setError('初期溶質量を正の値で入力してください。');
    if (!isFinite(E) || E < 0) return setError('蒸発水量を 0 以上で入力してください。');
    if (E >= mw0) return setError('蒸発水量が初期水量以上です。条件を見直してください。');
    if (!isFinite(n) || n < 0) return setError('水和数 n を 0 以上で入力してください。');
    if (n > 0 && !(Ms > 0)) return setError('水和物の場合、溶質モル質量 M_s を正の値で入力してください。');

    const initialSatRatio = ms0 / mw0;
    if (initialSatRatio > c1 + 1e-9) return setError(`初期溶液が高温溶解度 c_1（${fmtNum(c1)}）を超えており、未溶解結晶が存在します。仕込み量を見直してください。`);

    let mw_f, ms_ml, m_cryst_anhyd, m_cryst_hydrate, R = 0;
    if (n === 0) {
      mw_f = mw0 - E;
      ms_ml = c2 * mw_f;
      if (ms_ml > ms0) return setError('結晶化条件不成立：低温溶解度 × 残水量 が初期溶質量を上回っています（飽和未達）。蒸発量を増やすか溶解度差を再確認してください。');
      m_cryst_anhyd = ms0 - ms_ml;
      m_cryst_hydrate = m_cryst_anhyd;
    } else {
      R = (n * MW_WATER) / (Ms + n * MW_WATER);
      // Solve: ms0 = c2 * mw_ml + (1-R)*m_cryst,  mw0-E = mw_ml + R*m_cryst
      // From 2nd: mw_ml = mw0 - E - R*m_cryst
      // Substitute: ms0 = c2*(mw0 - E - R*m_cryst) + (1-R)*m_cryst
      // ms0 - c2*(mw0 - E) = -c2*R*m_cryst + (1-R)*m_cryst = m_cryst*((1-R) - c2*R)
      const denom = (1 - R) - c2 * R;
      if (Math.abs(denom) < 1e-12) return setError('物質収支が解けません（係数が0）。条件を見直してください。');
      m_cryst_hydrate = (ms0 - c2 * (mw0 - E)) / denom;
      if (m_cryst_hydrate <= 0) return setError('結晶化条件不成立：飽和未達または条件不適切。蒸発量・温度を再確認してください。');
      m_cryst_anhyd = (1 - R) * m_cryst_hydrate;
      mw_f = (mw0 - E) - R * m_cryst_hydrate;
      ms_ml = ms0 - m_cryst_anhyd;
      if (mw_f <= 0 || ms_ml <= 0) return setError('物質収支で母液量が非正になりました。条件を見直してください。');
    }
    const yieldRate = m_cryst_anhyd / ms0 * 100;
    const motherLiquor = mw_f + ms_ml;

    $('result-area').innerHTML = `
      <div class="result-target">結晶収率</div>
      <div class="result-value-big">${fmtNum(yieldRate)} <span class="unit">% （無水塩基準）</span></div>
      <table class="unit-table"><tbody>
        <tr><td>結晶量（${n > 0 ? '水和物として' : '無水'}）</td><td class="num">${fmtNum(m_cryst_hydrate)} kg</td></tr>
        <tr><td>結晶量（無水塩換算）</td><td class="num">${fmtNum(m_cryst_anhyd)} kg</td></tr>
        <tr><td>結晶収率（無水塩 / 仕込み溶質）</td><td class="num">${fmtNum(yieldRate)} %</td></tr>
        <tr><td>母液量</td><td class="num">${fmtNum(motherLiquor)} kg</td></tr>
        <tr><td>母液中の溶質量</td><td class="num">${fmtNum(ms_ml)} kg</td></tr>
        <tr><td>母液中の水量</td><td class="num">${fmtNum(mw_f)} kg</td></tr>
        <tr><td>母液の飽和濃度確認 m_s/m_w</td><td class="num">${fmtNum(ms_ml / mw_f)}（= c_2 = ${fmtNum(c2)}）</td></tr>
        ${n > 0 ? `<tr><td>水和率 R = nM_w / (M_s + nM_w)</td><td class="num">${fmtNum(R)}（${fmtNum(R * 100)} %）</td></tr>` : ''}
        <tr><td>仕込み溶液総量</td><td class="num">${fmtNum(ms0 + mw0)} kg</td></tr>
        <tr><td>蒸発水 E</td><td class="num">${fmtNum(E)} kg</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ 熱力学平衡（理論最大収率）。実プロセスでは過飽和保持・母液同伴・成長速度律速で実収率は下がります。</div>
        ${n > 0 ? '<div class="result-note">※ 水和物では母液から水も結晶側に取り込まれるため、無水塩より結晶量（質量）は大きくなります。</div>' : ''}
      </div>
    `;
  }

  function reset() {
    ['c1', 'c2', 'mw0', 'ms0', 'Msalt'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('E')) $('E').value = '0';
    if ($('n')) $('n').value = '0';
    toggleHydrateRow();
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('n').addEventListener('input', toggleHydrateRow);
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    toggleHydrateRow();
  });
})();
