(function () {
  const TOOLS = [
    {
      title: "レイノルズ数（配管）",
      url: "tools/fluid/reynolds/",
      category: "流動",
      keywords: ["レイノルズ", "Reynolds", "Re", "配管", "層流", "乱流", "流速", "流量", "管内径", "粘度", "動粘度", "円管"]
    }
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOOLS.filter(t => {
      const hay = (t.title + " " + t.category + " " + t.keywords.join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }

  function render(box, hits, hasQuery) {
    if (!hasQuery) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    if (hits.length === 0) {
      box.innerHTML = '<div class="search-empty">該当するツールが見つかりませんでした。</div>';
      return;
    }
    box.innerHTML = hits.map(t =>
      `<a class="search-hit" href="${escapeHtml(t.url)}">` +
        `<span class="search-hit-cat">${escapeHtml(t.category)}</span>` +
        `<span class="search-hit-title">${escapeHtml(t.title)}</span>` +
      `</a>`
    ).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("siteSearchInput");
    const box = document.getElementById("siteSearchResults");
    if (!input || !box) return;

    function update() {
      const q = input.value;
      render(box, search(q), q.trim().length > 0);
    }

    input.addEventListener("input", update);
    input.addEventListener("focus", update);

    document.addEventListener("click", (e) => {
      if (!box.contains(e.target) && e.target !== input) {
        box.hidden = true;
      }
    });

    window.__siteSearch = {
      submit() {
        const hits = search(input.value);
        if (hits.length === 1) {
          location.href = hits[0].url;
        } else {
          render(box, hits, input.value.trim().length > 0);
        }
      }
    };
  });
})();
