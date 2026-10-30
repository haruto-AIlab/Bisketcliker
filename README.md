# Bisket

独自の名称・素材で作る放置生産ゲーム。v2.058の数値メカニクスを固定資料と照合し、段階的に開発しています。**全機能の再現は未完了**です。

新規工房は1,000クッキーから開始します。贈与分は焼成実績・転生ポイントに含めず、転生時やロード時に再配布しません。既存セーブの残高は維持します。

## 遊ぶ・ダウンロード

- [GitHub Pages](https://haruto-ailab.github.io/Bisketcliker/)
- [単一HTML版](https://github.com/haruto-AIlab/Bisketcliker/raw/refs/heads/main/downloads/bisket.html)
- [ソース・仕様資料ZIP](https://github.com/haruto-AIlab/Bisketcliker/raw/refs/heads/main/downloads/bisket-source.zip)

Safariではリンクを長押し、または右クリックしてダウンロードできます。MacではHTML単体をブラウザーで開けます。iPhone/iPadのファイルアプリではプレビューになる場合があります。Safari実機での確認は未実施です。

## 現在の機能

20施設、通常強化517件、実績410条件、Milk/Kitten・Mouse・シナジー、転生、天界129節点のデータと80効果、永続スロット、研究/異変3段階、休戦/永久休戦、吸収体、自然な光/闇イベントと主要バフ/連鎖/雨、天界に応じたオフライン生産、セーブ/入出力。

未対応の前提を持つ天界節点は、効果実装済みでも取得できません。未実装効果を購入させることはしません。Sugar Lump、4ミニゲーム、竜、季節、残りの強化/実績等は未完成。[追加仕様と制限](docs/progression.md)と[機能台帳](spec/coverage.json)に具体的な範囲を記録しています。

## 起動・検証

Node.js 22以上。実行時の外部パッケージ・画像・音声・フォントは不要。配布ファイルの再生成にはPython 3を使用します。

```sh
npm ci
npm start
npm test
npm run test:pages
npm run package:downloads
```

ポート3000。`PORT=3100 npm start` で変更できます。`test:pages` は既存Chromium（`CHROMIUM_PATH`で指定可）と一時テストサーバーでプロジェクトのサブパスを再現し、基本操作と転生/研究の2シナリオを確認します。

GitHub PagesはSettings → Pagesで `main` のルートを配信します。アセット参照は相対パス。chatgptsitesには未配置です。

## ソースとデータ

- `src/engine.js`: DOMに依存しない状態、計算、時計、転生、研究、イベント、保存検証。
- `src/app.js`: 画面、入力、v3ブラウザー保存、v1/v2からの移行。
- `src/calculations.js`: 個別の数式。
- `spec/core.v2.058.json`, `spec/progression.v2.058.json`: 出典付きデータ。動的・未監査項目は推測で埋めない。
- `spec/minigames.v2.058.json`: ミニゲームの部分メタデータ。ゲームとしては未実装。
- `spec/sources.json`: 固定コミット、ハッシュ、資料の確度。
- `tools/extract-*.mjs`, `tools/reference-*.mjs`: 研究ソースの構文解析と数値照合。原作ソースは配布物に含めない。
- [分析と段階計画](docs/spec-analysis.md)、[第2段階仕様](docs/progression.md)、[照合記録](docs/verification.md)。

公式サイトは環境から取得できず、固定コミットの非公式ミラーと照合しています。公式実機との完全一致は未検証です。原作の画像・音声・文章・ロゴは使用しません。
