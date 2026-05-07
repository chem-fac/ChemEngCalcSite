(function () {
  const TOOLS = [
    {
      title: "レイノルズ数（配管）",
      url: "tools/fluid/reynolds/",
      category: "流動",
      keywords: ["レイノルズ", "Reynolds", "Re", "配管", "層流", "乱流", "流速", "流量", "管内径", "粘度", "動粘度", "円管"]
    },
    {
      title: "流量・流速・配管径換算",
      url: "tools/fluid/flow-conversion/",
      category: "流動",
      keywords: ["流量", "流速", "配管径", "管内径", "換算", "断面積", "単位換算", "体積流量", "配管設計", "円管"]
    },
    {
      title: "連続の式（配管断面変化）",
      url: "tools/fluid/continuity/",
      category: "流動",
      keywords: ["連続の式", "continuity", "質量保存", "断面変化", "レジューサ", "絞り", "流速変化", "非圧縮", "Au"]
    },
    {
      title: "ファニングの式・管摩擦係数（圧力損失）",
      url: "tools/fluid/fanning/",
      category: "流動",
      keywords: ["ファニング", "Fanning", "管摩擦係数", "摩擦係数", "圧力損失", "ダルシー", "Darcy", "Weisbach", "コールブルック", "Colebrook", "プラントル", "カルマン", "ブラジウス", "Blasius", "ニクラゼ", "粗さ", "粗面管", "平滑管", "ヘッド", "動圧", "圧損"]
    },
    {
      title: "流動（カテゴリ）",
      url: "tools/fluid/",
      category: "カテゴリ",
      keywords: ["流動", "流体", "配管", "圧力損失", "fluid"]
    },
    {
      title: "伝熱（カテゴリ）",
      url: "tools/heat-transfer/",
      category: "カテゴリ",
      keywords: ["伝熱", "熱交換器", "加熱", "冷却", "熱伝達", "熱通過", "heat", "transfer"]
    },
    {
      title: "撹拌混合（カテゴリ）",
      url: "tools/mixing/",
      category: "カテゴリ",
      keywords: ["撹拌", "攪拌", "混合", "撹拌槽", "翼", "動力", "スケールアップ", "mixing", "agitation"]
    },
    {
      title: "蒸留(カテゴリ)",
      url: "tools/distillation/",
      category: "カテゴリ",
      keywords: ["蒸留", "気液平衡", "還流比", "段数", "リボイラ", "コンデンサ", "distillation", "VLE", "McCabe", "Thiele", "ラウール", "アントワン"]
    },
    {
      title: "抽出（カテゴリ）",
      url: "tools/extraction/",
      category: "カテゴリ",
      keywords: ["抽出", "液液抽出", "溶媒抽出", "分配係数", "抽出段数", "物質収支", "三角線図", "向流抽出", "単抽出", "多段抽出", "extraction", "solvent", "LLE", "partition"]
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
