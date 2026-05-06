// 参考資料カード（.reference-card[data-asin]）にAmazon商品情報を差し込む。
// 画像URLは Creators API 経由で 12時間ごとに更新される
// /assets/data/references.json から読み出す（自サーバーには画像本体は保存しない）。
(function () {
  var cards = document.querySelectorAll('.reference-card[data-asin]');
  if (!cards.length) return;

  fetch('/assets/data/references.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.items) return;
      cards.forEach(function (card) {
        var asin = card.getAttribute('data-asin');
        var info = data.items[asin];
        if (!info) return;

        var slot = card.querySelector('.ref-image');
        if (slot && info.image_url && !slot.querySelector('img')) {
          var img = document.createElement('img');
          img.src = info.image_url;
          img.alt = info.title || '';
          img.loading = 'lazy';
          if (info.image_width)  img.width  = info.image_width;
          if (info.image_height) img.height = info.image_height;
          slot.appendChild(img);
          card.classList.add('has-image');
        }
      });
    })
    .catch(function () { /* fallback: テキストのみ表示のまま */ });
})();
