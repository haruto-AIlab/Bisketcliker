# 照合記録

実施日: 2026-10-30。参照版: 2.058。一次サイトへの直接アクセスは403であり、**公式実機比較は未実施**。

## 参照の固定

`spec/sources.json` に固定コミット、URL、SHA-256を記録。`tools/extract-spec.mjs` は期待ハッシュと一致したソースのみ構文解析し、数値と参照位置を抽出する。原作の文章を実行時データへ移さない。

`tools/reference-fixtures.mjs` は固定ソースのうち数値初期化、getPrice/getSumPrice、Cursor cps、mouseCps、ComputeCpsのみを研究用VMで実行し、数値出力だけを `test/fixtures/reference-core.json` に保存。VM実行は各回タイムアウト付き。アプリは参照コードを読み込まない。

## 自動照合

| 検証 | 対象 | 結果 |
|---|---|---|
| 施設初期値 | 20種の基本価格/CpS | 固定ミラー出力と厳密一致 |
| 価格 | 20種 × 所有0/1/5/25/100/600 × 購入1/10/100 = 360ケース | 表示価格/実支払とも厳密一致 |
| CursorとCpC | 8強化組合せ × 他施設0/1/100 = 24ケース | 固定ミラー出力と厳密一致 |
| 基本強化 | 19種×15段階、Cursor例外、解禁/二重購入/売却後保持 | 自作テスト成功 |
| 上限/順序 | Milk個別乗算、Cookie個別乗算、砂糖100、時短600、手袋10/20、Century100日、Luckyの+13位置 | 参照式に基づく自作テスト成功。全システムの差分照合ではない |
| 抽選の数学部分 | 5乗の出現ハザード、失敗率への指数補正 | 境界テスト成功。GC候補抽選自体は未実装 |
| バフ | 異種乗算、同種時間加算、期限またぎ生産 | 自作テスト成功。30fpsのフレーム順序は未照合 |
| 保存 | v1移行、無解禁時のオフライン0、バフ残時間、破損/重複/不正ID | 自作テスト成功 |

`npm test`: 26テスト成功。360/24等のケースはループ内で検証し、テスト件数とは分ける。

## ブラウザー操作の検証

システムのChromiumで実施。15クリック→施設購入→解禁表示、強化購入→CpC更新、売却、記録表示、保存→再読み込み、JSON書き出し、不正JSON拒否、正常JSON読み込みを確認。390px幅で横スクロールが出ず、ページJavaScriptエラーは0件。デスクトップ/モバイルのスクリーンショットも目視確認。公開サイトへの配置確認は含まない。

`npm run test:browser`: 成功。

## 再現手順

```sh
npm ci
npm test
node tools/extract-spec.mjs /path/to/research-sources
node tools/reference-fixtures.mjs /path/to/research-sources/main-2.058.js
npm test
PORT=3100 npm start
# 別のシェル。Chromiumが必要。
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

研究用ディレクトリには sources.json の固定URLから取得した main-2.058.js、index.html、minigameGarden.js、minigameGrimoire.js、minigamePantheon.js、minigameMarket.jsを配置する。ハッシュ不一致のソースで期待値を上書きしない。

## 残る照合範囲

- 公式サイト/実機の現在版と固定ミラーの同一性。
- 717通常/129天界/622通常実績という個別レジストリの全件照合。
- 全CpSレイヤー、外部値、フレーム内の更新順と30fps積算の浮動小数点差。
- 条件付き乱数の呼び出し回数、種付き乱数、抽選テーブル、状態依存分岐。
- 全ミニゲーム、転生、オフライン天界効果、季節、竜、吸収、砂糖の統合。
- Number精度限界付近の全挙動。原作同様Numberを使用するが完全互換は未検証。
- 原作形式のセーブ相互変換は対象外。独自形式のみ。
