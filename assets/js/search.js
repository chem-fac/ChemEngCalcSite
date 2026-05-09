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
      title: "撹拌混合（カテゴリ）",
      url: "tools/mixing/",
      category: "カテゴリ",
      keywords: ["撹拌", "攪拌", "混合", "撹拌槽", "翼", "動力", "スケールアップ", "mixing", "agitation"]
    },
    {
      title: "伝熱（カテゴリ）",
      url: "tools/heat-transfer/",
      category: "カテゴリ",
      keywords: ["伝熱", "熱交換器", "加熱", "冷却", "熱伝達", "熱通過", "heat", "transfer"]
    },
    {
      title: "熱量・熱収支",
      url: "tools/heat-transfer/heat-duty/",
      category: "伝熱",
      keywords: ["熱量", "熱収支", "顕熱", "潜熱", "熱負荷", "加熱", "冷却", "比熱", "蒸発", "凝縮", "heat duty", "energy balance"]
    },
    {
      title: "LMTD・伝熱面積",
      url: "tools/heat-transfer/lmtd-area/",
      category: "伝熱",
      keywords: ["LMTD", "対数平均温度差", "伝熱面積", "熱交換器", "総括伝熱係数", "補正係数", "並流", "向流", "heat exchanger", "area"]
    },
    {
      title: "総括伝熱係数 U",
      url: "tools/heat-transfer/overall-u/",
      category: "伝熱",
      keywords: ["総括伝熱係数", "U", "熱抵抗", "境膜抵抗", "汚れ係数", "ファウリング", "管壁", "overall heat transfer coefficient"]
    },
    {
      title: "管内流の熱伝達係数（ディタス・ベルターの式）",
      url: "tools/heat-transfer/tube-heat-transfer/",
      category: "伝熱",
      keywords: ["管内流", "熱伝達係数", "ディタス", "ベルター", "Dittus", "Boelter", "Re", "Pr", "Nu", "Nusselt", "乱流"]
    },
    {
      title: "冷却水・蒸気・熱媒油の必要量",
      url: "tools/heat-transfer/utility/",
      category: "伝熱",
      keywords: ["冷却水", "蒸気", "熱媒油", "必要量", "ユーティリティ", "流量", "潜熱", "比熱", "utility", "steam", "hot oil"]
    },
    {
      title: "撹拌レイノルズ数",
      url: "tools/mixing/reynolds/",
      category: "撹拌混合",
      keywords: ["撹拌レイノルズ数", "Reynolds", "Re", "層流", "遷移流", "乱流", "撹拌槽", "翼径", "回転数", "agitation", "impeller"]
    },
    {
      title: "撹拌所要動力／動力数／トルク変換",
      url: "tools/mixing/power/",
      category: "撹拌混合",
      keywords: ["撹拌所要動力", "所要動力", "動力数", "Np", "power", "トルク", "torque", "変換", "kW", "HP", "馬力", "モーター", "選定"]
    },
    {
      title: "バッフルあり撹拌所要動力",
      url: "tools/mixing/baffled-power/",
      category: "撹拌混合",
      keywords: ["バッフルあり", "邪魔板", "撹拌所要動力", "動力数", "Np", "Npmax", "Np0", "power", "バッフル幅", "バッフル枚数"]
    },
    {
      title: "吐出流量・循環流量",
      url: "tools/mixing/flow/",
      category: "撹拌混合",
      keywords: ["撹拌流量", "吐出流量", "循環流量", "動力数", "Np", "Nqd", "Nqc", "同伴流量", "循環時間", "flow", "discharge"]
    },
    {
      title: "混合時間",
      url: "tools/mixing/time/",
      category: "撹拌混合",
      keywords: ["混合時間", "mixing time", "θM", "Np", "Nqd", "バッフル", "邪魔板", "液深さ", "層流", "乱流"]
    },
    {
      title: "撹拌液面変化(バッフルなし槽の渦)",
      url: "tools/mixing/vortex/",
      category: "撹拌混合",
      keywords: ["液面変化", "渦", "vortex", "バッフルなし", "邪魔板なし", "中心", "低下", "槽壁", "上昇", "フルード", "Fr"]
    },
    {
      title: "亀井・平岡の式(バッフル無し撹拌所要動力)",
      url: "tools/mixing/kamei-hiraoka/",
      category: "撹拌混合",
      keywords: ["亀井", "平岡", "Kamei", "Hiraoka", "Np0", "Np", "動力数", "所要動力", "パドル翼", "傾斜パドル", "タービン", "プロペラ", "アンカー", "ヘリカルリボン", "大型翼", "邪魔板なし", "バッフル無し"]
    },
    {
      title: "アントワン式（蒸気圧・沸点）",
      url: "tools/distillation/antoine/",
      category: "蒸留",
      keywords: ["アントワン", "Antoine", "蒸気圧", "沸点", "純物質", "VLE", "log P", "水", "エタノール", "メタノール", "ベンゼン", "トルエン", "アセトン", "vapor pressure"]
    },
    {
      title: "アレニウスの式（反応速度定数・活性化エネルギー）",
      url: "tools/reaction/arrhenius/",
      category: "反応",
      keywords: ["アレニウス", "Arrhenius", "活性化エネルギー", "Ea", "頻度因子", "前指数因子", "反応速度定数", "速度定数", "k", "アレニウスプロット", "kinetics"]
    },
    {
      title: "回分反応器の反応時間",
      url: "tools/reaction/batch-time/",
      category: "反応",
      keywords: ["回分反応器", "反応時間", "batch", "reactor", "転化率", "0次", "1次", "2次", "速度式"]
    },
    {
      title: "CSTR設計",
      url: "tools/reaction/cstr/",
      category: "反応",
      keywords: ["CSTR", "完全混合槽", "連続槽型反応器", "反応器設計", "容積", "空間時間", "滞留時間", "転化率"]
    },
    {
      title: "PFR設計",
      url: "tools/reaction/pfr/",
      category: "反応",
      keywords: ["PFR", "管型反応器", "押し出し流れ", "プラグフロー", "反応器設計", "容積", "空間時間", "転化率"]
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
    },
    {
      title: "反応（カテゴリ）",
      url: "tools/reaction/",
      category: "カテゴリ",
      keywords: ["反応", "化学反応", "反応速度", "反応器", "反応工学", "CSTR", "PFR", "回分", "batch", "kinetics", "reactor"]
    },
    {
      title: "固液分離（カテゴリ）",
      url: "tools/separation/",
      category: "カテゴリ",
      keywords: ["固液分離", "ろ過", "濾過", "沈降", "遠心分離", "分離", "ケーク", "filtration", "settling", "centrifuge", "separation"]
    },
    {
      title: "集塵（カテゴリ）",
      url: "tools/dust-collection/",
      category: "カテゴリ",
      keywords: ["集塵", "粉塵", "ダスト", "サイクロン", "バグフィルタ", "電気集塵", "粒子", "dust", "cyclone", "bag filter", "particle"]
    },
    {
      title: "吸収（カテゴリ）",
      url: "tools/absorption/",
      category: "カテゴリ",
      keywords: ["吸収", "ガス吸収", "吸収塔", "物質移動", "ヘンリー", "Henry", "充填塔", "packed tower", "KGa", "HTU", "NTU", "absorption"]
    },
    {
      title: "吸着（カテゴリ）",
      url: "tools/adsorption/",
      category: "カテゴリ",
      keywords: ["吸着", "活性炭", "吸着塔", "破過", "等温線", "ラングミュア", "フロイントリッヒ", "adsorption", "breakthrough", "Langmuir", "Freundlich"]
    },
    {
      title: "晶析（カテゴリ）",
      url: "tools/crystallization/",
      category: "カテゴリ",
      keywords: ["晶析", "結晶化", "溶解度", "過飽和", "核発生", "粒径", "結晶", "crystallization", "crystal", "supersaturation"]
    },
    {
      title: "調湿・乾燥（カテゴリ）",
      url: "tools/moisture/",
      category: "カテゴリ",
      keywords: ["調湿", "乾燥", "湿度", "乾燥速度", "絶対湿度", "相対湿度", "湿り空気", "psychrometric", "drying", "humidity", "moisture"]
    },
    {
      title: "計装・制御（カテゴリ）",
      url: "tools/instrumentation-control/",
      category: "カテゴリ",
      keywords: ["計装", "制御", "プロセス制御", "PID", "センサ", "トランスミッタ", "調節弁", "制御弁", "流量計", "温度計", "圧力計", "instrumentation", "control", "process control"]
    }
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function normalize(s) {
    return String(s).trim().toLowerCase();
  }

  function scoreTool(t, q) {
    const title = normalize(t.title);
    const category = normalize(t.category);
    const keywords = t.keywords.map(normalize);
    if (title === q) return 100;
    if (keywords.some(k => k === q)) return 90;
    if (title.includes(q)) return 80;
    if (keywords.some(k => k.includes(q))) return 70;
    if (category.includes(q)) return 20;
    return 0;
  }

  function search(query) {
    const q = normalize(query);
    if (!q) return [];
    return TOOLS
      .map(t => ({ tool: t, score: scoreTool(t, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tool.category === "カテゴリ" && b.tool.category !== "カテゴリ") return 1;
        if (a.tool.category !== "カテゴリ" && b.tool.category === "カテゴリ") return -1;
        return 0;
      })
      .map(x => x.tool);
  }

  function findDirectHit(query, hits) {
    const q = normalize(query);
    const exactToolHits = hits.filter(t =>
      t.category !== "カテゴリ" &&
      (normalize(t.title) === q || t.keywords.some(k => normalize(k) === q))
    );
    if (exactToolHits.length === 1) return exactToolHits[0];
    if (hits.length === 1) return hits[0];
    return null;
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
        const direct = findDirectHit(input.value, hits);
        if (direct) {
          location.href = direct.url;
        } else {
          render(box, hits, input.value.trim().length > 0);
        }
      }
    };
  });
})();
