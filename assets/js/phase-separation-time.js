(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const g = 9.80665;
  function fmtNum(v, sig = 4) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e6 || a < 1e-4) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  // 秒を読みやすい単位に
  function fmtTime(s) {
    if (!isFinite(s) || s <= 0) return '-';
    if (s < 90) return fmtNum(s, 3) + ' 秒';
    const min = s / 60;
    if (min < 90) return fmtNum(min, 3) + ' 分';
    const h = min / 60;
    if (h < 48) return fmtNum(h, 3) + ' 時間';
    return fmtNum(h / 24, 3) + ' 日';
  }

  // Stokesの式による液滴の終末沈降（浮上）速度
  function stokesVelocity(dRho, d, mu) { return dRho * g * d * d / (18 * mu); }

  function calc() {
    clearError();
    const disp = $('disp').value;                 // 'light' = 軽液滴が浮上 / 'heavy' = 重液滴が沈降
    const rhoH = val('rhoH'), rhoL = val('rhoL');
    const mu = val('mu') / 1000;                   // mPa·s -> Pa·s
    const d = val('d') * 1e-6;                     // µm -> m
    const H = val('H');                            // m

    if (!(rhoH > 0) || !(rhoL > 0)) return setError('密度を正の値で入力してください。');
    if (rhoH <= rhoL) return setError('重液密度 ρ_heavy は軽液密度 ρ_light より大きくしてください。密度差がないと相分離は進みません。');
    if (!(mu > 0)) return setError('連続相粘度 μ_c を正の値で入力してください。');
    if (!(d > 0)) return setError('液滴径 d を正の値で入力してください。');
    if (!(H > 0)) return setError('移動距離 H を正の値で入力してください。');

    const dRho = rhoH - rhoL;
    const rhoC = (disp === 'light') ? rhoH : rhoL; // 液滴が通り抜ける連続相の密度（Re 評価用）
    const ut = stokesVelocity(dRho, d, mu);
    const Re = rhoC * ut * d / mu;
    const t = H / ut;
    const moveWord = (disp === 'light') ? '浮上' : '沈降';

    // 液滴径による感度（同じ Δρ・μ_c・H）。入力した液滴径も必ず表に差し込んでハイライトする
    const thL = 'style="text-align:left;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)"';
    const thR = thL.replace('text-align:left', 'text-align:right');
    const dInputUm = val('d');
    const dList = [500, 300, 200, 100, 50, 20, 10];
    if (!dList.some(x => Math.abs(x - dInputUm) < 1e-6)) dList.push(dInputUm);
    dList.sort((a, b) => b - a);
    const rows = dList.map(dum => {
      const isInput = Math.abs(dum - dInputUm) < 1e-6;
      const dm = dum * 1e-6;
      const u = stokesVelocity(dRho, dm, mu);
      const ReI = rhoC * u * dm / mu;
      const tI = H / u;
      const flag = ReI > 1 ? ' <span class="small">※Stokes域外</span>' : '';
      const mark = isInput ? ' style="background:var(--brand-faint)"' : '';
      const label = isInput ? `<strong>${fmtNum(dum)} µm</strong>` : `${fmtNum(dum)} µm`;
      return `<tr${mark}><td>${label}</td><td class="num">${fmtNum(u * 1000)} mm/s</td><td class="num">${fmtTime(tI)}${flag}</td></tr>`;
    }).join('');

    const warns = [];
    if (Re > 1) warns.push(`液滴 Re = ${fmtNum(Re)} > 1：Stokesの式の適用範囲（Re ≲ 1）を超えています。実際の速度はこれより遅く、分離時間は長めになります（中間域・Newton 域の抵抗則で補正が必要）。`);
    warns.push('この値は液滴が界面まで移動する「沈降律速」の概算です。実際に澄むまでの時間は液滴どうしの合一にも依存し、界面活性物質・微粒子・エマルジョン化があると大幅に延びます。');
    warns.push('設計・トラブル検討では、分液ロートやメスシリンダーでの静置試験で分散層の消失時間・乳化層の有無を確認してください。');

    $('result-area').innerHTML = `
      <div class="result-target">相分離時間 t（液滴が H を${moveWord}しきる時間）</div>
      <div class="result-value-big">${fmtTime(t)}</div>
      <table class="unit-table"><tbody>
        <tr><td>液滴の${moveWord}速度 u_t</td><td class="num">${fmtNum(ut * 1000)} mm/s ／ ${fmtNum(ut * 3600)} m/h</td></tr>
        <tr><td>相分離時間 t = H/u_t</td><td class="num">${fmtTime(t)}（${fmtNum(t)} s）</td></tr>
        <tr><td>液滴 Reynolds 数 Re_p</td><td class="num">${fmtNum(Re)}${Re > 1 ? ' <span class="small">Stokes域外</span>' : ' <span class="small">Stokes域</span>'}</td></tr>
        <tr><td>密度差 Δρ</td><td class="num">${fmtNum(dRho)} kg/m³</td></tr>
      </tbody></table>
      <div class="result-detail-label">液滴径による分離時間の変化（同じ Δρ・μ_c・H）</div>
      <table class="unit-table"><thead><tr><th ${thL}>液滴径 d</th><th ${thR}>${moveWord}速度 u_t</th><th ${thR}>相分離時間 t</th></tr></thead><tbody>
        ${rows}
      </tbody></table>
      <div class="result-meta">${warns.map(w => `<div class="result-note">※ ${w}</div>`).join('')}</div>`;
  }

  function reset() {
    $('disp').value = 'light';
    ['rhoH', 'rhoL', 'mu', 'd', 'H'].forEach(function (id) { $(id).value = ''; });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
