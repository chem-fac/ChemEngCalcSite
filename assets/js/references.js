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

        // API成功時はCreators API応答のリンクを使い、API経由の成果として識別可能にする。
        // API停止時のfallback JSONでは、YAML由来の既存アソシエイトリンクが入る。
        if (info.affiliate_url) {
          card.href = info.affiliate_url;
        }

        var slot = card.querySelector('.ref-image');
        if (!slot || slot.firstElementChild) return;
        if (info.image_url) {
          var img = document.createElement('img');
          img.src = info.image_url;
          img.alt = info.title || '';
          img.loading = 'lazy';
          if (info.image_width)  img.width  = info.image_width;
          if (info.image_height) img.height = info.image_height;
          slot.appendChild(img);
          card.classList.add('has-image');
        } else {
          // API障害中（fallback）は書影の代わりに自前のプレースホルダ表紙を出す。
          // Amazon由来の画像URLは24hを超えて使えないため、外部画像は一切使わない。
          // タイトル・著者・出版社を配した学術書風のデザインで、テキストだけの
          // カードより「書籍」であることが伝わるようにする。
          var titleEl = card.querySelector('.ref-title');
          var title = info.title || (titleEl ? titleEl.textContent : '');
          // fallback_meta は「著者 / 出版社」形式。訳者を挟んで区切りが複数ある
          // 場合（例: 著者 / 訳者 / 出版社）は、最後を出版社・残りを著者行にする。
          var meta = info.fallback_meta || '';
          var sep = meta.lastIndexOf(' / ');
          var author = sep >= 0 ? meta.slice(0, sep) : meta;
          var publisher = sep >= 0 ? meta.slice(sep + 3) : '';

          var hash = 0;
          for (var i = 0; i < asin.length; i++) {
            hash = (hash * 31 + asin.charCodeAt(i)) % 360;
          }

          var ph = document.createElement('div');
          ph.className = 'ref-cover-ph';
          ph.style.setProperty('--h', hash);

          var t = document.createElement('span');
          t.className = 'ref-cover-title';
          t.textContent = title;
          ph.appendChild(t);

          if (author) {
            var a = document.createElement('span');
            a.className = 'ref-cover-author';
            a.textContent = author;
            ph.appendChild(a);
          }
          if (publisher) {
            var p = document.createElement('span');
            p.className = 'ref-cover-pub';
            p.textContent = publisher;
            ph.appendChild(p);
          }

          slot.appendChild(ph);
          card.classList.add('has-image');
        }
      });
    })
    .catch(function () { /* fallback: テキストのみ表示のまま */ });
})();
