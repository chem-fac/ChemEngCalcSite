(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const N_ROWS = 10;
  function fmtNum(v, sig = 5) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; const w = $('iso-chart-wrap'); if (w) w.style.display = 'none'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function buildRows() {
    const tb = $('iso-rows'); tb.innerHTML = '';
    for (let i = 0; i < N_ROWS; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td><input type="number" step="any" data-c="${i}"></td><td><input type="number" step="any" data-q="${i}"></td>`;
      tb.appendChild(tr);
    }
  }

  function linReg(xs, ys) {
    const n = xs.length;
    const xbar = xs.reduce((s, x) => s + x, 0) / n;
    const ybar = ys.reduce((s, y) => s + y, 0) / n;
    let Sxx = 0, Sxy = 0, Syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - xbar, dy = ys[i] - ybar; Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy; }
    const slope = Sxy / Sxx;
    const intercept = ybar - slope * xbar;
    const r2 = Syy === 0 ? 1 : (Sxy * Sxy) / (Sxx * Syy);
    return { slope, intercept, r2 };
  }

  // 1-2-5 系列の目盛り間隔
  function niceStep(range, n) {
    const raw = range / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) { if (raw <= m * mag) return m * mag; }
    return 10 * mag;
  }

  function drawChart(data, models) {
    const canvas = $('iso-canvas');
    const wrap = $('iso-chart-wrap');
    if (!canvas || !wrap) return;
    wrap.style.display = '';
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const area = { x0: 78, y0: 46, w: W - 108, h: H - 116 };

    const cMax = Math.max(...data.map(d => d.c)) * 1.06;
    let qTop = Math.max(...data.map(d => d.q));
    models.forEach(m => { if (m.valid) qTop = Math.max(qTop, m.f(cMax)); });
    const qMax = qTop * 1.08;
    const sx = c => area.x0 + area.w * (c / cMax);
    const sy = q => area.y0 + area.h * (1 - q / qMax);

    // 背景・グリッド・軸
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '12px "Noto Sans JP", sans-serif';
    const xStep = niceStep(cMax, 6), yStep = niceStep(qMax, 6);
    ctx.strokeStyle = '#dfe7e2';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#66736c';
    ctx.textAlign = 'center';
    for (let c = 0; c <= cMax; c += xStep) {
      const x = sx(c);
      ctx.beginPath(); ctx.moveTo(x, area.y0); ctx.lineTo(x, area.y0 + area.h); ctx.stroke();
      ctx.fillText(fmtNum(c, 3), x, area.y0 + area.h + 20);
    }
    ctx.textAlign = 'right';
    for (let q = 0; q <= qMax; q += yStep) {
      const y = sy(q);
      ctx.beginPath(); ctx.moveTo(area.x0, y); ctx.lineTo(area.x0 + area.w, y); ctx.stroke();
      ctx.fillText(fmtNum(q, 3), area.x0 - 8, y + 4);
    }
    ctx.strokeStyle = '#8ba197';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(area.x0, area.y0, area.w, area.h);
    ctx.fillStyle = '#2a2a2a';
    ctx.textAlign = 'center';
    ctx.fillText('平衡濃度 c', area.x0 + area.w / 2, area.y0 + area.h + 44);
    ctx.save();
    ctx.translate(20, area.y0 + area.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('吸着量 q', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // フィット曲線（有効なモデルのみ）
    models.forEach(m => {
      if (!m.valid) return;
      ctx.save();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.best ? 3.2 : 2.2;
      ctx.beginPath();
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const c = cMax * i / N;
        const x = sx(c), y = sy(Math.min(m.f(c), qMax));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // データ点（白抜き丸）
    data.forEach(d => {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2f3633';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(sx(d.c), sy(d.q), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 凡例（描画した系列のみ）
    ctx.save();
    ctx.font = '13px "Noto Sans JP", sans-serif';
    ctx.textBaseline = 'middle';
    let lx = area.x0;
    const ly = 22;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#2f3633';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(lx + 8, ly, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f3633';
    ctx.fillText('データ点', lx + 22, ly);
    lx += 22 + ctx.measureText('データ点').width + 30;
    models.forEach(m => {
      if (!m.valid) return;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.best ? 3.2 : 2.2;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 28, ly); ctx.stroke();
      ctx.fillStyle = '#2f3633';
      const label = m.name + (m.best ? '（最良）' : '');
      ctx.fillText(label, lx + 36, ly);
      lx += 36 + ctx.measureText(label).width + 30;
    });
    ctx.restore();
  }

  function calc() {
    clearError();
    const data = [];
    for (let i = 0; i < N_ROWS; i++) {
      const c = parseFloat(document.querySelector(`[data-c="${i}"]`).value);
      const q = parseFloat(document.querySelector(`[data-q="${i}"]`).value);
      if (isFinite(c) && c > 0 && isFinite(q) && q > 0) data.push({ c, q });
    }
    if (data.length < 3) return setError('最低 3 点のデータを入力してください（c > 0, q > 0）。');
    data.sort((a, b) => a.c - b.c);

    const cs = data.map(d => d.c);
    const qs = data.map(d => d.q);
    // 平衡濃度 c が一定だと Sxx=0 で回帰不能（slope/intercept が NaN 化）になるためガード
    const cMin = Math.min(...cs), cMax = Math.max(...cs);
    if (cMax - cMin <= Math.abs(cMax) * 1e-12) {
      return setError('平衡濃度 c に十分なばらつきが必要です（c が一定だとフィットできません）。');
    }
    // Langmuir: c/q = 1/(qmax·b) + c/qmax
    const cqs = cs.map((c, i) => c / qs[i]);
    const lang = linReg(cs, cqs);
    const qmax = 1 / lang.slope;
    const b = 1 / (lang.intercept * qmax);
    // Freundlich: log q = log K + (1/n) log c
    const logc = cs.map(Math.log10);
    const logq = qs.map(Math.log10);
    const freund = linReg(logc, logq);
    const Kf = Math.pow(10, freund.intercept);
    const inv_n = freund.slope;

    // SSE calc on actual q values for both models
    let SSE_L = 0, SSE_F = 0, SST = 0;
    const qbar = qs.reduce((s, q) => s + q, 0) / qs.length;
    for (let i = 0; i < cs.length; i++) {
      const qL = qmax * b * cs[i] / (1 + b * cs[i]);
      const qF = Kf * Math.pow(cs[i], inv_n);
      SSE_L += Math.pow(qs[i] - qL, 2);
      SSE_F += Math.pow(qs[i] - qF, 2);
      SST += Math.pow(qs[i] - qbar, 2);
    }
    const R2_L_q = SST > 0 ? 1 - SSE_L / SST : 1;
    const R2_F_q = SST > 0 ? 1 - SSE_F / SST : 1;

    const langValid = (qmax > 0 && b > 0);
    const freundValid = (Kf > 0 && inv_n > 0);

    // 物理的に成立しないモデルは最良候補から除外（妥当チェック→選択 の順）
    let best, bestLabel;
    if (langValid && freundValid) {
      if (R2_L_q >= R2_F_q) { best = 'L'; bestLabel = 'Langmuir'; }
      else { best = 'F'; bestLabel = 'Freundlich'; }
    } else if (langValid) {
      best = 'L'; bestLabel = 'Langmuir（Freundlich は物理的に不適）';
    } else if (freundValid) {
      best = 'F'; bestLabel = 'Freundlich（Langmuir は物理的に不適）';
    } else {
      best = null; bestLabel = '物理的に妥当なモデルなし';
    }

    let rowsTbl = '';
    rowsTbl += `<tr${best === 'L' ? ' class="best"' : ''}><td>Langmuir</td><td class="num">${fmtNum(R2_L_q)}</td><td class="num">${fmtNum(lang.r2)}</td><td class="num">q_max = ${langValid ? fmtNum(qmax) : 'N/A'}, b = ${langValid ? fmtNum(b) : 'N/A'}</td></tr>`;
    rowsTbl += `<tr${best === 'F' ? ' class="best"' : ''}><td>Freundlich</td><td class="num">${fmtNum(R2_F_q)}</td><td class="num">${fmtNum(freund.r2)}</td><td class="num">K_F = ${freundValid ? fmtNum(Kf) : 'N/A'}, 1/n = ${fmtNum(inv_n)}</td></tr>`;

    let warns = [];
    if (!langValid) warns.push('Langmuir パラメータが物理的に成立しません（q_max < 0 または b < 0）。データ確認、または Freundlich での評価を推奨。');
    if (!freundValid) warns.push('Freundlich パラメータが物理的に成立しません。');
    if (inv_n > 1) warns.push(`Freundlich 1/n = ${fmtNum(inv_n)} > 1：好ましくない吸着（凸型）の可能性。Langmuir 適用域外。`);

    const bestR2 = best === 'L' ? R2_L_q : (best === 'F' ? R2_F_q : NaN);
    $('result-area').innerHTML = `
      <div class="result-target">最良フィット：${bestLabel}</div>
      <div class="result-value-big">${bestLabel}${best ? `（R²_q = ${fmtNum(bestR2)}）` : ''}</div>
      <table class="iso-table">
        <thead><tr><th>モデル</th><th class="num">R²（q 残差）</th><th class="num">R²（線形プロット）</th><th>パラメータ</th></tr></thead>
        <tbody>${rowsTbl}</tbody>
      </table>
      <p class="result-note" style="margin-top:6px;">緑色行が q 残差ベースの R² が大きいモデルです。</p>
      <table class="unit-table" style="margin-top:10px;"><tbody>
        <tr><td>データ点数</td><td class="num">${data.length}</td></tr>
        <tr><td>c 範囲</td><td class="num">${fmtNum(cs[0])} 〜 ${fmtNum(cs[cs.length - 1])}</td></tr>
        <tr><td>q 範囲</td><td class="num">${fmtNum(Math.min(...qs))} 〜 ${fmtNum(Math.max(...qs))}</td></tr>
      </tbody></table>
      <div class="result-meta">
        ${warns.map(w => `<div class="result-note">※ ${w}</div>`).join('')}
        <div class="result-note">※ 線形プロットの R² と q 残差の R² は別物。物理的に妥当なモデル選びには q 残差の R² を見るのが基本。</div>
      </div>
    `;

    drawChart(data, [
      { name: 'Langmuir', color: '#007a4d', valid: langValid, best: best === 'L', f: (c) => qmax * b * c / (1 + b * c) },
      { name: 'Freundlich', color: '#ff7a00', valid: freundValid, best: best === 'F', f: (c) => Kf * Math.pow(c, inv_n) },
    ]);
  }

  function reset() {
    document.querySelectorAll('#iso-rows input').forEach(el => el.value = '');
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">データを入力して「フィットする」を押してください</div>';
    const w = $('iso-chart-wrap');
    if (w) w.style.display = 'none';
  }

  function example() {
    // Langmuir-like sample
    const data = [[5, 12.5], [10, 21.4], [25, 41.7], [50, 62.5], [100, 83.3], [200, 100.0], [400, 111.1], [600, 116.0]];
    data.forEach((p, i) => {
      document.querySelector(`[data-c="${i}"]`).value = p[0];
      document.querySelector(`[data-q="${i}"]`).value = p[1];
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildRows();
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    $('example-btn').addEventListener('click', example);
  });
})();
