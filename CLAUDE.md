# ChemEngCalcSite 作業ルール

化学工学計算ツールサイト。公開URL: https://tools.chem-fac.com（Publicリポ・`main` 直接pushでGitHub Pages配信）

- 公開リポにActionsを置かない方針（バッチ・シークレットは ChemEngCalcSiteBuilder 側）。`_dev/` は `.gitignore` 除外
- 基本無料公開。有料コンテンツはnoteで販売

## ⚠️ 公開ゲート（2026-07-19の教訓: 4ツールをrevertで巻き戻し）

- 「公開したい」は**準備指示**・「公開して」だけがゴーサイン。導線統合とpushは合図後
- **未公開ドラフトを多数含む（untracked）。一括push厳禁・`git add -A` 禁止・公開は検証済みのものを1本ずつ**
- untrackedドラフトがpull rebaseを阻む時はhash比較→退避

## 公開前チェック

- ツール監査の基準: `_dev\validation_checklist.md`（監査はサブエージェント `calc-tool-auditor`）
- 公開前に `python _dev\build_tools_index.py --expect tools/<category>/<tool>/` を実行し、`公開整合性チェック: OK` を確認する（6導線・更新履歴・カテゴリ状態・内部リンクを一括検査）
- 注釈の様式: 黄色枠 `.caution-text` は新規追加しない（内容は箇条書き/段落へ。安全数値基準は消さない）
