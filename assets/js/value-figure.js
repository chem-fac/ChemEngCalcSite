// 入力値の位置の図：入力欄を選んでいる間、図の中の同じ値の寸法線と記号を緑にする
(function () {
  'use strict';

  const groups = Array.from(document.querySelectorAll('.value-figure [data-for]'));
  if (!groups.length) return;

  const keyOf = (el) => (el && el.id ? el.id.replace(/_unit$/, '') : '');
  const show = (key) => {
    groups.forEach((g) => {
      g.classList.toggle('is-active', key !== '' && g.dataset.for.split(/\s+/).includes(key));
    });
  };

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!t.closest || !t.closest('#calculator')) return;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT') show(keyOf(t));
  });
  document.addEventListener('focusout', (e) => {
    const next = e.relatedTarget;
    if (!next || !next.closest || !next.closest('#calculator')) show('');
  });
})();
