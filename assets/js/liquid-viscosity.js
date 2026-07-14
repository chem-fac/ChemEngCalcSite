(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let mode = 'mu-to-nu';

  const MU_TO_SI = { 'Pa-s': 1, 'mPa-s': 1e-3, cP: 1e-3, P: 0.1 };
  const NU_TO_SI = { 'm2-s': 1, 'mm2-s': 1e-6, cSt: 1e-6, St: 1e-4 };
  const RHO_TO_SI = { 'kg-m3': 1, 'g-cm3': 1000, 'kg-L': 1000 };

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) return '-';
    if (value === 0) return '0';
    const significantDigits = digits || 6;
    const abs = Math.abs(value);
    if (abs >= 1e6 || abs < 1e-4) return value.toExponential(significantDigits - 1);
    return Number(value.toPrecision(significantDigits)).toString();
  }

  function setError(message) {
    $('error').textContent = message;
    $('error').style.display = 'block';
    $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }

  function clearError() {
    $('error').textContent = '';
    $('error').style.display = 'none';
  }

  function positiveValue(id, label) {
    const value = Number($(id).value);
    if (!Number.isFinite(value) || value <= 0) throw new Error(label + 'は0より大きい値を入力してください。');
    return value;
  }

  function setMode(nextMode) {
    mode = nextMode;
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-show-when]').forEach((element) => {
      element.style.display = element.dataset.showWhen === mode ? '' : 'none';
    });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function calculate() {
    clearError();
    try {
      if (mode === 'mu-to-nu') {
        const muInput = positiveValue('mu', '粘度');
        const rhoInput = positiveValue('rho-mu', '密度');
        const mu = muInput * MU_TO_SI[$('mu-unit').value];
        const rho = rhoInput * RHO_TO_SI[$('rho-mu-unit').value];
        const nu = mu / rho;
        $('result-area').innerHTML =
          '<div class="result-target">動粘度 ν</div>' +
          '<div class="result-value-big">' + formatNumber(nu * 1e6) + ' <span class="unit">mm²/s（cSt）</span></div>' +
          '<table class="unit-table"><tbody>' +
          '<tr><td>m²/s</td><td class="num">' + formatNumber(nu) + ' m²/s</td></tr>' +
          '<tr><td>mm²/s</td><td class="num">' + formatNumber(nu * 1e6) + ' mm²/s</td></tr>' +
          '<tr><td>cSt</td><td class="num">' + formatNumber(nu * 1e6) + ' cSt</td></tr>' +
          '<tr><td>St</td><td class="num">' + formatNumber(nu * 1e4) + ' St</td></tr>' +
          '</tbody></table>';
      } else {
        const nuInput = positiveValue('nu', '動粘度');
        const rhoInput = positiveValue('rho-nu', '密度');
        const nu = nuInput * NU_TO_SI[$('nu-unit').value];
        const rho = rhoInput * RHO_TO_SI[$('rho-nu-unit').value];
        const mu = rho * nu;
        $('result-area').innerHTML =
          '<div class="result-target">粘度 μ</div>' +
          '<div class="result-value-big">' + formatNumber(mu * 1000) + ' <span class="unit">mPa·s（cP）</span></div>' +
          '<table class="unit-table"><tbody>' +
          '<tr><td>Pa·s</td><td class="num">' + formatNumber(mu) + ' Pa·s</td></tr>' +
          '<tr><td>mPa·s</td><td class="num">' + formatNumber(mu * 1000) + ' mPa·s</td></tr>' +
          '<tr><td>cP</td><td class="num">' + formatNumber(mu * 1000) + ' cP</td></tr>' +
          '<tr><td>P</td><td class="num">' + formatNumber(mu * 10) + ' P</td></tr>' +
          '</tbody></table>';
      }
    } catch (error) {
      setError(error.message);
    }
  }

  function reset() {
    document.querySelectorAll('#calculator input').forEach((input) => { input.value = ''; });
    $('mu-unit').value = 'mPa-s';
    $('rho-mu-unit').value = 'kg-m3';
    $('nu-unit').value = 'cSt';
    $('rho-nu-unit').value = 'kg-m3';
    setMode('mu-to-nu');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode('mu-to-nu');
  });
})();
