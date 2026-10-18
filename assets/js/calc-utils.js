/**
 * 化学工学計算支援ツール — Calc Utils (全ツール共通)
 * =====================================================
 * 1. パーマリンク : 計算時に入力値をURLクエリへ反映。URLを開くと条件を復元して自動計算
 * 2. 結果コピー   : 表示中の計算結果と、その計算をしたときの入力条件を一組で計算書テキストにしてコピー
 *                  （計算後に入力・単位・モードを変えても、コピーには計算時の条件が入る。変わったことは画面に出す）
 * 3. 計算例       : placeholder の例値（「例：〜」）を一括入力して計算
 * 4. 設定記憶     : 前回の単位選択・計算モードを localStorage に保存して次回復元
 *                  （入力値そのものはセキュリティ配慮のため保存しない。URLクエリは
 *                    ユーザーが明示的に共有・ブックマークした場合のみ使われる）
 *
 * ツールページの標準構造（.calc-card / #calc-btn / #reset-btn / #result-area /
 * .mode-tab[data-mode] / .input-row）を前提とし、構造が無いページでは何もしない。
 * 各ツールのJSより後に読み込むこと（イベント発火順を保証するため）。
 */
(function () {
  'use strict';

  var MODE_PARAM = 'cmode'; // 計算モードタブの保存キー（入力欄idとの衝突回避のため cmode）

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('.calc-card');
    var calcBtn = document.getElementById('calc-btn');
    var resetBtn = document.getElementById('reset-btn');
    var resultArea = document.getElementById('result-area');
    if (!root || !calcBtn) return;

    var storeKey = 'cect:' + location.pathname;

    // ============ 共通ヘルパー ============
    function fields() {
      return Array.prototype.slice.call(root.querySelectorAll('input[id], select[id]'))
        .filter(function (el) { return el.type !== 'button' && el.type !== 'submit'; });
    }

    function fireEvents(el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function activeMode() {
      var t = root.querySelector('.mode-tab.active');
      return (t && t.dataset.mode) ? t.dataset.mode : null;
    }

    // 現在の入力状態をプレーンなオブジェクトに
    function snapshot() {
      var data = {};
      fields().forEach(function (el) {
        if (el.id === MODE_PARAM) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) data[el.id] = '1';
        } else if (el.value !== '') {
          data[el.id] = el.value;
        }
      });
      var m = activeMode();
      if (m) data[MODE_PARAM] = m;
      return data;
    }

    // オブジェクトから入力状態を復元（モードタブ→各欄の順）
    function apply(data) {
      if (data[MODE_PARAM]) {
        var tab = null;
        root.querySelectorAll('.mode-tab').forEach(function (t) {
          if (t.dataset.mode === data[MODE_PARAM]) tab = t;
        });
        if (tab && !tab.classList.contains('active')) tab.click();
      }
      fields().forEach(function (el) {
        if (el.id === MODE_PARAM || !(el.id in data)) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = data[el.id] === '1';
        } else {
          el.value = data[el.id];
        }
        fireEvents(el);
      });
    }

    // 単位選択（select）と計算モードのみを保存対象にする。
    // 入力値（数値・テキスト）はセキュリティ配慮のため localStorage に残さない。
    function prefSnapshot() {
      var data = {};
      fields().forEach(function (el) {
        if (el.tagName === 'SELECT' && el.id !== MODE_PARAM && el.value !== '') {
          data[el.id] = el.value;
        }
      });
      var m = activeMode();
      if (m) data[MODE_PARAM] = m;
      return data;
    }

    function savePrefs() {
      try { localStorage.setItem(storeKey, JSON.stringify(prefSnapshot())); } catch (e) { /* private mode等 */ }
    }

    // 保存データのうち単位・モードだけを復元する（旧形式で入力値が残っていても無視）
    function applyPrefs(data) {
      var filtered = {};
      Object.keys(data).forEach(function (k) {
        var el = document.getElementById(k);
        if (k === MODE_PARAM || (el && el.tagName === 'SELECT')) filtered[k] = data[k];
      });
      apply(filtered);
    }

    // ============ 1. パーマリンク ============
    function updateUrl() {
      var snap = snapshot();
      var qs = new URLSearchParams(snap).toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    // ============ 2. 結果コピー ============
    var actions = null;

    function ensureActions() {
      if (actions || !resultArea) return;
      actions = document.createElement('div');
      actions.className = 'result-actions';
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-ghost btn-small';
      copyBtn.textContent = '結果をコピー';
      copyBtn.addEventListener('click', function () {
        copyText(buildReport(), copyBtn);
        // GA4利用計測: 結果が実務に持ち出された（利用の深さの指標）
        if (typeof window.gtag === 'function') window.gtag('event', 'result_copy');
      });
      var linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'btn btn-ghost btn-small';
      linkBtn.textContent = '計算条件のリンクをコピー';
      linkBtn.addEventListener('click', function () {
        copyText(lastCalc ? lastCalc.url : location.href, linkBtn);
        if (typeof window.gtag === 'function') window.gtag('event', 'link_copy');
      });
      actions.appendChild(copyBtn);
      actions.appendChild(linkBtn);
      resultArea.insertAdjacentElement('afterend', actions);
      // 計算後に入力が変わったときの注意は、結果を読む前に目に入るよう結果の上に置く
      // 読み上げ用に要素は常に置き、文は入力が変わっている間だけ入れる
      staleNote = document.createElement('p');
      staleNote.className = 'result-stale-note';
      staleNote.setAttribute('role', 'status');
      resultArea.insertAdjacentElement('beforebegin', staleNote);
    }

    // ---- 表示中の結果と、その計算をしたときの条件を一組で控える ----
    var staleNote = null;
    var STALE_TEXT = '注意：計算後に入力が変わっています。表示中の結果とコピーの内容は、前回計算したときの条件のものです。新しい条件で計算するには「' +
      calcBtn.textContent.trim() + '」を押してください。';
    var lastCalc = null; // { key: 入力欄の状態, mode: 計算モード名, inputs: 【入力】の行, url: 計算条件のリンク, html: 控えた時の結果表示 }

    function hasResult() {
      return resultArea.textContent.trim() !== '' && !resultArea.querySelector('.placeholder') &&
        !resultArea.querySelector('[data-no-copy]'); // 全表など、特定の入力の結果ではない表示はコピー対象にしない
    }

    function modeLabel() {
      var tab = root.querySelector('.mode-tab.active');
      return tab ? tab.textContent.trim() : '';
    }

    function inputLines() {
      var lines = [];
      var shown = function (el) { return el.offsetParent !== null && !el.closest('table'); }; // 隠れた欄・表の中の欄は除く
      var optText = function (s) { return (s && s.selectedOptions[0]) ? s.selectedOptions[0].textContent.trim() : ''; };
      root.querySelectorAll('.input-row').forEach(function (row) {
        if (row.offsetParent === null) return; // 非表示の行（別モード用）は除外
        var label = row.querySelector('label');
        var name = label ? label.textContent.trim().replace(/\s+/g, ' ') : '';
        var inputs = Array.prototype.slice.call(row.querySelectorAll('input[id]'))
          .filter(function (i) { return i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'hidden' && i.value !== '' && shown(i); });
        var selects = Array.prototype.filter.call(row.querySelectorAll('select[id]'), shown);
        if (inputs.length > 0) {
          var vals = inputs.map(function (i) {
            var g = i.closest('.input-group');
            var sel = (g && g.querySelector('select[id]')) || (inputs.length === 1 ? selects[0] : null);
            var unit = optText(sel);
            var sub = (inputs.length > 1 && i.getAttribute('aria-label')) ? i.getAttribute('aria-label') + ' ' : '';
            return sub + i.value + (unit ? ' ' + unit : '');
          });
          lines.push((name || inputs[0].id) + ': ' + vals.join(' / '));
        } else if (selects[0] && name) {
          lines.push(name + ': ' + optText(selects[0]));
        }
      });
      // 表の行で入れる値（成分の表など、id のない入力欄）も、見出しを付けて1行ずつ入れる
      root.querySelectorAll('table').forEach(function (tbl) {
        if ((resultArea && resultArea.contains(tbl)) || tbl.offsetParent === null) return;
        if (!tbl.querySelector('tbody input, tbody select')) return;
        var heads = Array.prototype.map.call(tbl.querySelectorAll('thead th'), function (th) {
          return th.textContent.trim().replace(/\s+/g, ' ');
        });
        tbl.querySelectorAll('tbody tr').forEach(function (tr, i) {
          var parts = [];
          Array.prototype.forEach.call(tr.children, function (cell, j) {
            var c = cell.querySelector('input, select');
            if (!c) return;
            var v = c.tagName === 'SELECT' ? ((c.value !== '' && c.selectedOptions[0]) ? c.selectedOptions[0].textContent.trim() : '') : c.value.trim();
            if (v === '') return;
            parts.push((heads[j] ? heads[j] + ' ' : '') + v);
          });
          if (parts.length) lines.push('行' + (i + 1) + ': ' + parts.join(' / '));
        });
      });
      return lines;
    }

    function permalink(snap) {
      var qs = new URLSearchParams(snap).toString();
      return location.origin + location.pathname + (qs ? '?' + qs : '');
    }

    // 変わったかどうかの判定用：結果欄の外にある全ての入力欄・選択欄（id のない表の行も含む）とモード
    function stateKey() {
      var vals = Array.prototype.slice.call(root.querySelectorAll('input, select, textarea'))
        .filter(function (el) { return !(resultArea && resultArea.contains(el)) && el.type !== 'button' && el.type !== 'submit'; })
        .map(function (el) { return (el.type === 'checkbox' || el.type === 'radio') ? (el.checked ? '1' : '0') : el.value; });
      return JSON.stringify([activeMode(), vals]);
    }

    function recordCalc() {
      var snap = snapshot();
      lastCalc = { key: stateKey(), mode: modeLabel(), inputs: inputLines(), url: permalink(snap), html: resultArea.innerHTML };
    }

    function updateResultActions() {
      if (!resultArea) return;
      ensureActions();
      var show = hasResult();
      actions.style.display = show ? 'flex' : 'none';
      var stale = !!(show && lastCalc && stateKey() !== lastCalc.key);
      if (staleNote.textContent !== (stale ? STALE_TEXT : '')) staleNote.textContent = stale ? STALE_TEXT : '';
    }

    // 結果エリアをテキスト化する。視覚専用の要素（判定ゲージ・図）は除外し、
    // 折りたたまれた「計算過程」は開いた状態で本文に含める。
    function resultAreaText() {
      var clone = resultArea.cloneNode(true);
      clone.querySelectorAll('.regime-scale, svg, canvas, [aria-hidden="true"]').forEach(function (n) {
        n.parentNode.removeChild(n);
      });
      clone.querySelectorAll('details').forEach(function (d) {
        d.setAttribute('open', '');
        var s = d.querySelector('summary');
        if (s) s.parentNode.removeChild(s);
      });
      // innerTextは描画が必要なため、画面外に一時挿入して読み取る
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      var text = clone.innerText.trim();
      document.body.removeChild(clone);
      return text;
    }

    function buildReport() {
      var titleEl = document.querySelector('.tool-hero h1');
      var lines = [];
      var rec = lastCalc || { mode: modeLabel(), inputs: inputLines(), url: location.href };
      lines.push('■ ' + (titleEl ? titleEl.textContent.trim() : document.title));
      lines.push(rec.url);
      lines.push('');
      if (rec.mode) lines.push('計算モード: ' + rec.mode);
      lines.push('【入力】');
      rec.inputs.forEach(function (l) { lines.push(l); });
      lines.push('');
      lines.push('【結果】');
      lines.push(resultAreaText());
      lines.push('');
      var d = new Date();
      var pad = function (n) { return String(n).length < 2 ? '0' + n : String(n); };
      lines.push('計算日時: ' + d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
      lines.push('化学工学計算支援ツール https://tools.chem-fac.com/');
      return lines.join('\n');
    }

    function copyText(text, btn) {
      var done = function () {
        var orig = btn.textContent;
        btn.textContent = 'コピーしました ✓';
        btn.disabled = true;
        setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1600);
      };
      var fallback = function () {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    }

    // ============ 3. 計算例を入力 ============
    var EX_RE = /^例[：:]\s*(.+)$/;
    var NUM_RE = /^-?\d*\.?\d+([eE][+-]?\d+)?$/;

    function exampleFields() {
      return Array.prototype.slice.call(root.querySelectorAll('input, select[data-example]'));
    }

    function setupExampleButton() {
      var btnRow = root.querySelector('.btn-row');
      if (!btnRow) return;
      if (document.getElementById('example-btn')) return;
      var hasExample = exampleFields().some(function (el) {
        return (el.tagName === 'INPUT' && EX_RE.test(el.placeholder || '')) ||
          (el.tagName === 'SELECT' && el.dataset.example);
      });
      if (!hasExample) return;
      var ex = document.createElement('button');
      ex.type = 'button';
      ex.className = 'btn btn-ghost';
      ex.id = 'example-btn';
      ex.textContent = '計算例を入力';
      btnRow.appendChild(ex);
      ex.addEventListener('click', function () {
        // GA4利用計測: 計算例で試した（初見ユーザーの入口の指標）
        if (typeof window.gtag === 'function') window.gtag('event', 'example_fill');
        exampleFields().forEach(function (el) {
          if (el.offsetParent === null) return;
          if (el.tagName === 'SELECT' && el.dataset.example) {
            el.value = el.dataset.example;
            fireEvents(el);
            return;
          }
          if (el.tagName !== 'INPUT') return;
          var m = (el.placeholder || '').match(EX_RE);
          if (!m) return;
          var v = m[1].trim();
          if (el.type === 'number' && !NUM_RE.test(v)) return; // 「例：1.0×10⁻³」等は流し込まない
          el.value = v;
          fireEvents(el);
        });
        calcBtn.click();
      });
    }

    // ============ 4. 入力記憶 ＋ 初期化 ============
    setupExampleButton();

    // 計算時：単位・モードの保存＋URL更新＋計算条件の控え＋コピー導線の表示
    // 計算が通ったとき（エラー表示が出ていないとき）に条件を控える。エラーが出ていても結果表示が変わった
    // ときは控え直す。入力エラーで前の結果が残る場合に、新しい入力と前の結果を組にしないため
    calcBtn.addEventListener('click', function () {
      savePrefs();
      updateUrl();
      var errEl = document.getElementById('error');
      var errShown = !!(errEl && errEl.offsetParent !== null && errEl.textContent.trim() !== '');
      if (resultArea && hasResult() && (!errShown || !lastCalc || resultArea.innerHTML !== lastCalc.html)) recordCalc();
      updateResultActions();
      // GA4利用計測: どのツールで計算が実行されたか（ツールはページパスで識別）
      if (typeof window.gtag === 'function') window.gtag('event', 'calculate');
    });

    // 単位・モードの変更時も記憶（計算前に離脱しても単位設定が残るように）
    root.addEventListener('change', function (e) {
      if (e.target && e.target.tagName === 'SELECT') savePrefs();
    });
    root.querySelectorAll('.mode-tab').forEach(function (t) {
      t.addEventListener('click', savePrefs);
    });

    // ツールが「計算する」ボタンを通さずに計算し直した場合（Enter キーなど）も、その時の条件を控える。
    // そのキー操作の間に結果表示が変わったときだけ（数式の描画やグラフの描き直しでは控え直さない）
    var htmlBeforeKey = null, clickedDuringKey = false;
    root.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (e.key !== 'Enter' || !resultArea || (tag !== 'INPUT' && tag !== 'SELECT') || resultArea.contains(e.target)) return;
      htmlBeforeKey = resultArea.innerHTML;
      clickedDuringKey = false;
    }, true);
    calcBtn.addEventListener('click', function () { clickedDuringKey = true; });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || htmlBeforeKey === null) return;
      var changed = resultArea.innerHTML !== htmlBeforeKey;
      htmlBeforeKey = null;
      if (!changed || clickedDuringKey) return;
      var errEl = document.getElementById('error');
      var errShown = !!(errEl && errEl.offsetParent !== null && errEl.textContent.trim() !== '');
      if (!hasResult() || errShown) { updateResultActions(); return; }
      savePrefs();
      updateUrl();
      recordCalc();
      updateResultActions();
    });

    // 計算後に入力・単位・モードが変わったら、その旨を出す（元の条件に戻れば消える）
    root.addEventListener('click', function () { if (actions) updateResultActions(); }); // 例値ボタン等、イベントなしで値を書き換える操作
    root.addEventListener('input', function () { if (actions) updateResultActions(); });
    root.addEventListener('change', function () { if (actions) updateResultActions(); });
    root.querySelectorAll('.mode-tab').forEach(function (t) {
      t.addEventListener('click', function () { if (actions) updateResultActions(); });
    });
    // 結果表示が計算以外で変わったとき（モード切替で空になる、全表を出す等）もコピー導線を合わせる
    if (resultArea && window.MutationObserver) {
      new MutationObserver(function () { if (actions) updateResultActions(); })
        .observe(resultArea, { childList: true, subtree: true, characterData: true });
    }

    // リセット時：URLと結果導線をクリア（単位・モードの記憶は保持）
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        history.replaceState(null, '', location.pathname);
        lastCalc = null;
        if (actions) actions.style.display = 'none';
      });
    }

    // 読み込み時：URLクエリ > localStorage の優先順で復元
    var params = new URLSearchParams(location.search);
    var keys = Array.from(params.keys());
    if (keys.length > 0) {
      var data = {};
      params.forEach(function (v, k) { data[k] = v; });
      apply(data);
      var hasInput = keys.some(function (k) { return k !== MODE_PARAM; });
      if (hasInput) calcBtn.click(); // 共有されたURLなら自動計算して結果まで表示
    } else {
      try {
        var saved = JSON.parse(localStorage.getItem(storeKey));
        if (saved && typeof saved === 'object') applyPrefs(saved);
      } catch (e) { /* noop */ }
    }
  });
})();
