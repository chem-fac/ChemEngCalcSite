(function () {
  'use strict';

  const ROW_COUNT = 6;
  const $ = (id) => document.getElementById(id);

  function formatNumber(value, significantDigits) {
    if (!Number.isFinite(value)) return '-';
    if (value === 0) return '0';
    const digits = significantDigits || 5;
    const abs = Math.abs(value);
    if (abs >= 1e5 || abs < 1e-4) return value.toExponential(digits - 1);
    return Number(value.toPrecision(digits)).toString();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setError(message) {
    const error = $('error');
    error.textContent = message;
    error.style.display = 'block';
    $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }

  function clearError() {
    const error = $('error');
    error.textContent = '';
    error.style.display = 'none';
  }

  function buildRows() {
    const tbody = $('component-rows');
    const examples = [
      { name: '窒素', x: '0.79', mu: '17.81', mw: '28.0134' },
      { name: '酸素', x: '0.21', mu: '20.18', mw: '31.9988' }
    ];

    for (let i = 0; i < ROW_COUNT; i += 1) {
      const example = examples[i] || {};
      const row = document.createElement('tr');
      row.innerHTML = [
        '<td class="row-no">' + (i + 1) + '</td>',
        '<td><input type="text" data-field="name" data-row="' + i + '" placeholder="' + (example.name ? '例：' + example.name : '') + '"></td>',
        '<td><input type="number" inputmode="decimal" step="any" min="0" data-field="x" data-row="' + i + '" placeholder="' + (example.x ? '例：' + example.x : '') + '"></td>',
        '<td><input type="number" inputmode="decimal" step="any" min="0" data-field="mu" data-row="' + i + '" placeholder="' + (example.mu ? '例：' + example.mu : '') + '"></td>',
        '<td><input type="number" inputmode="decimal" step="any" min="0" data-field="mw" data-row="' + i + '" placeholder="' + (example.mw ? '例：' + example.mw : '') + '"></td>'
      ].join('');
      tbody.appendChild(row);
    }
  }

  function readComponents() {
    const components = [];

    for (let i = 0; i < ROW_COUNT; i += 1) {
      const nameInput = document.querySelector('[data-field="name"][data-row="' + i + '"]');
      const xInput = document.querySelector('[data-field="x"][data-row="' + i + '"]');
      const muInput = document.querySelector('[data-field="mu"][data-row="' + i + '"]');
      const mwInput = document.querySelector('[data-field="mw"][data-row="' + i + '"]');
      const name = nameInput.value.trim();
      const rawValues = [xInput.value.trim(), muInput.value.trim(), mwInput.value.trim()];
      const hasInput = name !== '' || rawValues.some((value) => value !== '');
      if (!hasInput) continue;

      const x = Number(xInput.value);
      const mu = Number(muInput.value);
      const mw = Number(mwInput.value);
      const rowLabel = name || '成分' + (i + 1);

      if (rawValues.some((value) => value === '')) {
        throw new Error(rowLabel + 'の組成・粘度・分子量をすべて入力してください。');
      }
      if (!Number.isFinite(x) || x <= 0) throw new Error(rowLabel + 'の組成は0より大きい値にしてください。');
      if (!Number.isFinite(mu) || mu <= 0) throw new Error(rowLabel + 'の粘度は0より大きい値にしてください。');
      if (!Number.isFinite(mw) || mw <= 0) throw new Error(rowLabel + 'の分子量は0より大きい値にしてください。');

      components.push({ name: rowLabel, x, mu, mw });
    }

    if (components.length < 2) throw new Error('成分を2つ以上入力してください。');
    return components;
  }

  function calculateWilke(components) {
    const sumX = components.reduce((sum, component) => sum + component.x, 0);
    components.forEach((component) => { component.xn = component.x / sumX; });

    let mixtureViscosity = 0;
    components.forEach((componentI) => {
      let denominator = 0;
      components.forEach((componentJ) => {
        const viscosityTerm = Math.sqrt(componentI.mu / componentJ.mu);
        const molecularWeightTerm = Math.pow(componentJ.mw / componentI.mw, 0.25);
        const phi = Math.pow(1 + viscosityTerm * molecularWeightTerm, 2) /
          Math.sqrt(8 * (1 + componentI.mw / componentJ.mw));
        denominator += componentJ.xn * phi;
      });
      mixtureViscosity += componentI.xn * componentI.mu / denominator;
    });

    return { mixtureViscosity, sumX };
  }

  function renderResult(components, result) {
    const expectedSum = $('composition-unit').value === 'percent' ? 100 : 1;
    const rows = components.map((component) =>
      '<tr><td>' + escapeHtml(component.name) + '</td><td class="num">' + formatNumber(component.xn) + '</td><td class="num">' +
      formatNumber(component.mu) + ' μPa·s</td><td class="num">' + formatNumber(component.mw) + '</td></tr>'
    ).join('');
    const normalizationNote = Math.abs(result.sumX - expectedSum) > expectedSum * 1e-6
      ? '<div class="result-note">※ 入力組成の合計 ' + formatNumber(result.sumX) + ' を1に正規化して計算しています。</div>'
      : '';

    $('result-area').innerHTML =
      '<div class="result-target">混合気体の粘度 μ<sub>mix</sub></div>' +
      '<div class="result-value-big">' + formatNumber(result.mixtureViscosity) + ' <span class="unit">μPa·s</span></div>' +
      '<table class="unit-table"><tbody>' +
      '<tr><td>Pa·s</td><td class="num">' + formatNumber(result.mixtureViscosity * 1e-6) + ' Pa·s</td></tr>' +
      '<tr><td>mPa·s</td><td class="num">' + formatNumber(result.mixtureViscosity * 1e-3) + ' mPa·s</td></tr>' +
      '<tr><td>成分数</td><td class="num">' + components.length + '</td></tr>' +
      '</tbody></table>' +
      '<table class="unit-table" style="margin-top:10px;"><thead><tr><th>成分</th><th class="num">正規化モル分率</th><th class="num">μ<sub>i</sub></th><th class="num">M<sub>i</sub></th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="result-meta">' + normalizationNote + '</div>';
  }

  function calculate() {
    clearError();
    try {
      const components = readComponents();
      const result = calculateWilke(components);
      if (!Number.isFinite(result.mixtureViscosity) || result.mixtureViscosity <= 0) {
        throw new Error('計算結果を求められませんでした。入力値を確認してください。');
      }
      renderResult(components, result);
    } catch (error) {
      setError(error.message);
    }
  }

  function reset() {
    document.querySelectorAll('#component-rows input').forEach((input) => { input.value = ''; });
    $('composition-unit').value = 'fraction';
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">成分を入力して「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildRows();
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
