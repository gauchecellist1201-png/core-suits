# Database

正本は [`supabase/schema.sql`](../../supabase/schema.sql)。型は [`src/lib/domain/types.ts`](../../src/lib/domain/types.ts)。

## 原則

1. **`organizations` 以外のすべての表が `organization_id` を持つ。** 例外はない
2. すべて外部キーで `organizations(id)` に縛る（`on delete cascade`）
3. 読み書きは必ず `organization_id` で絞る。`Store` の口が引数として強制する
4. RLS を有効にし、policy を1つも作らない → anon / authenticated からは1行も見えない
5. 顧客写真の実体は非公開バケット。DB には控え（`media`）だけ

## 表

| 表 | 役割 | 主なポイント |
|---|---|---|
| `organizations` | 店舗 | プラン・月間の試着上限・AI 原価上限 |
| `users` | スタッフ | `login_id` は全体で一意。`password_hash` は scrypt のみ |
| `customers` | 顧客 | 18項目。好みは jsonb、`primary_photo_id` が主写真 |
| `customer_photos` | 顧客写真 | 1顧客に複数枚。`media_id` で実体を指す |
| `fabrics` | 生地 | 18項目。`(organization_id, product_code)` は一意 |
| `fabric_images` | 生地写真 | `capture_ok` = 推奨条件で撮ったか |
| `try_ons` | 試着 | `fabric_media_id` が null = 生地写真を渡せていない（画面で警告） |
| `recommendations` | 提案 | 提案するたび1行。`source` = auto / chat |
| `purchases` | ご成約 | `influenced_by_try_on_id` が ROAI の分子を決める |
| `follow_ups` | 追客 | 1顧客に open は1件まで（部分一意索引） |
| `sales_knowledge` | 店舗ノウハウ | `applies_to` の条件に合ったときだけ提案の点数に効く |
| `share_links` | 共有リンク | `token` 一意・`expires_at` 必須・`revoked` で取消 |
| `ai_jobs` | AI 呼び出し | 成功も失敗も1行。provider / model / トークン / 時間 / 原価 |
| `analytics_events` | 出来事 | 13種類。金額を伴うのは `sale_created` のみ |
| `subscriptions` | 契約 | Stripe を繋いだら id が埋まる（MVP は未接続） |
| `media` | 画像の控え | kind / mime / bytes。実体は Storage |

## 索引の考え方

生地が 1,000 点、顧客が 5,000 名になったときに効く形にしてある。

```sql
fabrics_org_idx           (organization_id) where archived = false   -- 一覧
fabrics_org_family_idx    (organization_id, color_family, pattern)   -- 絞り込み
customers_org_visit_idx   (organization_id, last_visit_at desc)      -- 顧客一覧
try_ons_org_cus_idx       (organization_id, customer_id, created_at desc)
purchases_org_cus_idx     (organization_id, customer_id, purchased_at desc)
ai_jobs_org_created_idx   (organization_id, created_at desc)         -- 今月の原価
```

## 整合性を DB 側で守っている箇所

- `follow_ups_one_open_per_customer` … 同じ顧客を二重に追いかけない
- `fabrics_org_code_uniq` … 同じ店で品番が重複しない（在庫の取り違え防止）
- `amount_jpy >= 0` … マイナスの売上を作らせない
- `try_ons.fabric_id` は `on delete restrict` … 試着の履歴がある生地は消せない
- `purchases.fabric_id` は `on delete set null` … 生地を消しても売上は消えない

## ローカル保管（開発用）

`.data/db.json` に同じ形で入る。`.data/media/<organization_id>/<media_id>` に画像。
`Store` の口が同じなので、画面と API のコードは保管先を知らない。

- 書き込みは直列化（同時に足した行が消えない。テスト済み）
- 保存は一時ファイル → rename（途中で落ちても壊れた JSON を残さない）
- `.gitignore` 済み

## 本番への適用

1. Supabase プロジェクトを作る
2. `supabase/schema.sql` を SQL エディタに貼って実行する（**オーナー承認が必要**）
3. Storage に `core-suits-media`（非公開）ができていることを確認
4. Vercel に `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を入れる
5. 店舗とオーナーの1行だけを手で入れる（`npm run seed` は Supabase 環境では動かない）
