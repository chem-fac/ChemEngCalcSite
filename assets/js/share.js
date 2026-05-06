/**
 * 化学工学計算支援ツール — Share Buttons
 * ========================================
 * Floating share buttons (X, note, LINE, Facebook)
 * Desktop: left sidebar, Mobile: bottom fixed bar
 */

document.addEventListener('DOMContentLoaded', () => {
  initShareButtons();
});

function initShareButtons() {
  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(document.title);

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
    <a href="https://x.com/intent/tweet?url=${pageUrl}&text=${pageTitle}&hashtags=化学工学&via=chem_fac"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--x" data-tooltip="Xでシェア" aria-label="Xでシェア">
      <img src="${basePath}x_logo.png" alt="X">
    </a>
    <a href="https://note.com/intent/post?url=${pageUrl}"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--note" data-tooltip="noteでシェア" aria-label="noteでシェア">
      <img src="${basePath}note_n.png" alt="note">
    </a>
    <a href="https://social-plugins.line.me/lineit/share?url=${pageUrl}"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--line" data-tooltip="LINEでシェア" aria-label="LINEでシェア">
      <img src="${basePath}LINE_icon.png" alt="LINE">
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${pageUrl}"
       target="_blank" rel="noopener noreferrer"
       class="share-btn share-btn--facebook" data-tooltip="Facebookでシェア" aria-label="Facebookでシェア">
      <img src="${basePath}Facebook_icon.png" alt="Facebook">
    </a>
  `;

  document.body.appendChild(shareContainer);

  // Show/hide based on scroll position
  const showAfter = 300;
  const onScroll = () => {
    shareContainer.classList.toggle('visible', window.scrollY > showAfter);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
