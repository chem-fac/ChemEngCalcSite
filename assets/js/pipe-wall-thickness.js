(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // 呼び径（A）→ [B 呼び, 外径 mm]。JIS G 3454・G 3459・G 3452 で共通
  const SIZES = {
    6: ['1/8', 10.5],
    8: ['1/4', 13.8],
    10: ['3/8', 17.3],
    15: ['1/2', 21.7],
    20: ['3/4', 27.2],
    25: ['1', 34.0],
    32: ['1 1/4', 42.7],
    40: ['1 1/2', 48.6],
    50: ['2', 60.5],
    65: ['2 1/2', 76.3],
    80: ['3', 89.1],
    90: ['3 1/2', 101.6],
    100: ['4', 114.3],
    125: ['5', 139.8],
    150: ['6', 165.2],
    175: ['7', 190.7],
    200: ['8', 216.3],
    225: ['9', 241.8],
    250: ['10', 267.4],
    300: ['12', 318.5],
    350: ['14', 355.6],
    400: ['16', 406.4],
    450: ['18', 457.2],
    500: ['20', 508.0],
    550: ['22', 558.8],
    600: ['24', 609.6],
    650: ['26', 660.4],
  };
  // JIS G 3454（STPG）の呼び厚さ mm：Sch10, 20, 30, 40, 60, 80
  const STPG = {
    10: [null, null, null, 2.3, 2.8, 3.2],
    15: [null, null, null, 2.8, 3.2, 3.7],
    20: [null, null, null, 2.9, 3.4, 3.9],
    25: [null, null, null, 3.4, 3.9, 4.5],
    32: [null, null, null, 3.6, 4.5, 4.9],
    40: [null, null, null, 3.7, 4.5, 5.1],
    50: [null, 3.2, null, 3.9, 4.9, 5.5],
    65: [null, 4.5, null, 5.2, 6.0, 7.0],
    80: [null, 4.5, null, 5.5, 6.6, 7.6],
    90: [null, 4.5, null, 5.7, 7.0, 8.1],
    100: [null, 4.9, null, 6.0, 7.1, 8.6],
    125: [null, 5.1, null, 6.6, 8.1, 9.5],
    150: [null, 5.5, null, 7.1, 9.3, 11.0],
    200: [null, 6.4, 7.0, 8.2, 10.3, 12.7],
    250: [null, 6.4, 7.8, 9.3, 12.7, 15.1],
    300: [null, 6.4, 8.4, 10.3, 14.3, 17.4],
    350: [6.4, 7.9, 9.5, 11.1, 15.1, 19.0],
    400: [6.4, 7.9, 9.5, 12.7, 16.7, 21.4],
    450: [6.4, 7.9, 11.1, 14.3, 19.0, 23.8],
    500: [6.4, 9.5, 12.7, 15.1, 20.6, 26.2],
    550: [6.4, 9.5, 12.7, 15.9, null, null],
    600: [6.4, 9.5, 14.3, null, null, null],
  };
  // JIS G 3459 表7（配管用ステンレス鋼鋼管）の呼び厚さ mm：Sch5S, 10S, 20S, 40, 80, 120, 160
  const SUS = {
    6: [1.0, 1.2, 1.5, 1.7, 2.4, null, null],
    8: [1.2, 1.65, 2.0, 2.2, 3.0, null, null],
    10: [1.2, 1.65, 2.0, 2.3, 3.2, null, null],
    15: [1.65, 2.1, 2.5, 2.8, 3.7, null, 4.7],
    20: [1.65, 2.1, 2.5, 2.9, 3.9, null, 5.5],
    25: [1.65, 2.8, 3.0, 3.4, 4.5, null, 6.4],
    32: [1.65, 2.8, 3.0, 3.6, 4.9, null, 6.4],
    40: [1.65, 2.8, 3.0, 3.7, 5.1, null, 7.1],
    50: [1.65, 2.8, 3.5, 3.9, 5.5, null, 8.7],
    65: [2.1, 3.0, 3.5, 5.2, 7.0, null, 9.5],
    80: [2.1, 3.0, 4.0, 5.5, 7.6, null, 11.1],
    90: [2.1, 3.0, 4.0, 5.7, 8.1, null, 12.7],
    100: [2.1, 3.0, 4.0, 6.0, 8.6, 11.1, 13.5],
    125: [2.8, 3.4, 5.0, 6.6, 9.5, 12.7, 15.9],
    150: [2.8, 3.4, 5.0, 7.1, 11.0, 14.3, 18.2],
    200: [2.8, 4.0, 6.5, 8.2, 12.7, 18.2, 23.0],
    250: [3.4, 4.0, 6.5, 9.3, 15.1, 21.4, 28.6],
    300: [4.0, 4.5, 6.5, 10.3, 17.4, 25.4, 33.3],
    350: [null, null, null, 11.1, 19.0, 27.8, 35.7],
    400: [null, null, null, 12.7, 21.4, 30.9, 40.5],
    450: [null, null, null, 14.3, 23.8, 34.9, 45.2],
    500: [null, null, null, 15.1, 26.2, 38.1, 50.0],
    550: [null, null, null, 15.9, 28.6, 41.3, 54.0],
    600: [null, null, null, 17.5, 31.0, 46.0, 59.5],
    650: [null, null, null, 18.9, 34.0, 49.1, 64.2],
  };
  // JIS G 3452（SGP）の厚さ mm
  const SGP = {
    10: 2.3, 15: 2.8, 20: 2.8, 25: 3.2, 32: 3.5, 40: 3.5, 50: 3.8, 65: 4.2, 80: 4.2, 90: 4.2, 100: 4.5,
    125: 4.5, 150: 5.0, 175: 5.3, 200: 5.8, 225: 6.2, 250: 6.6, 300: 6.9, 350: 7.9, 400: 7.9, 450: 7.9, 500: 7.9,
  };

  // tol：管の種類を選んだときの「製造時の厚さの誤差」の初期値（安全側の製法）
  const PIPES = {
    stpg: { schs: ['10', '20', '30', '40', '60', '80'], table: STPG, tol: 'hot' },
    sus: { schs: ['5S', '10S', '20S', '40', '80', '120', '160'], table: SUS, tol: 'hot' },
    sgp: { schs: null, table: SGP, tol: 'pct' },
    custom: { schs: null, table: null, tol: 'pct' },
  };

  // 製造時の厚さの誤差（マイナス側）：呼び厚さが limit mm 未満なら mm、limit 以上なら pct %
  const TOL = {
    hot: { limit: 4, mm: 0.5, pct: 12.5, text: '4 mm 未満は 0.5 mm、4 mm 以上は 12.5%' },
    stpg_cold: { limit: 3, mm: 0.3, pct: 10, text: '3 mm 未満は 0.3 mm、3 mm 以上は 10%' },
    sus_cold: { limit: 2, mm: 0.2, pct: 10, text: '2 mm 未満は 0.2 mm、2 mm 以上は 10%' },
    pct: { limit: 0, mm: 0, pct: 12.5, text: '12.5%' },
    none: { limit: 0, mm: 0, pct: 0, text: '見込まない' },
  };

  const P_TO_MPA = { MPa: 1, kPa: 0.001, bar: 0.1, kgfcm2: 0.0980665 };

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
  function val(id) {
    const el = $(id);
    if (!el || el.value === '') return NaN;
    return parseFloat(el.value);
  }
  function positive(v) { return isFinite(v) && v > 0; }
  function nonNegative(v) { return isFinite(v) && v >= 0; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  // 誤差を引いた最小の厚さ（呼び厚さ tn から）
  function minThickness(tn, tol) {
    const r = TOL[tol];
    return tn < r.limit ? tn - r.mm : tn * (1 - r.pct / 100);
  }
  // 最小の厚さ tm を確保できる呼び厚さの下限（minThickness の逆）
  function nominalFor(tm, tol) {
    const r = TOL[tol];
    return tm < r.limit - r.mm ? tm + r.mm : tm / (1 - r.pct / 100);
  }
  // 厚さ t で耐える圧力 MPa。s は許容引張応力×溶接効率
  function allowablePressure(Do, t, s) {
    if (6 * t <= Do) return { p: 2 * s * t / (Do - 0.8 * t), thick: false };
    const k = (Do - 2 * t) / Do;
    return { p: s * (1 - k * k) / (1 + k * k), thick: true };
  }
  // 圧力 P に要る最小厚さ mm（P < s のときだけ呼ぶ）
  function requiredThickness(Do, P, s) {
    if (2.6 * P <= s) return { t: P * Do / (2 * s + 0.8 * P), thick: false };
    return { t: Do / 2 * (1 - Math.sqrt((s - P) / (s + P))), thick: true };
  }

  function schedulesOf(type, a) {
    const pipe = PIPES[type];
    if (!pipe.table || !pipe.table[a]) return [];
    if (!pipe.schs) return [{ sch: 'SGP', t: pipe.table[a] }];
    return pipe.schs.map((sch, i) => ({ sch, t: pipe.table[a][i] })).filter(r => r.t !== null);
  }
  const schLabel = (sch) => sch === 'SGP' ? 'SGP' : `Sch${sch}`;
  // 規格の厚さの書き方（6.0、1.65）のまま出す
  const fmtT = (t) => (Math.round(t * 100) % 10 !== 0 ? t.toFixed(2) : t.toFixed(1));

  let mode = 'pressure';
  const pipeType = () => $('pipe_type').value;

  function updateRows() {
    const type = pipeType();
    document.querySelectorAll('.input-row[data-show-when], .input-row[data-pipe]').forEach(row => {
      const modes = row.dataset.showWhen ? row.dataset.showWhen.split(/\s+/) : null;
      const pipes = row.dataset.pipe ? row.dataset.pipe.split(/\s+/) : null;
      row.hidden = (modes !== null && !modes.includes(mode)) || (pipes !== null && !pipes.includes(type));
    });
  }

  function fillSchedules() {
    const type = pipeType();
    if (!PIPES[type].schs) return;
    const sel = $('sch');
    const keep = sel.value;
    const list = schedulesOf(type, $('nps').value);
    sel.innerHTML = list.map(r => `<option value="${r.sch}">${schLabel(r.sch)}（${fmtT(r.t)} mm）</option>`).join('');
    if (list.some(r => r.sch === keep)) sel.value = keep;
    else if (list.some(r => r.sch === '40')) sel.value = '40';
  }

  function fillSizes() {
    const pipe = PIPES[pipeType()];
    if (!pipe.table) return;
    const sel = $('nps');
    const keep = sel.value;
    const sizes = Object.keys(pipe.table).map(Number).sort((x, y) => x - y);
    sel.innerHTML = sizes.map(a => `<option value="${a}">${a}A（${SIZES[a][0]}B）</option>`).join('');
    if (pipe.table[keep]) sel.value = keep;
    else if (pipe.table[50]) sel.value = '50';
    fillSchedules();
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === next));
    updateRows();
    clearError();
    clearResult();
  }

  function onPipeTypeChange() {
    $('tol').value = PIPES[pipeType()].tol;
    fillSizes();
    updateRows();
    clearError();
    clearResult();
  }

  function scheduleTable(a, rows, Do, s, tol, c, mark, P) {
    const head = P === undefined
      ? '<tr><th>スケジュール</th><th class="num">呼び厚さ</th><th class="num">使える圧力</th></tr>'
      : '<tr><th>スケジュール</th><th class="num">呼び厚さ</th><th class="num">使える圧力</th><th>判定</th></tr>';
    const body = rows.map(r => {
      const te = minThickness(r.t, tol) - c;
      const p = te > 0 ? allowablePressure(Do, te, s).p : NaN;
      const judge = P === undefined ? '' : `<td>${isFinite(p) && p >= P ? '足りる' : '足りない'}</td>`;
      const cls = r.sch === mark ? ' class="row-best"' : '';
      return `<tr${cls}><td>${schLabel(r.sch)}</td><td class="num">${fmtT(r.t)} mm</td><td class="num">${fmtNum(p)} MPaG</td>${judge}</tr>`;
    }).join('');
    return `<div class="result-detail-label">${a}A のスケジュールごとの使える圧力</div>
      <div class="data-table-wrap"><table class="data-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function calcPressure(type, a, Do, s, c, tol) {
    let tn;
    let sch = null;
    if (type === 'custom') {
      tn = val('t');
      if (!positive(tn)) return setError('呼び厚さを正の数値で入力してください。');
      if (2 * tn >= Do) return setError('呼び厚さは外径の半分より小さい値で入力してください。');
    } else {
      sch = PIPES[type].schs ? $('sch').value : 'SGP';
      const row = schedulesOf(type, a).find(r => r.sch === sch);
      if (!row) return setError('この呼び径にないスケジュールです。スケジュールを選び直してください。');
      tn = row.t;
    }
    const tMin = minThickness(tn, tol);
    const te = tMin - c;
    if (!(te > 0)) return setError('製造時の誤差と腐れしろを引くと厚さが残りません。腐れしろか誤差の見込みを見直してください。');
    const r = allowablePressure(Do, te, s);
    if (!isFinite(r.p) || r.p <= 0) return setError('計算結果が数値範囲を超えました。入力値の桁数を見直してください。');
    const ratio = Do / (Do - 2 * te);
    $('result-area').innerHTML = `
      <div class="result-target">使える圧力 <span class="sym">P</span></div>
      <div class="result-value-big">${fmtNum(r.p)} <span class="unit">MPaG</span></div>
      <table class="unit-table"><tbody>
        <tr><td>使える圧力</td><td class="num">${fmtNum(r.p * 1000)} kPaG</td></tr>
        <tr><td>使える圧力</td><td class="num">${fmtNum(r.p * 10)} barG</td></tr>
        <tr><td>使える圧力</td><td class="num">${fmtNum(r.p / P_TO_MPA.kgfcm2)} kgf/cm²G</td></tr>
      </tbody></table>
      <div class="result-detail-label">計算に使った厚さ</div>
      <table class="unit-table"><tbody>
        <tr><td>外径 <span class="sym">D<sub>o</sub></span></td><td class="num">${fmtNum(Do)} mm</td></tr>
        <tr><td>呼び厚さ <span class="sym">t<sub>n</sub></span></td><td class="num">${fmtNum(tn)} mm</td></tr>
        <tr><td>誤差を引いた厚さ <span class="sym">t<sub>n</sub></span> − <span class="sym">δ</span></td><td class="num">${fmtNum(tMin)} mm</td></tr>
        <tr><td>腐れしろも引いた厚さ <span class="sym">t</span></td><td class="num">${fmtNum(te)} mm</td></tr>
        <tr><td>外径と内径の比 <span class="sym">D<sub>o</sub></span>/<span class="sym">D<sub>i</sub></span></td><td class="num">${fmtNum(ratio)}</td></tr>
      </tbody></table>
      ${type === 'custom' ? '' : scheduleTable(a, schedulesOf(type, a), Do, s, tol, c, sch)}
      <div class="result-meta">
        <div>式：${r.thick ? '厚肉の式（外径と内径の比が 1.5 を超える）' : '薄肉の式（外径と内径の比が 1.5 以下）'}</div>
        <div>製造時の厚さの誤差：${TOL[tol].text}</div>
        <div>腐れしろ：${fmtNum(c)} mm</div>
      </div>
    `;
  }

  function calcThickness(type, a, Do, s, c, tol) {
    const unit = $('P_unit').value;
    const P = val('P') * P_TO_MPA[unit];
    if (!positive(P)) return setError('圧力を正の数値で入力してください。');
    if (P >= s) return setError('圧力が「許容引張応力×溶接効率」以上なので、どの厚さでも耐えられません。材料か圧力を見直してください。');
    const r = requiredThickness(Do, P, s);
    const tm = r.t + c;
    const tn = nominalFor(tm, tol);
    if (2 * tn >= Do) return setError('必要な呼び厚さが外径の半分以上になります。材料・圧力・外径を見直してください。');
    if (![r.t, tm, tn].every(isFinite)) return setError('計算結果が数値範囲を超えました。入力値の桁数を見直してください。');

    let pick = '';
    let table = '';
    let warn = '';
    if (type !== 'custom') {
      const rows = schedulesOf(type, a);
      const ok = rows.filter(row => {
        const te = minThickness(row.t, tol) - c;
        return te > 0 && allowablePressure(Do, te, s).p >= P;
      }).sort((x, y) => x.t - y.t);
      const best = ok.length ? ok[0] : null;
      pick = `<tr><td>足りる一番薄い厚さ</td><td class="num">${best ? `${schLabel(best.sch)}（${fmtT(best.t)} mm）` : '-'}</td></tr>`;
      table = scheduleTable(a, rows, Do, s, tol, c, best ? best.sch : null, P);
      if (!best) warn = `<div class="result-note result-note-warn">※ ${a}A の表にある厚さでは足りません。材料・呼び径を見直すか、表にない厚さを「外径と厚さを入力」で確かめてください。</div>`;
    }
    $('result-area').innerHTML = `
      <div class="result-target">必要な最小厚さ <span class="sym">t</span></div>
      <div class="result-value-big">${fmtNum(r.t)} <span class="unit">mm</span></div>
      <table class="unit-table"><tbody>
        <tr><td>腐れしろを足した厚さ <span class="sym">t</span> + <span class="sym">c</span></td><td class="num">${fmtNum(tm)} mm</td></tr>
        <tr><td>誤差も見込んだ呼び厚さの下限 <span class="sym">t<sub>n</sub></span></td><td class="num">${fmtNum(tn)} mm</td></tr>
        ${pick}
      </tbody></table>
      ${table}
      <div class="result-meta">
        <div>式：${r.thick ? '厚肉の式（外径と内径の比が 1.5 を超える）' : '薄肉の式（外径と内径の比が 1.5 以下）'}</div>
        <div>製造時の厚さの誤差：${TOL[tol].text}</div>
        <div>外径：${fmtNum(Do)} mm、圧力：${fmtNum(P)} MPaG</div>
        ${warn}
      </div>
    `;
  }

  function calculate() {
    clearError();
    const type = pipeType();
    const sigma = val('sigma');
    const eta = val('eta');
    const c = $('c').value === '' ? 0 : val('c');
    const tol = $('tol').value;
    if (!positive(sigma)) return setError('許容引張応力を正の数値で入力してください。');
    if (!positive(eta) || eta > 1) return setError('溶接効率は 0 より大きく 1 以下の数値で入力してください。');
    if (!nonNegative(c)) return setError('腐れしろは 0 以上の数値で入力してください。空欄なら 0 として計算します。');
    let a = null;
    let Do;
    if (type === 'custom') {
      Do = val('Do');
      if (!positive(Do)) return setError('外径を正の数値で入力してください。');
    } else {
      a = Number($('nps').value);
      if (!SIZES[a]) return setError('呼び径を選んでください。');
      Do = SIZES[a][1];
    }
    const s = sigma * eta;
    if (mode === 'pressure') return calcPressure(type, a, Do, s, c, tol);
    return calcThickness(type, a, Do, s, c, tol);
  }

  function reset() {
    ['Do', 't', 'P', 'sigma', 'eta', 'c'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    $('pipe_type').addEventListener('change', onPipeTypeChange);
    $('nps').addEventListener('change', () => { fillSchedules(); clearResult(); });
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    fillSizes();
    setMode(mode);
  });
})();
