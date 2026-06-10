/**
 * 化学工学計算支援ツール — Share Buttons
 * ========================================
 * Floating share buttons (X, note, LINE, Facebook)
 * Desktop: left sidebar, Mobile: bottom fixed bar
 */

document.addEventListener('DOMContentLoaded', () => {
  initShareButtons();
  initDensityPlaceholders();
  disableNumberInputWheel();
});

// マウスホイールで数値入力欄(type="number")の値が変わるのを防ぐ（全ページ共通）
function disableNumberInputWheel() {
  document.addEventListener('wheel', (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement && el.type === 'number' && el === document.activeElement) {
      e.preventDefault(); // ホイールによる値変更を阻止
      el.blur();          // フォーカスを外し、以降はページスクロールを通常どおりにする
    }
  }, { passive: false });
}

function initDensityPlaceholders() {
  const rho = document.getElementById('rho');
  const unit = document.getElementById('rho_unit');
  if (!rho || !unit) return;

  const update = () => {
    rho.placeholder = unit.value === 'gcm3' ? '例：1.0' : '例：1000';
  };

  unit.addEventListener('change', update);
  update();
}

// クリック時点のURL（計算条件のクエリ付き）でシェアURLを組み立てる
function buildShareUrl(type) {
  const u = encodeURIComponent(window.location.href);
  const t = encodeURIComponent(document.title);
  switch (type) {
    case 'x':        return `https://x.com/intent/tweet?url=${u}&text=${t}&hashtags=化学工学&via=chem_fac`;
    case 'note':     return `https://note.com/intent/post?url=${u}`;
    case 'line':     return `https://social-plugins.line.me/lineit/share?url=${u}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  }
  return '#';
}

function initShareButtons() {
  // Determine base path for images
  // Works for both root (index.html) and sub-pages (tools/fluid/reynolds/)
  const scripts = document.querySelectorAll('script[src*="share.js"]');
  let basePath = 'assets/img/';
  if (scripts.length > 0) {
    const src = scripts[0].getAttribute('src');
    basePath = src.replace('js/share.js', 'img/');
  }

  const shareContainer = document.createElement('div');
  shareContainer.className = 'share-buttons';
  shareContainer.id = 'share-buttons';

  shareContainer.innerHTML = `
    <span class="share-buttons__label">Share</span>
    <a href="#" data-share="x"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--x" data-tooltip="Xでシェア" aria-label="Xでシェア">
      <img src="${basePath}x_logo.png" alt="X">
    </a>
    <a href="#" data-share="note"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--note" data-tooltip="noteでシェア" aria-label="noteでシェア">
      <img src="${basePath}note_n.png" alt="note">
    </a>
    <a href="#" data-share="line"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--line" data-tooltip="LINEでシェア" aria-label="LINEでシェア">
      <img src="${basePath}LINE_icon.png" alt="LINE">
    </a>
    <a href="#" data-share="facebook"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--facebook" data-tooltip="Facebookでシェア" aria-label="Facebookでシェア">
      <img src="${basePath}Facebook_icon.png" alt="Facebook">
    </a>
  `;

  // 初期hrefを設定しつつ、クリック時に最新URL（計算条件のクエリ付き）で上書き
  shareContainer.querySelectorAll('a[data-share]').forEach((a) => {
    a.href = buildShareUrl(a.dataset.share);
    a.addEventListener('click', () => { a.href = buildShareUrl(a.dataset.share); });
  });

  document.body.appendChild(shareContainer);

  // Show/hide based on scroll position
  const showAfter = 300;
  const onScroll = () => {
    shareContainer.classList.toggle('visible', window.scrollY > showAfter);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
