(function () {
  'use strict';
  const G = 9.80665;
  const MODES = ['open', 'closed_dry', 'closed_wet'];
  const TO_L = { mm: 1e-3, m: 1 };
  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
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
  // Inputs are SI values; heights are signed tap elevation minus transmitter elevation.
  function calculate(x) {
    const { mode, L_min, L_max, rho, H_HP, H_LP, rho_seal } = x;
    if (!MODES.includes(mode)) throw new Error('タンクタイプを選択してください。');
    if (!Number.isFinite(L_min) || L_min < 0) throw new Error('液位下限を0以上の有限な値で入力してください。');
    if (!Number.isFinite(L_max) || L_max <= L_min) throw new Error('液位上限を下限より大きい有限な値で入力してください。');
    if (!Number.isFinite(rho) || rho <= 0) throw new Error('プロセス液密度を正の有限な値で入力してください。');
    if (!Number.isFinite(H_HP)) throw new Error('HPタップと伝送器の高低差を有限な値で入力してください。');
    if (mode === 'closed_wet') {
      if (!Number.isFinite(H_LP)) throw new Error('湿式液柱上端と伝送器の高低差を有限な値で入力してください。');
      if (!Number.isFinite(rho_seal) || rho_seal <= 0) throw new Error('シール液密度を正の有限な値で入力してください。');
      const height = H_LP - H_HP;
      const tolerance = 16 * Number.EPSILON * Math.max(1, Math.abs(H_LP), Math.abs(H_HP), Math.abs(L_max));
      if (!Number.isFinite(height) || height + tolerance < L_max) throw new Error('上側ガスタップが液位上限より下です。湿式液柱上端の高低差 − HPタップの高低差を液位上限以上にしてください。');
    }
    const hpHead = rho * G * H_HP;
    const lpHead = mode === 'closed_wet' ? rho_seal * G * H_LP : 0;
    const lrv = rho * G * L_min + hpHead - lpHead;
    const urv = rho * G * L_max + hpHead - lpHead;
    const span = rho * G * (L_max - L_min);
    if (![hpHead, lpHead, lrv, urv, span].every(Number.isFinite) || span <= 0 || !(urv > lrv)) throw new Error('計算結果を有限な値で区別できません。入力値の大きさと測定範囲を見直してください。');
    return { lrv, urv, span, hpHead, lpHead };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate, G };
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const placeholder = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  function clearError() { $('error').textContent = ''; $('error').style.display = 'none'; }
  const modeCopy = {
    open: {
      description: '液面と伝送器の低圧側に同じ大気圧がかかる構成です。タンク上部と低圧側を結ぶ管は接続しません。',
      title: '差圧液面計の高さの基準（開放タンク）',
      caption: '高さは配管長さではなく鉛直方向の差です。図は開放タンク・伝送器下置きの例です。低圧側の接続口は大気に開放し、タンク上部とは接続しません。図は静水圧式から独自に作図しています。'
    },
    closed_dry: {
      description: '密閉タンクでは、下部の圧力に上部の気体圧力も加わるため、上下の圧力差を測ります。乾式は、上部につながる管に気体だけを入れる構成です。窒素など、管内で液に変わらない気体の条件で使います。下部側の管は測定液で満たします。上部の気体圧力は伝わりますが、管内の液柱は加わりません（気体の重さは無視）。',
      title: '差圧液面計の高さの基準（密閉・乾式）',
      caption: '高さは配管長さではなく鉛直方向の差です。図は乾式・伝送器下置きの例です。上部側の管は気体、下部側の管は測定液で満たします。図は静水圧式から独自に作図しています。'
    },
    closed_wet: {
      description: '密閉タンクでは、下部の圧力に上部の気体圧力も加わるため、上下の圧力差を測ります。湿式は、上部につながる管も水などの液で満たす構成です。蒸気などが冷えて液になり、管内に不定量たまる条件で使います。最初から一定高さまで液で満たし、たまる量による変動を避けます。この一定の液柱による圧力も計算対象です。',
      title: '差圧液面計の高さの基準（密閉・湿式）',
      caption: '図は湿式・伝送器下置きの例で、高さは鉛直方向の差を示します。上部から低圧側へつながる管も液で満たす構成です。この管内液の上端は上側の気相取り出し口と同じ高さに限定し、静水圧式から独自に作図しています。'
    }
  };
  function toggleMode() {
    const mode = $('mode').value;
    const wet = mode === 'closed_wet';
    $('row_HLP').style.display = wet ? '' : 'none';
    $('row_rho_seal').style.display = wet ? '' : 'none';
    const copy = modeCopy[mode] || modeCopy.open;
    $('mode-description').textContent = copy.description;
    $('mode-figure-caption').textContent = copy.caption;
    $('dp-fig-title').textContent = copy.title;
    $('dp-fig-desc').textContent = '下側の取り出し口から液面までが液位Lです。伝送器中心を高さ0とし、取り出し口までの高低差は上向きを正とします。' + copy.caption;
    document.querySelectorAll('[data-dp-modes]').forEach(el => {
      el.setAttribute('display', el.dataset.dpModes.split(' ').includes(mode) ? 'inline' : 'none');
    });
  }
  const examples = { L_min: 0, L_max: 3, H_HP: 0.5, H_LP: 3.5 };
  function updateExample(id) { $(id).placeholder = '例：' + examples[id] / TO_L[$(id + '_unit').value]; }
  function read(id) { return $(id).value.trim() === '' ? NaN : Number($(id).value); }
  function length(id) { return read(id) * TO_L[$(id + '_unit').value]; }
  function calc() {
    clearError();
    const mode = $('mode').value;
    const x = { mode, L_min: length('L_min'), L_max: length('L_max'), rho: read('rho'), H_HP: length('H_HP'), H_LP: length('H_LP'), rho_seal: read('rho_seal') };
    let r;
    try { r = calculate(x); } catch (e) {
      $('error').textContent = e.message; $('error').style.display = 'block';
      $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; return;
    }
    const pressure = (p) => `${fmtNum(p / 1000)} kPa / ${fmtNum(p)} Pa / ${fmtNum(p / G)} mmH₂O`;
    const direction = r.lrv > 0 ? '零点抑圧（zero suppression）' : r.lrv < 0 ? '零点立ち上げ（zero elevation）' : '零点補正なし';
    const row = (name, value) => `<tr><td>${name}</td><td class="num">${value}</td></tr>`;
    const notes = [];
    if (x.H_HP < 0) notes.push('伝送器はHPタップより上です。HP導圧管の液充満を確保できる場合に限る理想計算で、施工の成立性は判定していません。');
    if (mode === 'closed_wet') notes.push('湿式液柱上端は上側ガスタップと同じ高さです。実設置では上側取出口が液没しない余裕を確保します。');
    notes.push('密度一定・気相の静水圧無視の計算です。リモートシールは対象外です。');
    $('result-area').innerHTML = `<div class="result-target">差圧伝送器のスパン</div><div class="result-value-big">${fmtNum(r.span / 1000)} <span class="unit">kPa</span></div>
      <table class="unit-table"><tbody>
      ${row('LRV（液位下限での差圧）', pressure(r.lrv))}
      ${row('URV（液位上限での差圧）', pressure(r.urv))}
      ${row('スパン URV − LRV', pressure(r.span))}
      ${row('零点補正の方向', direction)}
      ${row('HP導圧管の液柱寄与', pressure(r.hpHead))}
      ${mode === 'closed_wet' ? row('LPシール液柱の差し引き量', pressure(r.lpHead)) : ''}
      </tbody></table><div class="result-meta">${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}</div>`;
  }
  function reset() {
    document.querySelectorAll('#calculator input[type="number"]').forEach(el => { el.value = ''; });
    $('mode').value = 'open';
    Object.keys(examples).forEach(id => { $(id + '_unit').value = 'm'; updateExample(id); });
    toggleMode(); clearError(); $('result-area').innerHTML = placeholder;
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('mode').addEventListener('change', toggleMode);
    Object.keys(examples).forEach(id => { $(id + '_unit').addEventListener('change', () => updateExample(id)); updateExample(id); });
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    toggleMode();
  });
})();
