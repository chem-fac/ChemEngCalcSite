(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // 単位換算（SI へ）
  const TO_SI = {
    d:   { mm: 1e-3, cm: 1e-2, m: 1 },
    U:   { ms: 1, cms: 1e-2, mmin: 1 / 60 },
    Q:   { m3s: 1, m3h: 1 / 3600, Lmin: 1e-3 / 60, Ls: 1e-3 },
    r:   { mm: 1e-3, cm: 1e-2, ratio: null }, // ratio は R を掛けて使う
    mu:  { mPas: 1e-3, cP: 1e-3, Pas: 1 },
    L:   { m: 1, cm: 1e-2, mm: 1e-3 },
    rho: { kgm3: 1, gcm3: 1000 },
  };

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function unit(id) { const el = $(id + '_unit'); return el ? el.value : null; }
  function getSI(id) {
    const v = val(id);
    if (!isFinite(v)) return NaN;
    const u = unit(id);
    const f = (TO_SI[id] && u != null) ? TO_SI[id][u] : 1;
    return v * (f == null ? 1 : f);
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = (m) => {
    const e = $('error'); e.textContent = m; e.style.display = 'block';
    const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  // 流速を読みやすい単位の大見出しに
  function bigVal(v) {
    if (v >= 1) return fmtNum(v) + ' <span class="unit">m/s</span>';
    if (v >= 0.01) return fmtNum(v * 100) + ' <span class="unit">cm/s</span>';
    return fmtNum(v * 1000) + ' <span class="unit">mm/s</span>';
  }

  // 速度分布 u(r) = u_max (1 - (r/R)^2)
  function uAt(uMax, R, r) { const x = r / R; return uMax * (1 - x * x); }

  function calc() {
    clearError();
    const d = getSI('d');
    if (!positive(d)) return setError('管内径 d を正の数値で入力してください。');
    const R = d / 2;
    const A = Math.PI * R * R;

    const basis = $('basis').value; // 'U' or 'Q'
    let U, Q;
    if (basis === 'U') {
      U = getSI('U');
      if (!positive(U)) return setError('基準量に「平均流速 U」を選んだので、U を正の数値で入力してください。');
      Q = U * A;
    } else {
      Q = getSI('Q');
      if (!positive(Q)) return setError('基準量に「体積流量 Q」を選んだので、Q を正の数値で入力してください。');
      U = Q / A;
    }
    const uMax = 2 * U; // 円管中央の最大流速

    // 任意：半径位置 r での流速
    let rEval = NaN, uEval = NaN, rOut = false;
    const rRaw = val('r');
    if (isFinite(rRaw)) {
      const ru = unit('r');
      rEval = (ru === 'ratio') ? rRaw * R : rRaw * (TO_SI.r[ru] || 1);
      if (rEval < 0) return setError('半径位置 r は 0 以上で入力してください（r = 0 が管中心、r = R が管壁）。');
      rOut = rEval > R + 1e-12;
      uEval = rOut ? NaN : uAt(uMax, R, rEval);
    }

    // 任意：粘度・管長から圧力損失など
    const mu = getSI('mu');
    const L = getSI('L');
    const rho = getSI('rho');
    let dP = NaN, dpdx = NaN, tauW = NaN, Re = NaN;
    if (positive(mu) && positive(L)) {
      dP = 8 * mu * L * Q / (Math.PI * Math.pow(R, 4)); // ΔP = 8μLQ/(πR^4)
      dpdx = dP / L;                                    // 圧力勾配 -dp/dx の大きさ
      tauW = dpdx * R / 2;                              // 壁面せん断応力 τ_w = (R/2)(-dp/dx)
    } else if (positive(mu) && !positive(L)) {
      tauW = 4 * mu * U / R; // L が無くても τ_w = 4μU/R は出せる
      dpdx = 8 * mu * U / (R * R);
    }
    if (positive(rho) && positive(mu)) {
      Re = rho * U * d / mu;
    }

    drawProfile({ uMax, U, R, rEval: rOut ? NaN : rEval, uEval });

    // 速度分布の早見表（r/R 刻み）
    const ratios = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 0.9, 1.0];
    const profRows = ratios.map(x => {
      const u = uMax * (1 - x * x);
      const frac = (u / uMax) * 100;
      return `<tr><td>${x.toFixed(2)}</td><td class="num">${fmtNum(R * x * 1000)} mm</td><td class="num">${fmtNum(u)} m/s</td><td class="num">${fmtNum(frac, 3)} %</td></tr>`;
    }).join('');

    // 任意項目の行
    let extraRows = '';
    if (isFinite(uEval)) {
      extraRows += `<tr><td>r = ${fmtNum(rEval * 1000)} mm での流速 u(r)</td><td class="num">${fmtNum(uEval)} m/s ／ ${fmtNum((uEval / uMax) * 100, 3)} %（最大比）</td></tr>`;
    } else if (rOut) {
      extraRows += `<tr><td>r = ${fmtNum(rEval * 1000)} mm での流速 u(r)</td><td class="num">管壁の外側（r &gt; R）です</td></tr>`;
    }
    if (isFinite(dP)) {
      extraRows += `<tr><td>圧力損失 ΔP（管長 L）</td><td class="num">${fmtNum(dP)} Pa ／ ${fmtNum(dP / 1000)} kPa</td></tr>`;
    }
    if (isFinite(dpdx)) {
      extraRows += `<tr><td>圧力勾配 −dp/dx</td><td class="num">${fmtNum(dpdx)} Pa/m</td></tr>`;
    }
    if (isFinite(tauW)) {
      extraRows += `<tr><td>壁面せん断応力 τ_w</td><td class="num">${fmtNum(tauW)} Pa</td></tr>`;
    }
    let reRow = '';
    if (isFinite(Re)) {
      const lam = Re < 2300;
      reRow = `<tr><td>レイノルズ数 Re</td><td class="num">${fmtNum(Re)} <span class="small">${lam ? '層流（Re &lt; 2300）' : '乱流域の可能性'}</span></td></tr>`;
    }

    const turbWarn = (isFinite(Re) && Re >= 2300)
      ? '<div class="result-note" style="color:#b00">※ Re ≥ 2300 です。放物線状の速度分布（ハーゲン・ポアズイユ流れ）は層流でのみ成り立ちます。乱流では断面の速度分布は平坦化し、本ツールの分布は当てはまりません。</div>'
      : '';

    $('result-area').innerHTML = `
      <div class="result-target">最大流速 u<sub>max</sub>（管中心 r = 0）</div>
      <div class="result-value-big">${bigVal(uMax)}</div>
      <table class="unit-table"><tbody>
        <tr><td>最大流速 u_max（中心）</td><td class="num">${fmtNum(uMax)} m/s ＝ 2U</td></tr>
        <tr><td>断面平均流速 U</td><td class="num">${fmtNum(U)} m/s</td></tr>
        <tr><td>体積流量 Q</td><td class="num">${fmtNum(Q)} m³/s ／ ${fmtNum(Q * 3600)} m³/h ／ ${fmtNum(Q * 60000)} L/min</td></tr>
        <tr><td>管半径 R ／ 管内径 d</td><td class="num">${fmtNum(R * 1000)} mm ／ ${fmtNum(d * 1000)} mm</td></tr>
        <tr><td>管断面積 A</td><td class="num">${fmtNum(A)} m² ／ ${fmtNum(A * 1e4)} cm²</td></tr>
        ${extraRows}
        ${reRow}
      </tbody></table>
      <div class="result-detail-label">速度分布 u(r) = u_max (1 − (r/R)²)</div>
      <table class="unit-table"><thead><tr>
        <th style="text-align:left;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)">r/R</th>
        <th style="text-align:right;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)">r</th>
        <th style="text-align:right;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)">u(r)</th>
        <th style="text-align:right;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)">u/u_max</th>
      </tr></thead><tbody>
        ${profRows}
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ 速度分布は放物線。中心が最大 u_max = 2U、管壁（r = R）で 0（粘着条件）です。</div>
        ${turbWarn}
      </div>
    `;
  }

  // 流速の表示単位を桁に応じて選ぶ
  function velUnit(u) {
    if (u >= 1) return { f: 1, u: 'm/s' };
    if (u >= 0.01) return { f: 100, u: 'cm/s' };
    return { f: 1000, u: 'mm/s' };
  }
  // 目盛・ラベル用の短い数値整形
  function axisNum(v) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return Number(v.toPrecision(3)).toString();
    return Number(v.toPrecision(2)).toString();
  }

  // ===== 速度分布グラフ（円管断面の放物線プロファイル・実スケール）=====
  function drawProfile(s) {
    const canvas = $('hp-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // 描画領域（左に半径目盛、下に流速目盛の余白）
    const area = { x0: 84, y0: 38, w: W - 168, h: H - 104 };
    const cx = area.x0;                       // u = 0 の縦軸（管中心線の起点）
    const yTop = area.y0;                      // r = +R
    const yBot = area.y0 + area.h;             // r = -R
    const yMid = (yTop + yBot) / 2;            // r = 0（中心）

    // ★ 実数スケール：流速は uMax を、半径は R を基準に実値で表示
    const vu = velUnit(s.uMax);                // 流速の表示単位（m/s・cm/s・mm/s）
    const Rmm = s.R * 1000;                     // 管半径［mm］
    const uMaxDraw = s.uMax * 1.15;            // 右側に少し余白
    const sx = (u) => cx + (area.w) * (u / uMaxDraw);
    const sr = (r) => yMid - (r / s.R) * (area.h / 2); // r=+R 上、r=-R 下

    // 流速軸の目盛＋薄いグリッド（実値）
    ctx.textAlign = 'center';
    ctx.font = '11px "Noto Sans JP", sans-serif';
    const nT = 4;
    for (let i = 0; i <= nT; i++) {
      const u = s.uMax * i / nT;
      const x = sx(u);
      ctx.strokeStyle = '#eef1f3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke();
      ctx.strokeStyle = '#cfd4d8';
      ctx.beginPath(); ctx.moveTo(x, yBot); ctx.lineTo(x, yBot + 5); ctx.stroke();
      ctx.fillStyle = '#777';
      ctx.fillText(axisNum(u * vu.f), x, yBot + 28);
    }

    // 半径軸の目盛（左側・実値 mm）
    ctx.textAlign = 'right';
    ctx.font = '11px "Noto Sans JP", sans-serif';
    [1, 0.5, 0, -0.5, -1].forEach((t) => {
      const y = sr(t * s.R);
      ctx.strokeStyle = '#cfd4d8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 6, y); ctx.lineTo(cx, y); ctx.stroke();
      ctx.fillStyle = '#777';
      ctx.fillText(axisNum(t * Rmm), cx - 10, y + 4);
    });

    // 管壁（上下の太い線）
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8, yTop); ctx.lineTo(cx + area.w + 36, yTop);
    ctx.moveTo(cx - 8, yBot); ctx.lineTo(cx + area.w + 36, yBot);
    ctx.stroke();
    ctx.fillStyle = '#3a3a3a';
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('管壁 r = R', cx + area.w - 48, yTop - 8);
    ctx.fillText('管壁 r = −R', cx + area.w - 56, yBot + 16);

    // 中心線（軸 u = 0）
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(cx, yTop); ctx.lineTo(cx, yBot); ctx.stroke();
    ctx.setLineDash([]);

    // 速度ベクトル（矢印）— 等間隔の r で
    ctx.strokeStyle = '#7fb8e6';
    ctx.fillStyle = '#7fb8e6';
    ctx.lineWidth = 1.6;
    const N = 11;
    for (let i = 0; i <= N; i++) {
      const r = -s.R + (2 * s.R) * i / N;
      const u = uAt(s.uMax, s.R, r);
      const x = sx(u), y = sr(r);
      if (Math.abs(x - cx) < 2) continue;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(x, y); ctx.stroke();
      // 矢じり
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - 7, y - 3.2); ctx.lineTo(x - 7, y + 3.2);
      ctx.closePath(); ctx.fill();
    }

    // 放物線プロファイル
    ctx.strokeStyle = '#006938';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const r = -s.R + (2 * s.R) * i / 120;
      const u = uAt(s.uMax, s.R, r);
      const x = sx(u), y = sr(r);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 平均流速 U の縦線（実値ラベル）
    ctx.strokeStyle = '#ff7a00';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(sx(s.U), yTop); ctx.lineTo(sx(s.U), yBot); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff7a00';
    ctx.textAlign = 'center';
    ctx.font = '11px "Noto Sans JP", sans-serif';
    ctx.fillText('U = ' + axisNum(s.U * vu.f) + ' ' + vu.u, sx(s.U), yTop - 8);

    // 最大流速 u_max のマーカー＋ラベル（実値）
    ctx.fillStyle = '#006938';
    ctx.beginPath(); ctx.arc(sx(s.uMax), yMid, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = '11px "Noto Sans JP", sans-serif';
    ctx.fillText('u_max = ' + axisNum(s.uMax * vu.f) + ' ' + vu.u, sx(s.uMax) + 8, yMid - 8);

    // 指定 r 位置のマーカー（実値ラベル）
    if (isFinite(s.rEval) && isFinite(s.uEval)) {
      const x = sx(s.uEval), y = sr(s.rEval);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c0392b';
      ctx.font = '11px "Noto Sans JP", sans-serif';
      const lbl = 'u(' + axisNum(s.rEval * 1000) + 'mm) = ' + axisNum(s.uEval * vu.f) + ' ' + vu.u;
      const right = x > cx + area.w * 0.62;
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(lbl, x + (right ? -9 : 9), y + 4);
    }

    // 軸タイトル
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.fillText('流速 u [' + vu.u + ']  →', cx + area.w / 2, H - 8);
    ctx.save();
    ctx.translate(20, yMid);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('半径位置 r [mm]', 0, 0);
    ctx.restore();
  }

  function drawBlank() {
    const canvas = $('hp-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '15px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('計算すると速度分布グラフを表示します', canvas.width / 2, canvas.height / 2);
  }

  function syncBasis() {
    const basis = $('basis').value;
    $('row-U').style.display = basis === 'U' ? '' : 'none';
    $('row-Q').style.display = basis === 'Q' ? '' : 'none';
  }

  function reset() {
    ['d', 'U', 'Q', 'r', 'mu', 'L', 'rho'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
    drawBlank();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    $('basis').addEventListener('change', syncBasis);
    syncBasis();
    drawBlank();
  });
})();
