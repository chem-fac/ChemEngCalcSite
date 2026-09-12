/* New independent implementation. Inputs and results use explicit units. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LMTD = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = {
    hotIn: '高温側の入口温度', hotOut: '高温側の出口温度',
    coldIn: '低温側の入口温度', coldOut: '低温側の出口温度',
    heat: '熱交換量 Q', coefficient: '総括伝熱係数 U', correction: '補正係数 F'
  };
  const temperatureUnits = ['C', 'K', 'F'];
  const heatUnits = { W: 1, kW: 1000, MW: 1000000 };
  const coefficientUnits = { W: 1, kW: 1000 };
  function number(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  function toCelsius(t, unit) {
    if (unit === 'K') return t - 273.15;
    if (unit === 'F') return (t - 32) * 5 / 9;
    return t;
  }
  function fromCelsius(t, unit) {
    if (unit === 'K') return t + 273.15;
    if (unit === 'F') return t * 9 / 5 + 32;
    return t;
  }
  function logMean(a, b) {
    if (!(Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0)) throw new RangeError('Both end differences must be positive and finite.');
    if (a === b) return a;
    const hi = Math.max(a, b), lo = Math.min(a, b), difference = hi - lo;
    const relative = difference / lo;
    // log1p protects almost equal terminal differences; logs avoid ratio overflow.
    return difference / (relative <= 0.5 ? Math.log1p(relative) : Math.log(hi) - Math.log(lo));
  }
  function calculate(input) {
    const errors = [], notes = [];
    function fail(field, code, text) { errors.push({ field, code, text }); }
    function read(key) {
      const value = number(input[key]);
      if (value === null) fail(key, 'number', fields[key] + 'を有限の数値で入力してください。');
      return value;
    }
    const mode = input.mode;
    if (!['counter', 'parallel', 'corrected'].includes(mode)) fail('mode', 'mode', '流れ形式を選択してください。');
    if (!temperatureUnits.includes(input.temperatureUnit)) fail('temperatureUnit', 'unit', '温度単位を選択してください。');
    const raw = Object.fromEntries(['hotIn','hotOut','coldIn','coldOut'].map(key => [key, read(key)]));
    const t = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value === null ? null : toCelsius(value, input.temperatureUnit)]));
    for (const [key, value] of Object.entries(t)) {
      if (value !== null && (!Number.isFinite(value) || value <= -273.15)) fail(key, 'absolute_zero', fields[key] + 'は絶対零度より高い温度にしてください。');
    }
    let correction = 1;
    if (mode === 'corrected') {
      correction = read('correction');
      if (correction !== null && !(correction > 0 && correction <= 1)) fail('correction', 'range', '補正係数 F は 0 より大きく、1 以下にしてください。');
    }
    const withArea = input.withArea === true;
    let heat = null, coefficient = null;
    if (withArea) {
      const q = read('heat'), u = read('coefficient');
      if (!Object.hasOwn(heatUnits, input.heatUnit)) fail('heatUnit', 'unit', '熱交換量の単位を選択してください。');
      if (!Object.hasOwn(coefficientUnits, input.coefficientUnit)) fail('coefficientUnit', 'unit', '総括伝熱係数の単位を選択してください。');
      heat = q === null ? null : q * heatUnits[input.heatUnit];
      coefficient = u === null ? null : u * coefficientUnits[input.coefficientUnit];
      if (q !== null && !(heat > 0 && Number.isFinite(heat))) fail('heat', 'positive', '熱交換量 Q は 0 より大きい有限の値にしてください。');
      if (u !== null && !(coefficient > 0 && Number.isFinite(coefficient))) fail('coefficient', 'positive', '総括伝熱係数 U は 0 より大きい有限の値にしてください。');
    }
    if (errors.length) return { ok: false, errors, result: null };
    if (t.hotOut > t.hotIn) fail('hotOut', 'hot_warming', 'このモデルでは高温側は冷却されます。高温側の出口温度を入口温度以下にしてください。');
    if (t.coldOut < t.coldIn) fail('coldOut', 'cold_cooling', 'このモデルでは低温側は加熱されます。低温側の出口温度を入口温度以上にしてください。');
    const leftCold = mode === 'parallel' ? t.coldIn : t.coldOut;
    const rightCold = mode === 'parallel' ? t.coldOut : t.coldIn;
    const d1 = t.hotIn - leftCold, d2 = t.hotOut - rightCold;
    for (const [key, difference, side] of [['end1',d1,'端1'], ['end2',d2,'端2']]) {
      if (!Number.isFinite(difference)) fail(key, 'overflow', side + 'の温度差が計算可能な範囲を超えています。');
      else if (difference === 0) fail(key, 'zero_approach', side + 'の温度差が 0 K です。正の熱交換量を有限の伝熱面積で達成する条件には使えません。');
      else if (difference < 0) fail(key, 'temperature_cross', side + 'で低温側が高温側を上回っています。同じ位置の端温度を確認してください。');
    }
    if (errors.length) return { ok: false, errors, result: null };
    const lmtd = logMean(d1, d2), effective = lmtd * correction;
    const ua = withArea ? heat / effective : null;
    const area = withArea ? ua / coefficient : null;
    if (![lmtd, effective, ...(withArea ? [ua,area] : [])].every(x => Number.isFinite(x) && x > 0)) {
      return { ok: false, errors: [{field:'result',code:'numeric_range',text:'値の桁が大きすぎるか小さすぎるため、有限で正の結果を計算できません。単位と入力値を確認してください。'}], result:null };
    }
    const nearlyEqual = Math.abs(d1-d2) / Math.max(d1,d2) < 1e-7;
    if (nearlyEqual) notes.push('両端の温度差が等しい場合、LMTD はその温度差です。近い値も桁落ちを抑えて計算します。');
    if (mode !== 'parallel' && t.coldOut > t.hotOut) notes.push('低温側出口が高温側出口より高くても、向流では出口の位置が異なります。判定には同じ位置の端温度差を使っています。');
    if (Math.min(d1,d2) < 1) notes.push('端温度差が 1 K 未満です。入力温度の丸めや測定差が結果に大きく影響し得ます。');
    if (mode === 'corrected') notes.push('F は入力値です。温度条件・シェル数・パス構成に合う係数であることや、その配置の実現可能性までは判定していません。');
    return { ok: true, errors: [], result: { mode, temperaturesC:t, d1, d2, lmtd, correction, effective, heatW:heat, coefficientW:coefficient, requiredUA:ua, area, notes, nearlyEqual } };
  }
  return Object.freeze({ number, toCelsius, fromCelsius, logMean, calculate });
}));
