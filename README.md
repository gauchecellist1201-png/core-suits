# CORE Suits

**仕立てる前に、似合うが見える。**
オーダースーツ店のための AI Sales OS。

お客様の写真と、その店が実際に持っている生地。この2つから完成イメージを先に見せ、接客の記録を顧客台帳に残し、数ヶ月後に「次の1着」を提案するところまでを1つにしたもの。

> バーチャル試着アプリではない。試着画像は入口であって商品ではない。
> 売っているのは **その店のデータに AI を接続したこと**。 → [COMPETITIVE_MOAT.md](docs/core-suits/COMPETITIVE_MOAT.md)

## すぐ動かす

```bash
npm install
cp .env.example .env.local     # SUITS_SESSION_SECRET と GEMINI_API_KEY を入れる
npm run seed:photos            # デモ用の架空の人物・生地の画像を作る（初回のみ・要 GEMINI_API_KEY）
npm run seed                   # 店舗1・顧客4・生地10・購入履歴を投入
npm run dev                    # http://localhost:3400
```

ログイン: `demo` / `coresuits2026`（オーナー）、`staff` / `coresuits2026`（スタッフ）

`demo-assets/` に画像がすでに入っていれば `npm run seed:photos` は不要。

### 触る順番（3分）

1. **ダッシュボード** → 「再来店の機会」に3名並んでいる
2. **顧客 → 井上 直輝** → 1画面に写真・好み・履歴・提案・次の機会
3. その画面の **AI スタイリスト** で「おすすめを出す」→ 3案が理由つきで出る（ネイビーは下がる。すでに持っているから）
4. 「この生地で試着をつくる →」 → **スタジオ**で 10〜20 秒
5. 別の生地でもう1枚 → **Look 01 / 02 を比較**
6. 「お客様へ共有」→ リンクを別のブラウザで開く（ログイン不要で見える）
7. 顧客ページで **ご成約を記録**（きっかけの試着を選ぶ）
8. **分析** → ROAI が動く

## 環境変数

| | 必須 | |
|---|---|---|
| `SUITS_SESSION_SECRET` | ● | セッション署名の鍵（24文字以上）。本番では必須 |
| `GEMINI_API_KEY` | ● | 試着生成。無いと「試着をつくる」が押せない状態で表示される |
| `ANTHROPIC_API_KEY` | | 提案の理由づけ。無くても提案は出る（ルールの要約として表示） |
| `SUITS_IMAGE_PROVIDER` | | 既定 `gemini`。1社に固定していない |
| `SUITS_IMAGE_MODEL` | | 既定 `gemini-3.1-flash-image` |
| `SUITS_USD_JPY` | | 原価の円換算。既定 155 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 本番 | 入ると保管先が自動で Supabase になる |

## コマンド

```bash
npm run dev         # 開発（http://localhost:3400）
npm run build       # 本番ビルド
npm test            # 67 件
npm run typecheck
npm run check       # 型 + テスト + 恒久検査6本（下記）
npm run seed        # デモデータ投入（--reset で作り直し）
npm run seed:photos # デモ画像の生成
```

### 恒久検査（`npm run check`）

過去に壊れたことのある性質を、壊れたら落ちる形で固定してある。**それぞれ「わざと壊して落ちること」を確認済み。**

| | 見ているもの |
|---|---|
| `check:tenant` | 店舗をまたぐ問い合わせが無いか（Supabase・ローカル両方） |
| `check:photos` | 顧客写真が公開の場所に出ていないか。共有トークンで見える範囲が限定されているか |
| `check:cost` | AI を呼んだら必ず原価が残るか。上限確認が生成より先か |
| `check:demo` | Supabase 設定時にローカル保管へ落ちないか |
| `check:fake-ai` | 生成画像に注意書きがあるか。理由の出どころを偽っていないか。動かないボタンが無いか |
| `check:guards` | 検査そのものが `npm run check` から漏れていないか |

## 本番へ

1. Supabase プロジェクトを作り、`supabase/schema.sql` を SQL エディタで実行する（**オーナー承認が必要**）
2. Vercel に環境変数を入れる（上表。`SUPABASE_*` と `SUITS_SESSION_SECRET` は必須）
3. デプロイ
4. 店舗とオーナーの行を手で1つずつ入れる（`npm run seed` は Supabase 環境では動かない）

`SUPABASE_*` が無い本番デプロイは、**ローカル保管に落ちずに起動時に止まる**（データが消えるより落ちたほうがよい）。

## ドキュメント

| | |
|---|---|
| [PRODUCT.md](docs/core-suits/PRODUCT.md) | 何を誰に売るか。店頭での流れ。価格 |
| [ARCHITECTURE.md](docs/core-suits/ARCHITECTURE.md) | 構成・層・リクエストの流れ・拡張の余地 |
| [DATABASE.md](docs/core-suits/DATABASE.md) | 16表・索引・整合性の守り方 |
| [AI_PIPELINE.md](docs/core-suits/AI_PIPELINE.md) | 撮影指示書・採点ルール・プロバイダ差し替え・原価 |
| [FABRIC_ACCURACY.md](docs/core-suits/FABRIC_ACCURACY.md) | 生地の再現度。できること・できないこと |
| [UNIT_ECONOMICS.md](docs/core-suits/UNIT_ECONOMICS.md) | 実測原価・プラン別粗利・ROAI |
| [COMPETITIVE_MOAT.md](docs/core-suits/COMPETITIVE_MOAT.md) | なぜ ChatGPT ではなく CORE Suits か（弱点も書いてある） |
| [MVP_VALIDATION.md](docs/core-suits/MVP_VALIDATION.md) | 5店舗デモの進め方と判断基準 |
| [KNOWN_LIMITATIONS.md](docs/core-suits/KNOWN_LIMITATIONS.md) | 分かっている限界 23 項目 |
| [ROADMAP.md](docs/core-suits/ROADMAP.md) | Phase 1〜8 |

## 顧客写真の扱い

個人情報として扱う。

- 公開の置き場（`public/`・公開バケット）には保存しない
- 配るのは認証付きの `/api/media/[id]` のみ。`cache-control: private`・`noindex`
- 共有リンクで見えるのは、そのリンクに含まれる**試着結果と生地画像だけ**。顧客の元写真は 404
- 共有リンクは期限つき（既定14日）
- 店舗をまたいで見えることはない（テストと恒久検査の両方で固定）
