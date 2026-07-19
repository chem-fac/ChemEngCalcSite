(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ATM_PA = 101325;

  function presToPaAbs(value, unit) {
    if (!isFinite(value)) return NaN;
    const isG = unit.endsWith('G');
    const u = unit.replace(/[GA]$/, '');
    let pa;
    if (u === 'kPa') pa = value * 1000;
    else if (u === 'MPa') pa = value * 1e6;
    else if (u === 'bar') pa = value * 1e5;
    else pa = value;
    return isG ? pa + ATM_PA : pa;
  }

  function qToM3h(value, unit) {
    if (!isFinite(value)) return NaN;
    const map = { m3h: 1, m3min: 60, m3s: 3600, Lmin: 0.06 };
    return value * (map[unit] || 1);
  }
  function qNtoNm3h(value, unit) {
    if (!isFinite(value)) return NaN;
    if (unit === 'Nm3h') return value;
    if (unit === 'Nm3min') return value * 60;
    if (unit === 'Sm3h') return value * 0.9461;   // 273.15/288.7 ≒ 0.9461（15.6℃→0℃の体積換算）
    return value;
  }
  function wToKgh(value, unit) {
    if (!isFinite(value)) return NaN;
    if (unit === 'kgh') return value;
    if (unit === 'kgmin') return value * 60;
    if (unit === 'ts') return value * 1000;
    return value;
  }
  function tToK(value, unit) {
    if (!isFinite(value)) return NaN;
    return unit === 'C' ? value + 273.15 : value;
  }

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) return Number(v.toPrecision(sig)).toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function unitOf(id) { const u = $(id + '_unit'); return u ? u.value : ''; }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'liquid';

  // Liquid: IEC 60534-2-1 SI form
  // Cv = (Q[m3/h] / N1) * sqrt(G / dP[bar])  with N1 = 0.865 (Cv, bar)
  // We use kPa internally and convert: dP[bar] = dP[kPa]/100
  function calcLiquid() {
    const Q = qToM3h(val('Ql'), unitOf('Ql'));
    const G = val('Gl');
    const P1 = presToPaAbs(val('P1l'), unitOf('P1l'));
    const P2 = presToPaAbs(val('P2l'), unitOf('P2l'));
    const Pv = isFinite(val('Pvl')) ? presToPaAbs(val('Pvl'), unitOf('Pvl')) : NaN;
    const FL = val('FL');
    if (!positive(Q)) return setError('体積流量を正の数値で入力してください。');
    if (!positive(G)) return setError('比重を正の数値で入力してください。');
    if (G > 15) return setError('比重 G が 15 を超えています。密度 [kg/m³] をそのまま入力していませんか？ 水基準の比重（水 = 1.0）で入力してください。');
    if (![P1, P2].every(positive)) return setError('入口・出口圧力を入力してください。');
    if (P1 <= P2) return setError('入口圧 P1 は出口圧 P2 より大きくしてください。');

    const dP_Pa = P1 - P2;
    const dP_bar = dP_Pa / 1e5;
    const N1 = 0.865;       // Cv (US gpm equivalent), Q[m3/h], dP[bar]

    let dPuse = dP_bar;
    let choked = false;
    let notes = [];
    if (isFinite(Pv) && Pv <= 0) {
      return setError('飽和蒸気圧 P_v は絶対圧で正の値を入力してください（チョーク判定を省略する場合は空欄にしてください）。');
    }
    if (isFinite(Pv) && Pv > 0) {
      const FF = 0.96;
      if (P1 - FF * Pv <= 0) {
        return setError(`P₁ - 0.96·P_v ≦ 0（P₁ = ${fmtNum(P1 / 1000)} kPaA, P_v = ${fmtNum(Pv / 1000)} kPaA）です。蒸気圧が入口圧より高い／同等のため、サイジング条件として成立しません（液は入口側でフラッシュ／全蒸発）。蒸気圧の評価温度・入口圧の単位・絶対/ゲージ表記を確認してください。`);
      }
      if (isFinite(FL)) {
        if (!(FL > 0 && FL <= 1)) {
          return setError('FL（液圧回復係数）は 0 < FL ≦ 1 の範囲で入力してください（グローブ弁≒0.9、バタフライ60°≒0.68、ボール弁≒0.55）。チョーク判定を省略したい場合は FL を空欄にしてください。');
        }
        const dPchoke_Pa = FL * FL * (P1 - FF * Pv);
        const dPchoke_bar = dPchoke_Pa / 1e5;
        if (dP_bar >= dPchoke_bar) {
          choked = true;
          dPuse = dPchoke_bar;
          notes.push(`チョーク判定：ΔP (${fmtNum(dP_bar)} bar) ≧ ΔP_choke (${fmtNum(dPchoke_bar)} bar)。チョーク値で Cv を計算（FF = 0.96 固定）。`);
        }
      } else {
        if (P2 < Pv) {
          return setError(`出口圧 P₂ (${fmtNum(P2 / 1000)} kPaA) が飽和蒸気圧 P_v (${fmtNum(Pv / 1000)} kPaA) を下回っており、バルブ下流でフラッシングが確定する条件です。チョークを考慮しないと必要 Cv を過小評価（バルブの過小選定）するため、FL（液圧回復係数）を入力してチョーク判定込みで計算してください。`);
        }
        notes.push('FL 未入力のため、チョーク判定は省略しました。');
      }
    } else if (isFinite(FL)) {
      notes.push('P_v 未入力のため、FL はチョーク判定に使用していません。');
    }

    const Cv = (Q / N1) * Math.sqrt(G / dPuse);
    const Kv = 0.865 * Cv;

    renderResult({
      title: '必要 Cv（液体）',
      bigValue: `${fmtNum(Cv)} <span class="unit">［-］</span>`,
      rows: [
        ['Cv（米ガロン基準）', `${fmtNum(Cv)}`],
        ['Kv（SI、bar基準）', `${fmtNum(Kv)}`],
        ['入口絶対圧 P₁', `${fmtNum(P1 / 1000)} kPaA`],
        ['出口絶対圧 P₂', `${fmtNum(P2 / 1000)} kPaA`],
        ['ΔP', `${fmtNum(dP_Pa / 1000)} kPa  /  ${fmtNum(dP_bar)} bar`],
        ['流量 Q', `${fmtNum(Q)} m³/h`],
        ['比重 G', `${fmtNum(G)}`],
        ['チョーク', choked ? 'あり（ΔP上限あり）' : 'なし'],
      ],
      meta: notes.length ? notes.map(n => `※ ${n}`).join('<br>') : '※ IEC 60534-2-1 液体サイジング式（N1=0.865, bar基準）。',
    });
  }

  // Gas: IEC 60534-2-1, mass-flow form (Cv = W / (N6 Y sqrt(x P1 rho1)), N6=27.3 で
  // W[kg/h], P1[bar], rho1[kg/m3] のとき Cv を直接与える)。
  // 入力は Nm3/h なので、質量流量 W と入口密度 rho1 に換算してから蒸気と同じ式に通す。
  //   W[kg/h]  = QN[Nm3/h] * M[g/mol] / 22.414   (0℃,101.325kPa のモル体積=22.414 L/mol)
  //   rho1     = P1 * M / (Z R T1)   （実在ガスは Z で補正）
  function calcGas() {
    const QN = qNtoNm3h(val('Qg'), unitOf('Qg'));
    const M = val('Mg');
    const T1 = tToK(val('T1g'), unitOf('T1g'));
    const P1 = presToPaAbs(val('P1g'), unitOf('P1g'));
    const P2 = presToPaAbs(val('P2g'), unitOf('P2g'));
    const k = val('kg');
    let Z = val('Zg');
    let zNote = '';
    if (!isFinite(Z)) { Z = 1.0; zNote = '<br>※ 圧縮係数 Z 未入力のため、理想気体（Z = 1.0）として計算しました。'; }
    if (!positive(QN)) return setError('体積流量を正の数値で入力してください。');
    if (!positive(M)) return setError('分子量を正の数値で入力してください。');
    if (!isFinite(T1)) return setError('入口温度を入力してください。');
    if (T1 <= 0) return setError('入口温度の絶対温度が 0 K 以下になっています。単位（℃ / K）と値を確認してください。');
    if (![P1, P2].every(positive)) return setError('入口・出口圧力を入力してください。');
    if (P1 <= P2) return setError('入口圧 P1 は出口圧 P2 より大きくしてください。');
    if (!(k > 1 && k <= 2)) return setError('比熱比 k は 1 < k ≦ 2 の範囲で入力してください（空気=1.4、メタン=1.31、単原子ガス=1.67 など）。');
    if (!positive(Z)) return setError('圧縮係数 Z は正の数値で入力してください（未入力の場合は 1.0 として計算します）。');

    const Mkg = M / 1000;
    const W = QN * M / 22.414;                 // kg/h（標準状態のモル体積換算）
    const rho1 = (P1 * Mkg) / (Z * 8.314 * T1);  // kg/m³（入口条件）
    const x = (P1 - P2) / P1;
    const Fg = k / 1.40;
    const xT = 0.70;  // assumed (グローブ弁標準)
    const xCritical = Fg * xT;
    const xUse = Math.min(x, xCritical);
    const Y = 1 - xUse / (3 * Fg * xT);
    const P1_bar = P1 / 1e5;
    const N6 = 27.3;   // Cv, W[kg/h], P1[bar], rho1[kg/m3]
    const Cv = W / (N6 * Y * Math.sqrt(xUse * P1_bar * rho1));
    const Kv = 0.865 * Cv;
    const choked = x >= xCritical;

    renderResult({
      title: '必要 Cv（ガス）',
      bigValue: `${fmtNum(Cv)} <span class="unit">［-］</span>`,
      rows: [
        ['Cv', `${fmtNum(Cv)}`],
        ['Kv', `${fmtNum(Kv)}`],
        ['質量流量換算 W', `${fmtNum(W)} kg/h`],
        ['入口密度 ρ₁', `${fmtNum(rho1)} kg/m³`],
        ['圧力比 x = ΔP/P₁', `${fmtNum(x)}`],
        ['チョーク臨界 x_c = Fγ·x_T', `${fmtNum(xCritical)}  (x_T=0.70 仮定)`],
        ['チョーク状態', choked ? 'チョーク（x_use を x_c に制限）' : 'サブクリティカル'],
        ['膨張係数 Y', `${fmtNum(Y)}`],
        ['P₁', `${fmtNum(P1 / 1000)} kPaA  /  ${fmtNum(P1_bar)} bar`],
        ['P₂', `${fmtNum(P2 / 1000)} kPaA`],
        ['T₁', `${fmtNum(T1)} K`],
        ['M, Z', `${fmtNum(M)} g/mol, Z=${fmtNum(Z)}`],
        ['Fγ = k/1.40', `${fmtNum(Fg)}`],
      ],
      meta: '※ Nm³/h を質量流量に換算し、IEC 60534-2-1 質量流量式（N6=27.3, bar基準）で算出。x_T はバルブ固有の係数で、本ツールは保守的に 0.70（標準グローブ弁）を仮定。バタフライ・ボール弁は別途確認してください。' + zNote,
    });
  }

  // Steam: IEC 60534-2-1 mass form using ρ1 from v1
  function calcSteam() {
    const W = wToKgh(val('Ws'), unitOf('Ws'));
    const P1 = presToPaAbs(val('P1s'), unitOf('P1s'));
    const P2 = presToPaAbs(val('P2s'), unitOf('P2s'));
    const v1 = val('v1s');
    const k = val('ks');
    if (!positive(W)) return setError('質量流量を正の数値で入力してください。');
    if (![P1, P2].every(positive)) return setError('入口・出口圧力を入力してください。');
    if (P1 <= P2) return setError('入口圧 P1 は出口圧 P2 より大きくしてください。');
    if (!positive(v1)) return setError('蒸気の比体積を入力してください。');
    if (!(k > 1 && k <= 2)) return setError('比熱比 k は 1 < k ≦ 2 の範囲で入力してください（飽和蒸気=1.30、過熱蒸気=1.32〜1.33 など）。');

    const rho1 = 1 / v1;
    const x = (P1 - P2) / P1;
    const Fg = k / 1.40;
    const xT = 0.70;
    const xCritical = Fg * xT;
    const xUse = Math.min(x, xCritical);
    const Y = 1 - xUse / (3 * Fg * xT);
    const P1_bar = P1 / 1e5;
    const N6 = 27.3;   // W[kg/h], P1[bar], rho1[kg/m3], Cv
    const Cv = W / (N6 * Y * Math.sqrt(xUse * P1_bar * rho1));
    const Kv = 0.865 * Cv;
    const choked = x >= xCritical;

    renderResult({
      title: '必要 Cv（蒸気）',
      bigValue: `${fmtNum(Cv)} <span class="unit">［-］</span>`,
      rows: [
        ['Cv', `${fmtNum(Cv)}`],
        ['Kv', `${fmtNum(Kv)}`],
        ['圧力比 x', `${fmtNum(x)}`],
        ['チョーク臨界 x_c', `${fmtNum(xCritical)}`],
        ['チョーク状態', choked ? 'チョーク' : 'サブクリティカル'],
        ['膨張係数 Y', `${fmtNum(Y)}`],
        ['入口密度 ρ₁ = 1/v₁', `${fmtNum(rho1)} kg/m³`],
        ['P₁', `${fmtNum(P1 / 1000)} kPaA  /  ${fmtNum(P1_bar)} bar`],
        ['P₂', `${fmtNum(P2 / 1000)} kPaA`],
        ['W', `${fmtNum(W)} kg/h`],
        ['Fγ', `${fmtNum(Fg)}`],
      ],
      meta: '※ x_T = 0.70 仮定。蒸気表から正しい v₁ を入れてください。湿り蒸気は乾き度補正が必要。',
    });
  }

  function renderResult(opts) {
    $('result-area').innerHTML = `
      <div class="result-target">${opts.title}</div>
      <div class="result-value-big">${opts.bigValue}</div>
      <table class="unit-table"><tbody>
        ${opts.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}
      </tbody></table>
      <div class="result-meta">${opts.meta || ''}</div>
    `;
  }

  function calculate() {
    clearError();
    if (mode === 'liquid') calcLiquid();
    else if (mode === 'gas') calcGas();
    else calcSteam();
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next);
    });
    clearError();
    clearResult();
  }

  function reset() {
    ['Ql', 'Gl', 'P1l', 'P2l', 'Pvl', 'FL', 'Qg', 'Mg', 'T1g', 'P1g', 'P2g', 'kg', 'Zg', 'Ws', 'P1s', 'P2s', 'v1s', 'ks'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
