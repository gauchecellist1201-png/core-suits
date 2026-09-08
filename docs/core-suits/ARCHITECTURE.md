# Architecture

## 選定

| 層 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) + React 19 + TypeScript | CORE 既存の soma / core-anime-os と同じ。新しいものを足していない |
| スタイル | Tailwind CSS 3 | soma と同じ。外部フォントは読みに行かない（店舗の回線で崩れないため） |
| DB / Storage | Supabase（本番） / ローカル JSON（開発） | soma と同じ。差し替え口は `Store` インターフェース1枚 |
| デプロイ | Vercel（東京 hnd1） | 既存と同じ |
| 検証 | vitest + 恒久検査スクリプト | soma と同じ |
| 画像生成 | 差し替え可能（既定 Gemini） | [AI_PIPELINE.md](./AI_PIPELINE.md) |
| 文章生成 | 差し替え可能（既定 Claude Haiku 4.5） | 同上 |

**新しい依存は 4 つだけ**（next / react / @supabase/supabase-js / zod）。画像処理ライブラリも状態管理ライブラリも入れていない。

## 層

```
src/app/            画面と API（Next.js App Router）
  (app)/            ログイン必須の業務画面
  share/[token]/    お客様に見せる公開ページ（ログイン不要・期限つき）
  api/              サーバー処理。認可はすべてここ

src/components/     画面部品（クライアント）
src/lib/
  domain/           純粋なビジネスロジック（外部依存なし・全部テスト済み）
    types.ts        すべてのデータの形
    stylist.ts      相性の採点ルール ← 差別化の中心
    followups.ts    再来店の機会の見つけ方
    analytics.ts    KPI / ROAI
    plans.ts        プランと使用量の上限
    insights.ts     顧客ページの「分かっていること」
  ai/               AI との境界
    types.ts        ImageProvider / TextProvider の口
    tryOnPrompt.ts  撮影指示書 ← 差別化の中心
    pricing.ts      料金表と原価計算
    providers/      gemini.ts / anthropic.ts（増やすのはここだけ）
  db/               保管の境界
    store.ts        Store インターフェース（organizationId を必ず要求する）
    local.ts        ローカル JSON（開発・実演）
    supabase.ts     Supabase（本番）
    index.ts        どちらを使うかの判定
  auth/             パスワード・セッション・総当たり防止
  server/           サーバー専用の処理（tryon / stylist / usage / events / queries）
  util/             id・画像判定・JSON 解釈
```

### 依存の向き

```
app → server → { domain, ai, db }
components → domain（型と表示ロジックのみ）
domain は何にも依存しない
```

`domain/` が純粋なので、相性ルール・KPI・再来店判定はすべてテストで固定できている。AI が落ちてもここは動く。

## リクエストの流れ（試着生成）

```
[スタジオ画面] POST /api/tryons
      │
      ▼
withSession()            ← ログイン確認。無ければ 401
      │
      ▼
zod で入力検証            ← 型・長さ・列挙値。写真が「その顧客のもの」かも確認
      │
      ▼
assertCanGenerate()      ← 今月の回数と AI 原価の上限。超えていたらここで止める
      │
      ▼
store.getMediaBytes()    ← 顧客写真 と 生地写真（どちらもテナント確認つき）
      │
      ▼
try_ons に running で1行  ← 途中で落ちても跡が残る
      │
      ▼
ImageProvider.generateTryOn()
      │
      ▼
recordAiJob()            ← ★成功・失敗どちらでも必ず記録（原価を消さない）
      │
      ├─ 失敗 → try_ons を failed に更新 → try_on_failed を記録 → 422
      │
      ▼
store.putMedia()         ← 非公開の置き場へ
      │
      ▼
try_ons を succeeded に更新 → try_on_completed を記録 → 200
```

順序は `npm run check:cost` が固定している（上限確認が生成より後に動くと落ちる）。

## 認可の考え方

- 認可の本体は**サーバー側**。`Store` の店舗スコープ操作は `organizationId` を**引数で強制**しているので、書き忘れると型で落ちる
- RLS は二重の防御。policy を1つも作らないことで anon / authenticated からは1行も見えない
- クライアントから渡された id は必ず「自分の店舗の中で」引き直す。見つからなければ 404
- 「その写真はこの顧客のものか」「その試着はこの顧客のものか」を毎回確認する（他人の写真で生成させない）

## 画像の配り方

顧客写真は個人情報なので、静的配信も公開バケットも使わない。

```
/api/media/[id]                → ログイン済みの人。自分の店舗の画像だけ
/api/media/[id]?share=<token>  → そのリンクに含まれる「試着結果」と「生地画像」だけ
                                  （顧客の元写真は 404）
```

`cache-control: private` を付け、`X-Robots-Tag: noindex` を返す。`npm run check:photos` がこれを見張っている。

## 保管先の判定（絶対に崩さない）

```
SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY があれば → 必ず Supabase
無い かつ 本番                                    → 起動時に例外で止める
無い かつ 開発                                    → ローカル JSON
```

「見本用のローカル保管が、繋いだ後の本物を覆い隠す」事故を構造的に防ぐ。`npm run check:demo` が `getStore()` の**最初の return** が `supabaseStore` であることを確認している。

## 将来（CORE Fashion / Retail AI Sales OS へ）

商材に依存しているのは `Fabric` と `GarmentSpec` と `tryOnPrompt.ts` の3つだけ。

- `Fabric` → `Product`（素材・柄・季節・価格帯は靴でも宝飾でも同じ形）
- `GarmentSpec` → `ItemSpec`
- `tryOnPrompt` → 商材ごとの撮影指示書

`Customer` / `Purchase` / `FollowUp` / `SalesKnowledge` / `AiJob` / `Store` はそのまま使える。つまり**業種を増やすときに作り直すのは「商品の形」と「撮影指示書」だけ**になる設計にしてある。
