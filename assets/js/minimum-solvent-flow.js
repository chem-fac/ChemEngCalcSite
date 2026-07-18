(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const FLOW_TO_KMOL_H = { 'kmol-h': 1, 'mol-h': 1e-3, 'mol-s': 3.6 };
  const FLOW_FROM_KMOL_H = { 'kmol-h': 1, 'mol-h': 1e3, 'mol-s': 1 / 3.6 };
  const FLOW_LABEL = { 'kmol-h': 'kmol/h', 'mol-h': 'mol/h', 'mol-s': 'mol/s' };
  let previousCompositionUnit = 'percent';
  let lastChartData = null;
  let resizeTimer = null;

  function value(id) {
    const el = $(id);
    return el && el.value !== '' ? Number(el.value) : NaN;
  }

  function formatNumber(v, sig = 6) {
    if (!Number.isFinite(v)) return '-';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }

  function toFraction(raw) {
    return $('composition-unit').value === 'percent' ? raw / 100 : raw;
  }

  function setError(message) {
    const error = $('error');
    error.textContent = message;
    error.style.display = 'block';
    $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
    clearChart();
  }

  function clearError() {
    const error = $('error');
    error.textContent = '';
    error.style.display = 'none';
  }

  function updateCompositionLabels(convertExisting = false) {
    const unit = $('composition-unit').value;
    if (convertExisting && unit !== previousCompositionUnit) {
      const factor = unit === 'percent' ? 100 : 0.01;
      ['y-in', 'y-out', 'x-in', 'x-equilibrium'].forEach((id) => {
        const el = $(id);
        if (el.value !== '' && Number.isFinite(Number(el.value))) el.value = String(Number(el.value) * factor);
      });
    }
    previousCompositionUnit = unit;
    const isPercent = unit === 'percent';
    const label = isPercent ? 'mol%' : 'mol/mol';
    document.querySelectorAll('[data-composition-unit-label]').forEach((el) => { el.textContent = label; });
    $('y-in').placeholder = isPercent ? '例：10' : '例：0.10';
    $('y-out').placeholder = isPercent ? '例：1' : '例：0.01';
    $('x-in').placeholder = '例：0';
    $('x-equilibrium').placeholder = isPercent ? '例：2' : '例：0.02';
  }
  function clearChart() {
    lastChartData = null;
    const section = $('absorption-chart-section');
    if (section) section.hidden = true;
  }

  function axisNumber(v) {
    if (v === 0) return '0';
    if (Math.abs(v) < 0.001 || Math.abs(v) >= 1000) return v.toExponential(1);
    return Number(v.toPrecision(3)).toString();
  }

  function drawAbsorptionChart(data) {
    const section = $('absorption-chart-section');
    const canvas = $('absorption-chart');
    if (!section || !canvas) return;

    section.hidden = false;
    const cssWidth = Math.max(280, canvas.clientWidth || 760);
    const cssHeight = Math.max(340, Math.min(500, cssWidth * 0.68));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const compact = cssWidth < 480;
    const legendRows = compact ? 2 : 1;
    const leftMargin = compact ? 78 : 82;
    const rightMargin = compact ? 18 : 26;
    const area = {
      x0: leftMargin,
      y0: 34 + legendRows * 25,
      w: cssWidth - leftMargin - rightMargin,
      h: cssHeight - (34 + legendRows * 25) - 68,
    };

    const xMax = Math.max(data.xRatioEq, data.xRatioOut, data.xRatioIn) * 1.14;
    const equilibriumSlope = data.yRatioIn / data.xRatioEq;
    const yMax = Math.max(data.yRatioIn * 1.14, equilibriumSlope * xMax);
    const sx = (x) => area.x0 + area.w * x / xMax;
    const sy = (y) => area.y0 + area.h * (1 - y / yMax);

    ctx.font = `${compact ? 10 : 11}px "Noto Sans JP", sans-serif`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const x = area.x0 + area.w * t;
      const y = area.y0 + area.h * (1 - t);
      ctx.strokeStyle = '#e7ece9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, area.y0);
      ctx.lineTo(x, area.y0 + area.h);
      ctx.moveTo(area.x0, y);
      ctx.lineTo(area.x0 + area.w, y);
      ctx.stroke();
      ctx.fillStyle = '#66736c';
      ctx.textAlign = 'center';
      ctx.fillText(axisNumber(xMax * t), x, area.y0 + area.h + 17);
      ctx.textAlign = 'right';
      ctx.fillText(axisNumber(yMax * t), area.x0 - 8, y);
    }

    ctx.strokeStyle = '#8ba197';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(area.x0, area.y0, area.w, area.h);

    ctx.fillStyle = '#2a2a2a';
    ctx.font = `${compact ? 10 : 12}px "Noto Sans JP", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('液相モル比 X_A [mol/mol]', area.x0 + area.w / 2, cssHeight - 18);
    ctx.save();
    ctx.translate(compact ? 13 : 18, area.y0 + area.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('気相モル比 Y_A [mol/mol]', 0, 0);
    ctx.restore();

    function line(points, color, width, dash = []) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(sx(point.x), sy(point.y));
        else ctx.lineTo(sx(point.x), sy(point.y));
      });
      ctx.stroke();
      ctx.restore();
    }

    function circle(x, y, color) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(sx(x), sy(y), compact ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const colors = { equilibrium: '#087846', operating: '#1769aa', minimum: '#d97706' };
    line([{ x: 0, y: 0 }, { x: xMax, y: equilibriumSlope * xMax }], colors.equilibrium, 2.4);
    line([
      { x: data.xRatioIn, y: data.yRatioOut },
      { x: data.xRatioOut, y: data.yRatioIn },
    ], colors.operating, 2.8);
    line([
      { x: data.xRatioIn, y: data.yRatioOut },
      { x: data.xRatioEq, y: data.yRatioIn },
    ], colors.minimum, 2.4, [8, 5]);

    circle(data.xRatioIn, data.yRatioOut, colors.operating);
    circle(data.xRatioOut, data.yRatioIn, colors.operating);
    circle(data.xRatioEq, data.yRatioIn, colors.minimum);

    ctx.font = `${compact ? 9 : 11}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = '#2f3633';
    ctx.textAlign = 'left';
    ctx.fillText('塔頂', sx(data.xRatioIn) + 8, sy(data.yRatioOut) + (compact ? 14 : 13));
    ctx.fillText('塔底運転点', sx(data.xRatioOut) + 7, sy(data.yRatioIn) - 10);
    ctx.fillText('平衡点', sx(data.xRatioEq) + 7, sy(data.yRatioIn) + 11);

    const legend = [
      { label: '平衡線（直線近似）', color: colors.equilibrium, dash: [] },
      { label: '運転操作線', color: colors.operating, dash: [] },
      { label: '最小操作線', color: colors.minimum, dash: [7, 4] },
    ];
    let lx = area.x0;
    let ly = 20;
    ctx.font = `${compact ? 9 : 11}px "Noto Sans JP", sans-serif`;
    ctx.textAlign = 'left';
    legend.forEach((item) => {
      const itemWidth = 34 + ctx.measureText(item.label).width + 15;
      if (lx + itemWidth > cssWidth - 10) {
        lx = area.x0;
        ly += 24;
      }
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.4;
      ctx.setLineDash(item.dash);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 26, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2f3633';
      ctx.fillText(item.label, lx + 32, ly);
      lx += itemWidth;
    });

    canvas.setAttribute(
      'aria-label',
      `吸収X-Y線図。塔頂はX=${axisNumber(data.xRatioIn)}、Y=${axisNumber(data.yRatioOut)}。塔底運転点はX=${axisNumber(data.xRatioOut)}、Y=${axisNumber(data.yRatioIn)}。入力平衡点はX=${axisNumber(data.xRatioEq)}、Y=${axisNumber(data.yRatioIn)}。`,
    );
  }

  function calculate() {
    clearError();

    const gasFlowRaw = value('gas-flow');
    const yIn = toFraction(value('y-in'));
    const yOut = toFraction(value('y-out'));
    const xIn = toFraction(value('x-in'));
    const xEq = toFraction(value('x-equilibrium'));
    const factor = value('operating-factor');

    if (!(gasFlowRaw > 0)) return setError('入口ガスモル流量を正の値で入力してください。');
    if (!(yIn > 0 && yIn < 1)) return setError('入口ガス組成は0より大きく1未満の値にしてください。');
    if (!(yOut >= 0 && yOut < yIn)) return setError('出口ガス組成は0以上かつ入口ガス組成より小さくしてください。');
    if (!(xIn >= 0 && xIn < 1)) return setError('入口吸収液組成は0以上1未満の値にしてください。');
    if (!(xEq > 0 && xEq < 1)) return setError('平衡液組成は0より大きく1未満の値にしてください。');
    if (!(xEq > xIn)) return setError('平衡液組成は入口吸収液組成より大きくしてください。');
    if (!(factor > 1)) return setError('運転倍率は1より大きい値にしてください。');

    const flowUnit = $('gas-flow-unit').value;
    const gasInputKmolH = gasFlowRaw * FLOW_TO_KMOL_H[flowUnit];
    const gasSoluteFree = $('gas-flow-basis').value === 'total'
      ? gasInputKmolH * (1 - yIn)
      : gasInputKmolH;

    const yRatioIn = yIn / (1 - yIn);
    const yRatioOut = yOut / (1 - yOut);
    const xRatioIn = xIn / (1 - xIn);
    const xRatioEq = xEq / (1 - xEq);
    const deltaY = yRatioIn - yRatioOut;
    const deltaXEq = xRatioEq - xRatioIn;

    if (!(deltaY > 0)) return setError('入口・出口ガス組成から正の吸収量を計算できません。');
    if (!(deltaXEq > 0)) return setError('平衡組成と入口液組成から正の吸収能力を計算できません。');

    const minRatio = deltaY / deltaXEq;
    const minSolvent = gasSoluteFree * minRatio;
    const operatingRatio = minRatio * factor;
    const operatingSolvent = minSolvent * factor;
    const xRatioOut = xRatioIn + deltaY / operatingRatio;
    const xOut = xRatioOut / (1 + xRatioOut);
    const absorbed = gasSoluteFree * deltaY;
    const removal = (1 - yRatioOut / yRatioIn) * 100;
    const inletTotalLiquid = operatingSolvent / (1 - xIn);
    const equilibriumApproach = (xRatioOut - xRatioIn) / deltaXEq * 100;

    if (!(xOut < xEq)) return setError('計算された出口液組成が平衡液組成以上です。運転倍率を大きくしてください。');

    const outputFactor = FLOW_FROM_KMOL_H[flowUnit];
    const outputUnit = FLOW_LABEL[flowUnit];
    const warnings = [];
    if (factor < 1.25) warnings.push('運転液量が最小液量に近く、必要塔高が大きくなりやすい条件です。');
    if (equilibriumApproach > 80) warnings.push('出口液組成が平衡組成に近いため、塔底側の物質移動推進力が小さくなります。');

    $('result-area').innerHTML = `
      <div class="result-target">運転溶媒流量 L′<sub>M</sub></div>
      <div class="result-value-big">${formatNumber(operatingSolvent * outputFactor)} <span>${outputUnit}</span></div>
      <table class="result-table">
        <tr><td>最小液ガス比 (L′<sub>M</sub>/G′<sub>M</sub>)<sub>min</sub></td><td class="num">${formatNumber(minRatio)}</td></tr>
        <tr><td>運転液ガス比 L′<sub>M</sub>/G′<sub>M</sub></td><td class="num">${formatNumber(operatingRatio)}</td></tr>
        <tr><td>溶質を除いたガス流量 G′<sub>M</sub></td><td class="num">${formatNumber(gasSoluteFree * outputFactor)} ${outputUnit}</td></tr>
        <tr><td>最小溶媒流量 L′<sub>M,min</sub></td><td class="num">${formatNumber(minSolvent * outputFactor)} ${outputUnit}</td></tr>
        <tr><td>入口全液流量</td><td class="num">${formatNumber(inletTotalLiquid * outputFactor)} ${outputUnit}</td></tr>
        <tr><td>出口液組成 x<sub>A1</sub></td><td class="num">${formatNumber(xOut * 100)} mol%（${formatNumber(xOut)}）</td></tr>
        <tr><td>吸収量</td><td class="num">${formatNumber(absorbed * outputFactor)} ${outputUnit}</td></tr>
        <tr><td>溶質除去率</td><td class="num">${formatNumber(removal)} %</td></tr>
        <tr><td>平衡組成への到達率</td><td class="num">${formatNumber(equilibriumApproach)} %</td></tr>
      </table>
      ${warnings.map((w) => `<div class="result-note caution-text">${w}</div>`).join('')}
      <div class="result-note">流量は入力したガス流量と同じモル流量単位で表示しています。</div>`;

    lastChartData = { yRatioIn, yRatioOut, xRatioIn, xRatioEq, xRatioOut };
    drawAbsorptionChart(lastChartData);
  }

  function reset() {
    ['gas-flow', 'y-in', 'y-out', 'x-in', 'x-equilibrium', 'operating-factor'].forEach((id) => { $(id).value = ''; });
    $('composition-unit').value = 'percent';
    $('gas-flow-basis').value = 'total';
    $('gas-flow-unit').value = 'kmol-h';
    updateCompositionLabels();
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
    clearChart();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('composition-unit').addEventListener('change', () => updateCompositionLabels(true));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (lastChartData) drawAbsorptionChart(lastChartData);
      }, 120);
    });
    updateCompositionLabels();
  });
})();
