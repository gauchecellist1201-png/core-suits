-- CORE Suits データベース定義（PostgreSQL / Supabase）
-- ---------------------------------------------------------------------------
-- ★ 崩してはいけない決まり ★
--   1. organizations 以外のすべての表に organization_id を持ち、外部キーで縛る。
--   2. 認可の本体はアプリのサーバー側（必ず organization_id で絞る）。
--      RLS は二重の防御。anon キーで触られたときに何も出さないための最後の壁。
--   3. 顧客写真は Storage の非公開バケットに置く。公開URLは作らない。
--
-- 適用方法: Supabase ダッシュボードの SQL エディタにこの内容を貼り付けて実行する。
--          本番プロジェクトへの適用はオーナー承認が必要（自動実行しない）。

create extension if not exists pgcrypto;

-- ── 店舗・利用者 ───────────────────────────────────────────────
create table if not exists organizations (
  id                      text primary key,
  name                    text not null,
  display_name            text not null,
  plan                    text not null default 'starter' check (plan in ('starter','pro','enterprise')),
  monthly_tryon_limit     integer not null default 50 check (monthly_tryon_limit > 0),
  monthly_cost_limit_jpy  integer not null default 2000 check (monthly_cost_limit_jpy > 0),
  created_at              timestamptz not null default now()
);

create table if not exists users (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name            text not null,
  login_id        text not null unique,
  password_hash   text not null,          -- scrypt$salt$hash。平文は絶対に入れない
  role            text not null default 'staff' check (role in ('owner','staff')),
  created_at      timestamptz not null default now()
);
create index if not exists users_org_idx on users(organization_id);

-- ── 顧客 ───────────────────────────────────────────────────────
create table if not exists customers (
  id                 text primary key,
  organization_id    text not null references organizations(id) on delete cascade,
  name               text not null,
  name_kana          text,
  primary_photo_id   text,
  age                smallint check (age between 10 and 110),
  gender             text check (gender in ('male','female','other')),
  height_cm          smallint check (height_cm between 120 and 230),
  body_type          text check (body_type in ('slim','standard','athletic','sturdy','tall_slim')),
  skin_tone          text check (skin_tone in ('fair','light','medium','olive','dark')),
  preferred_style    text check (preferred_style in ('classic','modern','british','italian','minimal')),
  preferred_colors   jsonb not null default '[]'::jsonb,
  occupation         text,
  lifestyle          text,
  primary_use_case   text,
  notes              text,
  line_display_name  text,
  last_visit_at      timestamptz,
  next_follow_up_at  timestamptz,
  favorite_fabric_ids jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists customers_org_idx on customers(organization_id);
create index if not exists customers_org_visit_idx on customers(organization_id, last_visit_at desc);

create table if not exists customer_photos (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  customer_id     text not null references customers(id) on delete cascade,
  media_id        text not null,
  captured_note   text,
  created_at      timestamptz not null default now()
);
create index if not exists customer_photos_org_cus_idx on customer_photos(organization_id, customer_id);

-- ── 生地 ───────────────────────────────────────────────────────
create table if not exists fabrics (
  id               text primary key,
  organization_id  text not null references organizations(id) on delete cascade,
  name             text not null,
  brand            text,
  collection       text,
  product_code     text,
  primary_image_id text,
  color            text not null,
  color_family     text not null check (color_family in ('navy','charcoal','grey','brown','black','blue','beige','green','other')),
  pattern          text not null check (pattern in ('solid','stripe','pinstripe','check','glen_check','herringbone','birdseye','windowpane')),
  material         text,
  composition      text,
  weight_g         smallint,
  season           text not null check (season in ('spring_summer','autumn_winter','all_season')),
  texture          text,
  gloss            text check (gloss in ('matte','semi','high')),
  price_tier       text not null check (price_tier in ('entry','standard','premium','luxury')),
  price_jpy        integer,
  stock_m          numeric(8,1),
  notes            text,
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists fabrics_org_idx on fabrics(organization_id) where archived = false;
create index if not exists fabrics_org_family_idx on fabrics(organization_id, color_family, pattern);
-- 同じ店の中で品番は重複させない（在庫の取り違えを防ぐ）
create unique index if not exists fabrics_org_code_uniq
  on fabrics(organization_id, product_code) where product_code is not null;

create table if not exists fabric_images (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  fabric_id       text not null references fabrics(id) on delete cascade,
  media_id        text not null,
  capture_ok      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists fabric_images_org_fab_idx on fabric_images(organization_id, fabric_id);

-- ── 試着 ───────────────────────────────────────────────────────
create table if not exists try_ons (
  id               text primary key,
  organization_id  text not null references organizations(id) on delete cascade,
  customer_id      text not null references customers(id) on delete cascade,
  fabric_id        text not null references fabrics(id) on delete restrict,
  source_media_id  text not null,
  fabric_media_id  text,
  result_media_id  text,
  status           text not null check (status in ('pending','running','succeeded','failed')),
  error_message    text,
  look_no          integer not null default 1,
  garment          jsonb not null,
  created_by       text not null references users(id),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index if not exists try_ons_org_cus_idx on try_ons(organization_id, customer_id, created_at desc);
create index if not exists try_ons_org_created_idx on try_ons(organization_id, created_at desc);

-- ── 提案・購入・追客 ───────────────────────────────────────────
create table if not exists recommendations (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  customer_id     text not null references customers(id) on delete cascade,
  fabric_id       text not null references fabrics(id) on delete cascade,
  rank            smallint not null,
  reason          text not null,
  score           smallint not null,
  prompt          text,
  source          text not null default 'auto' check (source in ('auto','chat')),
  created_at      timestamptz not null default now()
);
create index if not exists recommendations_org_cus_idx on recommendations(organization_id, customer_id, created_at desc);

create table if not exists purchases (
  id                       text primary key,
  organization_id          text not null references organizations(id) on delete cascade,
  customer_id              text not null references customers(id) on delete cascade,
  fabric_id                text references fabrics(id) on delete set null,
  product_name             text not null,
  amount_jpy               integer not null check (amount_jpy >= 0),
  influenced_by_try_on_id  text references try_ons(id) on delete set null,
  purchased_at             timestamptz not null default now(),
  created_at               timestamptz not null default now()
);
create index if not exists purchases_org_cus_idx on purchases(organization_id, customer_id, purchased_at desc);

create table if not exists follow_ups (
  id                  text primary key,
  organization_id     text not null references organizations(id) on delete cascade,
  customer_id         text not null references customers(id) on delete cascade,
  reason              text not null,
  suggested_fabric_id text references fabrics(id) on delete set null,
  due_at              timestamptz not null,
  status              text not null default 'open' check (status in ('open','contacted','won','dismissed')),
  purchase_id         text references purchases(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- 同じ顧客に「開いたままの追客」は1件まで（二重で追いかけない）
create unique index if not exists follow_ups_one_open_per_customer
  on follow_ups(organization_id, customer_id) where status = 'open';

create table if not exists sales_knowledge (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  title           text not null,
  body            text not null,
  applies_to      jsonb not null default '{}'::jsonb,
  created_by      text not null references users(id),
  created_at      timestamptz not null default now()
);
create index if not exists sales_knowledge_org_idx on sales_knowledge(organization_id);

-- ── 共有 ───────────────────────────────────────────────────────
create table if not exists share_links (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  customer_id     text not null references customers(id) on delete cascade,
  token           text not null unique,
  try_on_ids      jsonb not null default '[]'::jsonb,
  expires_at      timestamptz not null,
  revoked         boolean not null default false,
  view_count      integer not null default 0,
  created_by      text not null references users(id),
  created_at      timestamptz not null default now()
);

-- ── AI 原価・計測 ──────────────────────────────────────────────
create table if not exists ai_jobs (
  id                 text primary key,
  organization_id    text not null references organizations(id) on delete cascade,
  kind               text not null check (kind in ('image','text')),
  provider           text not null,
  model              text not null,
  estimated_cost_jpy numeric(10,2) not null default 0,
  actual_cost_jpy    numeric(10,2) not null default 0,
  input_tokens       integer,
  output_tokens      integer,
  latency_ms         integer not null default 0,
  ok                 boolean not null,
  error_message      text,
  try_on_id          text references try_ons(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists ai_jobs_org_created_idx on ai_jobs(organization_id, created_at desc);

create table if not exists analytics_events (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name            text not null,
  customer_id     text,
  fabric_id       text,
  try_on_id       text,
  amount_jpy      integer,
  meta            jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists analytics_events_org_name_idx on analytics_events(organization_id, name, created_at desc);

create table if not exists subscriptions (
  id                     text primary key,
  organization_id        text not null references organizations(id) on delete cascade,
  plan                   text not null check (plan in ('starter','pro','enterprise')),
  status                 text not null check (status in ('trialing','active','past_due','canceled')),
  started_at             timestamptz not null default now(),
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text
);
create index if not exists subscriptions_org_idx on subscriptions(organization_id);

create table if not exists media (
  id              text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  kind            text not null check (kind in ('customer_photo','fabric_image','try_on_result')),
  mime            text not null,
  bytes           integer not null,
  width           integer,
  height          integer,
  created_at      timestamptz not null default now()
);
create index if not exists media_org_idx on media(organization_id);

-- ── RLS（二重の防御） ──────────────────────────────────────────
-- アプリは service role で接続し、サーバー側で organization_id を必ず付ける。
-- ここでは anon / authenticated からの直接アクセスを全面的に塞ぐ。
-- 将来 Supabase Auth に寄せる場合は、policy を JWT の org クレームで書き換える。
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','users','customers','customer_photos','fabrics','fabric_images',
    'try_ons','recommendations','purchases','follow_ups','sales_knowledge','share_links',
    'ai_jobs','analytics_events','subscriptions','media'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    -- policy を1つも作らない = anon / authenticated からは1行も見えない
  end loop;
end $$;

-- ── Storage ────────────────────────────────────────────────────
-- 非公開バケットを1つ。パスは <organization_id>/<media_id>。
insert into storage.buckets (id, name, public)
values ('core-suits-media', 'core-suits-media', false)
on conflict (id) do update set public = false;
