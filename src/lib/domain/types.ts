/**
 * CORE Suits ドメイン型
 * ---------------------------------------------------------------------------
 * ★ 崩してはいけない決まり ★
 *  1. 店舗（organization）をまたぐデータは存在しない。全テーブルに organization_id を持つ。
 *  2. 顧客写真は個人情報。URL を推測できる場所に置かない（media_id 経由でのみ配る）。
 *  3. AI を呼んだ事実は必ず ai_jobs に残す（provider / model / latency / cost）。
 */

export type Id = string;
export type Iso = string; // ISO8601

/* ── 店舗・ユーザー ───────────────────────────────────────────── */

export type PlanId = "starter" | "pro" | "enterprise";

export interface Organization {
  id: Id;
  name: string;
  /** 表示用の店舗名（顧客に共有するページに出る） */
  display_name: string;
  plan: PlanId;
  /** 月間の試着生成上限。プラン既定値を上書きできる */
  monthly_tryon_limit: number;
  /** 月間の AI 原価上限（円）。超えたら生成を止める */
  monthly_cost_limit_jpy: number;
  created_at: Iso;
}

export type UserRole = "owner" | "staff";

export interface User {
  id: Id;
  organization_id: Id;
  name: string;
  login_id: string;
  /** scrypt$<salt>$<hash>。平文は絶対に置かない */
  password_hash: string;
  role: UserRole;
  created_at: Iso;
}

/* ── 顧客 ─────────────────────────────────────────────────────── */

export type BodyType = "slim" | "standard" | "athletic" | "sturdy" | "tall_slim";
export type SkinTone = "fair" | "light" | "medium" | "olive" | "dark";
export type PreferredStyle = "classic" | "modern" | "british" | "italian" | "minimal";
export type UseCase =
  | "business" | "wedding" | "executive_meeting" | "sales"
  | "formal" | "casual" | "party" | "ceremony";

export interface Customer {
  id: Id;
  organization_id: Id;
  name: string;
  name_kana?: string;
  /** 主写真の media_id（customer_photos の1件を指す） */
  primary_photo_id?: Id;
  age?: number;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  body_type?: BodyType;
  skin_tone?: SkinTone;
  preferred_style?: PreferredStyle;
  preferred_colors: string[];
  occupation?: string;
  lifestyle?: string;
  primary_use_case?: UseCase;
  notes?: string;
  /** 連絡手段。MVP では LINE 表示名の控えのみ（API連携は Phase 5） */
  line_display_name?: string;
  last_visit_at?: Iso;
  next_follow_up_at?: Iso;
  favorite_fabric_ids: string[];
  created_at: Iso;
  updated_at: Iso;
}

export interface CustomerPhoto {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  media_id: Id;
  /** 撮影条件の控え。将来の色補正で使う */
  captured_note?: string;
  created_at: Iso;
}

/* ── 生地 ─────────────────────────────────────────────────────── */

export type FabricPattern =
  | "solid" | "stripe" | "pinstripe" | "check" | "glen_check"
  | "herringbone" | "birdseye" | "windowpane";
export type Season = "spring_summer" | "autumn_winter" | "all_season";
export type PriceTier = "entry" | "standard" | "premium" | "luxury";

export interface Fabric {
  id: Id;
  organization_id: Id;
  name: string;
  brand?: string;
  collection?: string;
  product_code?: string;
  /** 主画像の media_id */
  primary_image_id?: Id;
  /** 人が読む色名（例: チャコールグレー） */
  color: string;
  /** 検索・相性判定に使う正規化色 */
  color_family: "navy" | "charcoal" | "grey" | "brown" | "black" | "blue" | "beige" | "green" | "other";
  pattern: FabricPattern;
  material?: string;
  composition?: string;
  weight_g?: number;
  season: Season;
  texture?: string;
  gloss?: "matte" | "semi" | "high";
  price_tier: PriceTier;
  price_jpy?: number;
  stock_m?: number;
  notes?: string;
  archived: boolean;
  created_at: Iso;
  updated_at: Iso;
}

export interface FabricImage {
  id: Id;
  organization_id: Id;
  fabric_id: Id;
  media_id: Id;
  /** 撮影条件（同じ照明・距離・角度で撮れているか） */
  capture_ok: boolean;
  created_at: Iso;
}

/* ── 試着 ─────────────────────────────────────────────────────── */

export type TryOnStatus = "pending" | "running" | "succeeded" | "failed";

export interface TryOn {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  fabric_id: Id;
  /** 入力に使った顧客写真 */
  source_media_id: Id;
  /** 入力に使った生地画像（必ず渡す。文字プロンプトだけで生地を作らない） */
  fabric_media_id?: Id;
  /** 生成結果 */
  result_media_id?: Id;
  status: TryOnStatus;
  error_message?: string;
  /** 比較画面での並び（Look 01, 02, …） */
  look_no: number;
  garment: GarmentSpec;
  created_by: Id;
  created_at: Iso;
  completed_at?: Iso;
}

export interface GarmentSpec {
  style: PreferredStyle;
  lapel: "notch" | "peak";
  buttons: 1 | 2 | 3;
  piece: "two_piece" | "three_piece";
  shirt: "white" | "light_blue";
  tie: "none" | "navy" | "burgundy";
  scene: UseCase;
}

/* ── 提案・購入・追客 ─────────────────────────────────────────── */

export interface Recommendation {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  /** 1件の提案 = 1つの生地 */
  fabric_id: Id;
  rank: number;
  reason: string;
  /** ルールで出した相性点（0-100）。AI は理由づけを担当する */
  score: number;
  /** どの入力から出たか（自由入力チャットの場合は質問文） */
  prompt?: string;
  source: "auto" | "chat";
  created_at: Iso;
}

export interface Purchase {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  fabric_id?: Id;
  product_name: string;
  amount_jpy: number;
  /** 試着から生まれた売上か（ROAI の分子） */
  influenced_by_try_on_id?: Id;
  purchased_at: Iso;
  created_at: Iso;
}

export type FollowUpStatus = "open" | "contacted" | "won" | "dismissed";

export interface FollowUp {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  reason: string;
  suggested_fabric_id?: Id;
  due_at: Iso;
  status: FollowUpStatus;
  /** 成約した購入（won のとき） */
  purchase_id?: Id;
  created_at: Iso;
  updated_at: Iso;
}

/** 店舗ごとの接客ノウハウ。Phase 6 で AI の材料になる。MVP は登録と参照まで */
export interface SalesKnowledge {
  id: Id;
  organization_id: Id;
  title: string;
  body: string;
  /** 効かせたい条件（空なら全体に効く） */
  applies_to: {
    use_cases?: UseCase[];
    age_min?: number;
    age_max?: number;
    price_tiers?: PriceTier[];
    color_families?: string[];
  };
  created_by: Id;
  created_at: Iso;
}

/* ── 共有 ─────────────────────────────────────────────────────── */

export interface ShareLink {
  id: Id;
  organization_id: Id;
  customer_id: Id;
  token: string;
  try_on_ids: Id[];
  expires_at: Iso;
  revoked: boolean;
  view_count: number;
  created_by: Id;
  created_at: Iso;
}

/* ── AI 原価・計測 ────────────────────────────────────────────── */

export type AiKind = "image" | "text";

export interface AiJob {
  id: Id;
  organization_id: Id;
  kind: AiKind;
  provider: string;
  model: string;
  /** 押した時点の見積り原価（円） */
  estimated_cost_jpy: number;
  /** 実測トークンから出した原価（円） */
  actual_cost_jpy: number;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
  ok: boolean;
  error_message?: string;
  /** 紐づく試着（あれば） */
  try_on_id?: Id;
  created_at: Iso;
}

export type AnalyticsEventName =
  | "customer_created" | "fabric_created"
  | "try_on_started" | "try_on_completed" | "try_on_failed"
  | "recommendation_generated" | "look_shared" | "share_viewed"
  | "fabric_favorited" | "customer_contacted"
  | "sale_created" | "repeat_opportunity_created" | "subscription_started";

export interface AnalyticsEvent {
  id: Id;
  organization_id: Id;
  name: AnalyticsEventName;
  customer_id?: Id;
  fabric_id?: Id;
  try_on_id?: Id;
  /** 金額を伴う出来事のみ（sale_created）。見込みは入れない */
  amount_jpy?: number;
  meta?: Record<string, string | number | boolean>;
  created_at: Iso;
}

export interface Subscription {
  id: Id;
  organization_id: Id;
  plan: PlanId;
  status: "trialing" | "active" | "past_due" | "canceled";
  started_at: Iso;
  current_period_end?: Iso;
  /** Stripe を繋いだら埋まる。MVP では未接続 */
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

/** アップロード済みバイナリの控え。実体は driver 側（ローカル or Supabase Storage） */
export interface Media {
  id: Id;
  organization_id: Id;
  kind: "customer_photo" | "fabric_image" | "try_on_result";
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at: Iso;
}
