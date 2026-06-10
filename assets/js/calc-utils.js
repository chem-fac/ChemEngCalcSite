/**
 * 化学工学計算支援ツール — Calc Utils (全ツール共通)
 * =====================================================
 * 1. パーマリンク : 計算時に入力値をURLクエリへ反映。URLを開くと条件を復元して自動計算
 * 2. 結果コピー   : 入力条件＋計算結果を計算書テキストとしてクリップボードへコピー
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
      copyBtn.addEventListener('click', function () { copyText(buildReport(), copyBtn); });
      var linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'btn btn-ghost btn-small';
      linkBtn.textContent = '計算条件のリンクをコピー';
      linkBtn.addEventListener('click', function () { copyText(location.href, linkBtn); });
      actions.appendChild(copyBtn);
      actions.appendChild(linkBtn);
      resultArea.insertAdjacentElement('afterend', actions);
    }

    function updateResultActions() {
      if (!resultArea) return;
      ensureActions();
      var hasResult = resultArea.textContent.trim() !== '' && !resultArea.querySelector('.placeholder');
      actions.style.display = hasResult ? 'flex' : 'none';
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
      lines.push('■ ' + (titleEl ? titleEl.textContent.trim() : document.title));
      lines.push(location.href);
      lines.push('');
      var tab = root.querySelector('.mode-tab.active');
      if (tab) lines.push('計算モード: ' + tab.textContent.trim());
      lines.push('【入力】');
      root.querySelectorAll('.input-row').forEach(function (row) {
        if (row.offsetParent === null) return; // 非表示の行（別モード用）は除外
        var label = row.querySelector('label');
        var name = label ? label.textContent.trim().replace(/\s+/g, ' ') : '';
        var inputs = Array.prototype.slice.call(row.querySelectorAll('input[id]'))
          .filter(function (i) { return i.type !== 'checkbox' && i.type !== 'radio' && i.value !== ''; });
        var select = row.querySelector('select[id]');
        var unit = (select && select.selectedOptions[0]) ? select.selectedOptions[0].textContent.trim() : '';
        if (inputs.length > 0) {
          var vals = inputs.map(function (i) { return i.value; }).join(' / ');
          lines.push((name || inputs[0].id) + ': ' + vals + (unit ? ' ' + unit : ''));
        } else if (select && name) {
          lines.push(name + ': ' + unit);
        }
      });
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

    function setupExampleButton() {
      var btnRow = root.querySelector('.btn-row');
      if (!btnRow) return;
      var hasExample = fields().some(function (el) {
        return el.tagName === 'INPUT' && EX_RE.test(el.placeholder || '');
      });
      if (!hasExample) return;
      var ex = document.createElement('button');
      ex.type = 'button';
      ex.className = 'btn btn-ghost';
      ex.id = 'example-btn';
      ex.textContent = '計算例を入力';
      btnRow.appendChild(ex);
      ex.addEventListener('click', function () {
        fields().forEach(function (el) {
          if (el.tagName !== 'INPUT' || el.offsetParent === null) return;
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

    // 計算時：単位・モードの保存＋URL更新＋コピー導線の表示
    calcBtn.addEventListener('click', function () {
      savePrefs();
      updateUrl();
      updateResultActions();
    });

    // 単位・モードの変更時も記憶（計算前に離脱しても単位設定が残るように）
    root.addEventListener('change', function (e) {
      if (e.target && e.target.tagName === 'SELECT') savePrefs();
    });
    root.querySelectorAll('.mode-tab').forEach(function (t) {
      t.addEventListener('click', savePrefs);
    });

    // リセット時：URLと結果導線をクリア（単位・モードの記憶は保持）
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        history.replaceState(null, '', location.pathname);
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
