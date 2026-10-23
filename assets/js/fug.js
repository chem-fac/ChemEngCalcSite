(function () {
  'use strict';

  // ===== 計算部（画面に依存しない部分。Node でも検証できるよう分けている） =====
  const eqY = (x, a) => a * x / (1 + (a - 1) * x);

  // q線と平衡曲線の交点（最小還流のピンチ点）。q > 1 なら x_F より右、q < 1 なら左で交わる
  function feedPinch(a, q, xF) {
    if (Math.abs(q - 1) < 1e-9) return { x: xF, y: eqY(xF, a) };
    const s = q / (q - 1);
    const c = -xF / (q - 1);
    // αx = (sx + c)(1 + (α−1)x) を整理した二次方程式
    const A = s * (a - 1);
    const B = s + c * (a - 1) - a;
    let roots;
    if (Math.abs(A) < 1e-14) {
      roots = [-c / B];
    } else {
      const D = B * B - 4 * A * c;
      if (D < 0) return null;
      const t = -0.5 * (B + (B >= 0 ? 1 : -1) * Math.sqrt(D));
      roots = [t / A, c / t];
    }
    const lo = q > 1 ? xF : 0;
    const hi = q > 1 ? 1 : xF;
    const x = roots.find(r => isFinite(r) && r >= lo - 1e-12 && r <= hi + 1e-12);
    return x === undefined ? null : { x, y: eqY(x, a) };
  }

  function fug(p) {
    const { xF, xD, xB, a, q, rMode, rVal } = p;
    if (![xF, xD, xB].every(v => v > 0 && v < 1)) return { error: '組成 xF・xD・xB は 0 と 1 の間の値（モル分率）で入力してください。' };
    if (!(xB < xF && xF < xD)) return { error: '組成は 缶出 xB ＜ 供給 xF ＜ 留出 xD の順になるように入力してください。' };
    if (!isFinite(a) || !(a > 1)) return { error: '相対揮発度 α は 1 より大きい値を入力してください。' };
    if (!isFinite(q)) return { error: '供給状態 q を入力してください。' };

    // Fenske：全還流のステップ数（リボイラー込み）
    const Smin = Math.log((xD / (1 - xD)) * ((1 - xB) / xB)) / Math.log(a);

    // Underwood（二成分）：ピンチ点の液組成 x' から最小還流比
    const pinch = feedPinch(a, q, xF);
    if (!pinch || !(pinch.x > xB && pinch.x < xD) || !(pinch.y < xD)) {
      return { error: 'この条件では、q線と平衡曲線の交点が 缶出組成〜留出組成 の範囲になく、最小還流比が求まりません。q と組成を見直してください。' };
    }
    const Rmin = (xD / pinch.x - a * (1 - xD) / (1 - pinch.x)) / (a - 1);
    if (!isFinite(Rmin) || !(Rmin >= 0) || !isFinite(rVal)) return { error: '還流比の計算が数値範囲を超えました。入力値の桁を見直してください。' };

    let R;
    if (rMode === 'absolute') {
      if (!(rVal > Rmin)) return { error: `還流比 R は最小還流比 Rmin（${Rmin.toPrecision(4)}）より大きい値を入力してください。` };
      R = rVal;
    } else {
      if (!(rVal > 1)) return { error: '倍率 R/Rmin は 1 より大きい値を入力してください。1 以下では段数が無限大になります。' };
      R = rVal * Rmin;
    }

    // Gilliland 相関（Molokanov の式）：Y = (S − Smin)/(S + 1)
    const X = (R - Rmin) / (R + 1);
    const Y = 1 - Math.exp(((1 + 54.4 * X) / (11 + 117.2 * X)) * ((X - 1) / Math.sqrt(X)));
    const S = (Y + Smin) / (1 - Y);
    if (!isFinite(S) || !(S >= Smin)) return { error: '理論段数が求まりませんでした。還流比と組成を見直してください。' };
    return { Smin, Rmin, R, ratio: R / Rmin, X, Y, S, pinch };
  }

  const core = { feedPinch, fug };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (typeof document === 'undefined') return;

  // ===== 画面 =====
  const $ = id => document.getElementById(id);
  const num = id => { const el = $(id); return el && el.value !== '' ? parseFloat(el.value) : NaN; };
  const f2 = v => (isFinite(v) ? v.toFixed(2) : '-');
  const f4 = v => (isFinite(v) ? Number(v.toPrecision(4)).toString() : '-');
  const PLACEHOLDER = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';

  function setError(m) {
    const e = $('error');
    e.textContent = m;
    e.style.display = 'block';
    $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }

  function applyRMode() {
    const ratio = $('rmode').value !== 'absolute';
    $('rval').placeholder = ratio ? '例：1.3' : '例：2';
    $('rval-hint').innerHTML = ratio
      ? '最小還流比 R<sub>min</sub> に対する倍率を入力します。'
      : '還流比 R（還流量／留出量）を直接入力します。';
  }

  function calculate() {
    clearError();
    const r = fug({
      xF: num('xF'), xD: num('xD'), xB: num('xB'), a: num('alpha'), q: num('q'),
      rMode: $('rmode').value, rVal: num('rval'),
    });
    if (r.error) return setError(r.error);
    $('result-area').innerHTML = `
      <div class="result-target">理論段数 <span class="sym">S</span>（リボイラー込み）</div>
      <div class="result-value-big">${f2(r.S)} <span class="unit">段</span></div>
      <table class="unit-table"><tbody>
        <tr><td>塔内の理論段数 S − 1（リボイラーを除く）</td><td class="num">${f2(r.S - 1)} 段</td></tr>
        <tr><td>最小ステップ数 S<sub>min</sub>（Fenske式・リボイラー込み）</td><td class="num">${f2(r.Smin)} 段</td></tr>
        <tr><td>最小還流比 R<sub>min</sub>（Underwood式）</td><td class="num">${f4(r.Rmin)}</td></tr>
        <tr><td>還流比 R（R/R<sub>min</sub>）</td><td class="num" style="white-space:nowrap">${f4(r.R)}（${f4(r.ratio)} 倍）</td></tr>
        <tr><td>Gilliland の X = (R − R<sub>min</sub>)/(R + 1)</td><td class="num">${f4(r.X)}</td></tr>
        <tr><td>Gilliland の Y = (S − S<sub>min</sub>)/(S + 1)</td><td class="num">${f4(r.Y)}</td></tr>
        <tr><td>ピンチ点の液組成 x′（q線と平衡曲線の交点）</td><td class="num">${f4(r.pinch.x)}</td></tr>
      </tbody></table>
      <div class="result-meta">Gilliland 相関による概算値です。相対揮発度一定の二成分系として計算しています。
      ${num('q') < 0.28 || num('q') > 1.42 || num('alpha') < 1.11 || num('alpha') > 4.05 || r.Rmin < 0.53 || r.Rmin > 9.09 || r.Smin < 3.4 || r.Smin > 60.3 ? '<div class="result-note">※ Molokanov式の検証範囲（q＝0.28〜1.42、α＝1.11〜4.05、Rmin＝0.53〜9.09、Smin＝3.4〜60.3）の外を含む外挿値です。</div>' : ''}</div>`;
  }

  function reset() {
    document.querySelectorAll('#calculator input[type="number"]').forEach(el => { el.value = ''; });
    clearError();
    $('result-area').innerHTML = PLACEHOLDER;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('rmode').addEventListener('change', applyRMode);
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    applyRMode();
  });
})();
