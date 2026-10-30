# Bisket

独自素材と独自名称で作るブラウザー型の放置生産ゲーム。Cookie Clicker v2.058のメカニクスを資料と照合し、動作する単位で実装しています。全機能の再現は未完了です。

## ダウンロード

- [ゲーム単一HTML版](https://github.com/haruto-AIlab/Bisketcliker/raw/refs/heads/main/downloads/bisket.html)
- [ソース・仕様資料一式ZIP](https://github.com/haruto-AIlab/Bisketcliker/raw/refs/heads/main/downloads/bisket-source.zip)

Safariではリンクを長押し、または右クリックしてリンク先のファイルをダウンロードできます。HTML版はCSSとJavaScriptを内蔵しています。Safari実機での検証は未実施です。iPhone/iPadのファイルアプリではHTMLがプレビュー表示になる場合があります。

## 起動・検証

Node.js 22以上。

```sh
npm ci
npm start
npm test
```

ポートは3000。`PORT=3100 npm start` で変更できます。ブラウザーテストは別途起動したサーバーと既存Chromiumを使用します。

```sh
BASE_URL=http://127.0.0.1:3100 CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

実行時は外部パッケージや外部画像・フォント・音声を要求しません。`index.html` と `src/` は静的ホスティングも可能。chatgptsitesへの配置・公開は未実施です。

## GitHub Pages

Settings → Pages で `main` ブランチのルートを指定して配信できます。プロジェクトURLは `https://haruto-ailab.github.io/Bisketcliker/` です。CSSとJavaScriptは相対パスで読み込むため、リポジトリ名のサブパスでも動きます。

`npm run test:pages` は同じサブパスでCSSの適用・モジュール読み込み・ゲーム操作を検証します。

## 第1段階

20施設、基本強化300件、施設保有実績298件、価格計算、部分まとめ買い、売却、基本CpS/CpC、4種の倍率バフをエンジンへ実装。画面は施設・強化・記録を切り替えられます。バフのランダム出現は未実装です。

10秒ごとにブラウザーへ自動保存し、JSON書き出し/読み込みができます。v1の残高と施設は移行し、元キーは残します。v1の仮バフは移行しません。天界解禁前のオフライン生産は0で、以前の仮の8時間補償は撤去しました。

## 構成と仕様

- `src/engine.js`: DOMに依存しない状態・購入・生産・保存検証。
- `src/app.js`: UI、入力、ブラウザー保存。表示名とCSS図形は独自。
- `src/calculations.js`: 後続段階に使う個別数式。全システムの実装を意味しません。
- `spec/core.v2.058.json`: 20施設、300基本強化、298保有実績、出典位置。
- `spec/mechanics.v2.058.json`: 計算順序・丸め・上限・確率式と、それぞれの実装範囲。
- `spec/minigames.v2.058.json`: 34植物/9呪文/11精霊/18商品の部分メタデータ。未確定の効果/遷移はnull。
- `spec/declaration-inventory.json`: 宣言箇所の調査台帳。実行時レジストリや全効果データではありません。
- `spec/sources.json`, `spec/schema.ts`: 固定出典とデータ型。
- [仕様分析と段階計画](docs/spec-analysis.md)、[照合記録](docs/verification.md)、[未実装・未検証台帳](spec/coverage.json)。

公式サイトへこの環境からアクセスできず、固定コミットの非公式ソースミラーと照合しています。公式実機一致や完全再現はまだ主張できません。原作のコード、画像、音声、文章、ロゴは配布しません。
