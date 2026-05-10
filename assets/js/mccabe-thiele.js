(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');

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

  function val(id) {
    const el = $(id);
    if (!el || el.value === '') return NaN;
    return parseFloat(el.value);
  }

  function fraction(v) {
    return isFinite(v) && v >= 0 && v <= 1;
  }

  function eqY(x, alpha) {
    return alpha * x / (1 + (alpha - 1) * x);
  }

  function invEqX(y, alpha) {
    const denom = alpha - y * (alpha - 1);
    return denom === 0 ? NaN : y / denom;
  }

  function rectY(x, R, xD) {
    return R / (R + 1) * x + xD / (R + 1);
  }

  function qLineY(x, q, zF) {
    if (Math.abs(q - 1) < 1e-9) return NaN;
    return q / (q - 1) * x - zF / (q - 1);
  }

  function stripY(x, line) {
    return line.m * x + line.b;
  }

  function setError(m) {
    const e = $('error');
    e.textContent = m;
    e.style.display = 'block';
  }

  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }

  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
    drawBlankChart();
  }

  function bisect(fn, low, high) {
    let fLow = fn(low);
    let mid = NaN;
    for (let i = 0; i < 100; i++) {
      mid = (low + high) / 2;
      const fMid = fn(mid);
      if (!isFinite(fMid)) return NaN;
      if (Math.abs(fMid) < 1e-10 || Math.abs(high - low) < 1e-8) return mid;
      if (fLow * fMid <= 0) {
        high = mid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }
    return mid;
  }

  function rootsByScan(fn) {
    const roots = [];
    const n = 800;
    let x0 = 0;
    let f0 = fn(x0);
    for (let i = 1; i <= n; i++) {
      const x1 = i / n;
      const f1 = fn(x1);
      if (isFinite(f0) && isFinite(f1)) {
        if (Math.abs(f1) < 1e-8) roots.push(x1);
        if (f0 * f1 < 0) roots.push(bisect(fn, x0, x1));
      }
      x0 = x1;
      f0 = f1;
    }
    return roots.filter(isFinite);
  }

  function pinchPoint(alpha, q, zF) {
    if (Math.abs(q - 1) < 1e-9) {
      return { x: zF, y: eqY(zF, alpha) };
    }
    const fn = x => eqY(x, alpha) - qLineY(x, q, zF);
    const roots = rootsByScan(fn);
    if (!roots.length) return null;
    const x = roots.sort((a, b) => Math.abs(a - zF) - Math.abs(b - zF))[0];
    return { x, y: eqY(x, alpha) };
  }

  function feedIntersection(R, xD, q, zF) {
    const mR = R / (R + 1);
    const bR = xD / (R + 1);
    if (Math.abs(q - 1) < 1e-9) {
      return { x: zF, y: mR * zF + bR };
    }
    const mq = q / (q - 1);
    const bq = -zF / (q - 1);
    const denom = mR - mq;
    if (Math.abs(denom) < 1e-12) return null;
    const x = (bq - bR) / denom;
    return { x, y: mR * x + bR };
  }

  function calculateRmin(alpha, q, zF, xD) {
    const pinch = pinchPoint(alpha, q, zF);
    if (!pinch || Math.abs(pinch.x - xD) < 1e-9) return { Rmin: NaN, pinch };
    const m = (pinch.y - xD) / (pinch.x - xD);
    const Rmin = m > 0 && m < 1 ? m / (1 - m) : NaN;
    return { Rmin, pinch };
  }

  function buildStages(params) {
    const { alpha, xD, xB, xFeed, R, strip } = params;
    const points = [{ x: xD, y: xD }];
    let x = xD;
    let y = xD;
    let fullSteps = 0;
    let theoreticalStages = 0;
    let feedStage = null;
    let ok = false;
    let reason = '';
    const stageRows = [];

    for (let i = 0; i < 200; i++) {
      const xStart = x;
      const xEq = invEqX(y, alpha);
      if (!isFinite(xEq) || xEq < -0.02 || xEq > 1.02) {
        reason = '平衡線との交点が組成範囲外になりました。';
        break;
      }
      points.push({ x: xEq, y });
      fullSteps += 1;
      let fraction = 1;
      let isPartial = false;
      if (xEq <= xB && Math.abs(xStart - xEq) > 1e-12) {
        fraction = (xStart - xB) / (xStart - xEq);
        if (fraction > 0 && fraction < 1) isPartial = true;
        else fraction = 1;
      }
      theoreticalStages = (fullSteps - 1) + fraction;
      if (feedStage === null && xEq <= xFeed) feedStage = fullSteps;

      const useStrip = xEq <= xFeed;
      const yNext = useStrip ? stripY(xEq, strip) : rectY(xEq, R, xD);
      let section = useStrip ? '回収部' : '濃縮部';
      if (feedStage === fullSteps) section = 'フィード段';
      if (xEq <= xB) section = isPartial ? 'リボイラー（部分段）' : 'リボイラー';
      stageRows.push({
        no: fullSteps,
        section,
        fraction,
        x: xEq,
        y,
        yNext,
      });

      if (xEq <= xB) {
        ok = true;
        x = xEq;
        break;
      }
      if (!isFinite(yNext) || yNext < -0.05 || yNext > 1.05) {
        reason = '操作線が組成範囲外になりました。';
        break;
      }
      points.push({ x: xEq, y: yNext });
      x = xEq;
      y = yNext;
    }

    if (!ok && !reason) reason = '200段以内に缶出組成へ到達しませんでした。';
    return {
      points,
      fullSteps,
      totalSteps: theoreticalStages + 1,
      theoreticalStages,
      actualStages: Math.ceil(theoreticalStages),
      feedStage,
      stageRows,
      ok,
      reason,
      lastX: x,
    };
  }

  function renderRows(rows) {
    return rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('');
  }

  function renderStageRows(rows) {
    return rows.map(r => `
      <tr>
        <td>${r.no}</td>
        <td>${r.section}</td>
        <td class="num">${fmtNum(r.x)}</td>
        <td class="num">${fmtNum(r.y)}</td>
        <td class="num">${isFinite(r.yNext) ? fmtNum(r.yNext) : '-'}</td>
        <td class="num">${r.fraction < 0.999 ? fmtNum(r.fraction, 3) : '1'}</td>
      </tr>
    `).join('');
  }

  function drawBase(ctx, area) {
    const { x0, y0, w, h } = area;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = '#dfe7e2';
    ctx.lineWidth = 1;
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#66736c';
    for (let i = 0; i <= 10; i++) {
      const p = i / 10;
      const x = x0 + w * p;
      const y = y0 + h * (1 - p);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + h);
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.stroke();
      ctx.fillText(p.toFixed(1), x - 9, y0 + h + 20);
      ctx.fillText(p.toFixed(1), x0 - 36, y + 4);
    }
    ctx.strokeStyle = '#8ba197';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, w, h);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillText('x（液相中の低沸点成分モル分率）', x0 + w / 2 - 118, y0 + h + 42);
    ctx.save();
    ctx.translate(18, y0 + h / 2 + 112);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('y（気相中の低沸点成分モル分率）', 0, 0);
    ctx.restore();
  }

  function drawLegend(ctx) {
    const items = [
      ['平衡曲線', '#007a4d', []],
      ['対角線 (y=x)', '#c7c7c7', [6, 6]],
      ['濃縮部操作線', '#ff3b4f', []],
      ['回収部操作線', '#ff7a00', []],
      ['q線', '#7355d6', [8, 5]],
      ['階段作図', '#0087ff', []],
    ];
    ctx.save();
    ctx.font = '13px "Noto Sans JP", sans-serif';
    ctx.textBaseline = 'middle';
    let x = 118;
    const y = 20;
    items.forEach(([label, color, dash]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 28, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + 14, y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.fillStyle = '#2f3633';
      ctx.fillText(label, x + 36, y);
      x += ctx.measureText(label).width + 76;
    });
    ctx.restore();
  }

  function drawChart(data) {
    const canvas = $('mt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const area = { x0: 58, y0: 48, w: canvas.width - 88, h: canvas.height - 112 };
    const sx = x => area.x0 + area.w * x;
    const sy = y => area.y0 + area.h * (1 - y);
    drawBase(ctx, area);
    drawLegend(ctx);

    function polyline(points, color, width, dash) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = sx(p.x);
        const py = sy(p.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    function marker(x, y, color, r = 5) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const diag = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    polyline(diag, '#c7c7c7', 1.5, [6, 6]);

    const eq = [];
    for (let i = 0; i <= 240; i++) {
      const x = i / 240;
      eq.push({ x, y: eqY(x, data.alpha) });
    }
    polyline(eq, '#007a4d', 3);

    const rect = [];
    const xR0 = Math.max(0, Math.min(data.xFeed, data.xD));
    for (let i = 0; i <= 80; i++) {
      const x = xR0 + (data.xD - xR0) * i / 80;
      rect.push({ x, y: rectY(x, data.R, data.xD) });
    }
    polyline(rect, '#ff3b4f', 2.4);

    const strip = [];
    const xS1 = Math.max(data.xB, data.xFeed);
    for (let i = 0; i <= 80; i++) {
      const x = data.xB + (xS1 - data.xB) * i / 80;
      strip.push({ x, y: stripY(x, data.strip) });
    }
    polyline(strip, '#ff7a00', 2.4);

    const qpts = [];
    if (Math.abs(data.q - 1) < 1e-9) {
      qpts.push({ x: data.zF, y: 0 }, { x: data.zF, y: 1 });
    } else {
      for (let i = 0; i <= 120; i++) {
        const x = i / 120;
        const y = qLineY(x, data.q, data.zF);
        if (y >= 0 && y <= 1) qpts.push({ x, y });
      }
    }
    if (qpts.length >= 2) polyline(qpts, '#7355d6', 2, [8, 5]);

    if (data.stagePoints && data.stagePoints.length > 1) {
      polyline(data.stagePoints, '#0087ff', 2.5);
    }

    marker(data.xD, data.xD, '#ff3b4f', 5.5);
    marker(data.feed.x, data.feed.y, '#ff3b4f', 5.5);
    marker(data.feed.x, data.feed.y, '#ff7a00', 3.4);
    marker(data.xB, data.xB, '#ff7a00', 5.5);
    marker(data.zF, data.zF, '#7355d6', 5.5);
  }

  function drawBlankChart() {
    const canvas = $('mt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const area = { x0: 58, y0: 48, w: canvas.width - 88, h: canvas.height - 112 };
    drawBase(ctx, area);
    drawLegend(ctx);
    ctx.fillStyle = '#9aa39e';
    ctx.font = '14px "Noto Sans JP", sans-serif';
    ctx.fillText('計算するとマッケーブ・シール図を表示します', area.x0 + area.w / 2 - 150, area.y0 + area.h / 2);
  }

  function calculate() {
    clearError();
    const alpha = val('alpha');
    const zF = val('zF');
    const xD = val('xD');
    const xB = val('xB');
    const R = val('R');
    const q = val('q');
    const eff = val('eff');

    if (!isFinite(alpha) || alpha <= 1) return setError('相対揮発度 α は 1 より大きい値で入力してください。');
    if (![zF, xD, xB].every(fraction)) return setError('zF, xD, xB は 0〜1 の範囲で入力してください。');
    if (!(xB < zF && zF < xD)) return setError('組成は xB < zF < xD となるように入力してください。');
    if (!isFinite(R) || R <= 0) return setError('還流比 R は正の数値で入力してください。');
    if (!isFinite(q)) return setError('供給状態 q を入力してください。');
    if (isFinite(eff) && (eff <= 0 || eff > 100)) return setError('総合段効率は 0〜100 % の範囲で入力してください。');

    const feed = feedIntersection(R, xD, q, zF);
    if (!feed || !isFinite(feed.x) || !isFinite(feed.y)) return setError('濃縮部操作線と q線の交点を計算できません。q と R を確認してください。');
    if (feed.x <= xB || feed.x >= xD || feed.y < 0 || feed.y > 1) {
      return setError('操作線の交点が分離範囲外です。還流比 R、供給状態 q、組成条件を見直してください。');
    }

    const strip = {
      m: (feed.y - xB) / (feed.x - xB),
      b: xB - ((feed.y - xB) / (feed.x - xB)) * xB,
    };
    const rminData = calculateRmin(alpha, q, zF, xD);
    const stages = buildStages({ alpha, xD, xB, xFeed: feed.x, R, strip });
    const actualStages = stages.ok ? stages.actualStages : null;
    const efficiencyStages = isFinite(eff) && stages.ok ? Math.ceil(stages.theoreticalStages / (eff / 100)) : null;
    const warn = [];
    if (isFinite(rminData.Rmin) && R <= rminData.Rmin) warn.push('入力還流比が最小還流比以下です。有限段数にならない、または段数が非常に大きくなる可能性があります。');
    if (!stages.ok) warn.push(stages.reason);

    $('result-area').innerHTML = `
      <div class="result-target">理論段数 <span class="sym">N</span></div>
      <div class="result-value-big">${fmtNum(stages.theoreticalStages, 3)} <span class="unit">段</span></div>
      <table class="unit-table"><tbody>
        ${renderRows([
          ['総ステップ数（部分段込み）', fmtNum(stages.totalSteps, 3)],
          ['実際の段数（部分段切り上げ）', actualStages ? `${actualStages} 段` : '-'],
          ['フィード段', stages.feedStage ? `第${stages.feedStage}段付近` : '-'],
          ['最小還流比 R<sub>min</sub>', fmtNum(rminData.Rmin)],
          ['R/R<sub>min</sub>', isFinite(rminData.Rmin) ? fmtNum(R / rminData.Rmin) : '-'],
          ['濃縮部/q線交点 x', fmtNum(feed.x)],
          ['濃縮部/q線交点 y', fmtNum(feed.y)],
          ['回収部操作線', `y = ${fmtNum(strip.m)} x ${strip.b >= 0 ? '+' : '-'} ${fmtNum(Math.abs(strip.b))}`],
          ['総合段効率換算', efficiencyStages ? `${efficiencyStages} 段` : '未入力'],
        ])}
      </tbody></table>
      <div class="result-note">段数計算: 理論段数 = 総ステップ数 - 1（リボイラーを1段とカウント）。全凝縮コンデンサーは段数に含めません。部分段がある場合は切り上げて実際の段数とします。</div>
      ${warn.length ? `<div class="result-note">${warn.join('<br>')}</div>` : ''}
      <div class="result-detail-label">各段の組成</div>
      <div class="stage-composition-wrap">
        <table class="unit-table stage-table">
          <thead>
            <tr><th>段</th><th>区間</th><th>x</th><th>y</th><th>次の操作線 y</th><th>段割合</th></tr>
          </thead>
          <tbody>${renderStageRows(stages.stageRows)}</tbody>
        </table>
      </div>
      <div class="result-meta">一定相対揮発度、等モル流れ、理想的な二成分系を仮定しています。</div>
    `;

    drawChart({
      alpha,
      zF,
      xD,
      xB,
      R,
      q,
      xFeed: feed.x,
      feed,
      strip,
      stagePoints: stages.points,
    });
  }

  function reset() {
    $('alpha').value = '2.4';
    $('zF').value = '0.45';
    $('xD').value = '0.95';
    $('xB').value = '0.05';
    $('R').value = '2.5';
    $('q').value = '1';
    $('eff').value = '70';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    reset();
  });
})();
