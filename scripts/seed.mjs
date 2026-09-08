/**
 * デモデータの投入（ローカル保管のみ）
 * ---------------------------------------------------------------------------
 * ★ Supabase が設定されている環境では動かさない。
 *   実店舗の台帳に架空のお客様が混ざるのは、この製品にとって最悪の事故なので、
 *   --i-know-what-i-am-doing を明示しない限り止める。
 *
 * 使い方: node scripts/seed.mjs [--reset]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(process.cwd(), ".data");
const DB = path.join(ROOT, "db.json");
const MEDIA = path.join(ROOT, "media");
const ASSETS = path.join(process.cwd(), "demo-assets");
const RESET = process.argv.includes("--reset");

if (process.env.SUPABASE_URL && !process.argv.includes("--i-know-what-i-am-doing")) {
  console.error("SUPABASE_URL が設定されています。実データに架空の顧客を混ぜないため中止しました。");
  process.exit(1);
}

const ORG = "org_demo";
const now = new Date();
const iso = (d) => d.toISOString();
const monthsAgo = (m) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return iso(d); };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain.normalize("NFKC"), salt, 32, { N: 16384 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function media(orgId, id, file, kind) {
  const src = path.join(ASSETS, file);
  if (!fs.existsSync(src)) return null;
  const bytes = fs.readFileSync(src);
  fs.mkdirSync(path.join(MEDIA, orgId), { recursive: true });
  fs.writeFileSync(path.join(MEDIA, orgId, id), bytes);
  const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
  return { id, organization_id: orgId, kind, mime, bytes: bytes.byteLength, created_at: iso(now) };
}

const FABRICS = [
  { id: "fab_navy_solid", file: "fabric-navy-solid.jpg", name: "ネイビー ソリッド 130s", brand: "MILANO TESSUTI", collection: "Classic Wool", product_code: "MT-1201", color: "ディープネイビー", color_family: "navy", pattern: "solid", material: "ウール", composition: "Wool 100%", weight_g: 280, season: "all_season", gloss: "semi", price_tier: "standard", price_jpy: 128000, stock_m: 24 },
  { id: "fab_charcoal_hb", file: "fabric-charcoal-herringbone.jpg", name: "チャコール ヘリンボーン", brand: "MILANO TESSUTI", collection: "Winter Craft", product_code: "MT-3308", color: "チャコールグレー", color_family: "charcoal", pattern: "herringbone", material: "ウール", composition: "Wool 100%", weight_g: 320, season: "autumn_winter", gloss: "matte", price_tier: "premium", price_jpy: 186000, stock_m: 12 },
  { id: "fab_navy_pin", file: "fabric-navy-pinstripe.jpg", name: "ネイビー ピンストライプ", brand: "LONDON HOUSE", collection: "City", product_code: "LH-0742", color: "ネイビー", color_family: "navy", pattern: "pinstripe", material: "ウール", composition: "Wool 100%", weight_g: 300, season: "autumn_winter", gloss: "semi", price_tier: "premium", price_jpy: 168000, stock_m: 9 },
  { id: "fab_brown_solid", file: "fabric-brown-solid.jpg", name: "ダークブラウン ソリッド", brand: "MILANO TESSUTI", collection: "Winter Craft", product_code: "MT-3410", color: "ダークブラウン", color_family: "brown", pattern: "solid", material: "ウール", composition: "Wool 98% / Cashmere 2%", weight_g: 330, season: "autumn_winter", gloss: "matte", price_tier: "premium", price_jpy: 198000, stock_m: 7 },
  { id: "fab_grey_glen", file: "fabric-grey-glen.jpg", name: "グレー グレンチェック", brand: "LONDON HOUSE", collection: "Heritage", product_code: "LH-1180", color: "ミディアムグレー", color_family: "grey", pattern: "glen_check", material: "ウール", composition: "Wool 100%", weight_g: 310, season: "autumn_winter", gloss: "matte", price_tier: "standard", price_jpy: 142000, stock_m: 15 },
  { id: "fab_lgrey_birdseye", file: "fabric-lightgrey-birdseye.jpg", name: "ライトグレー バーズアイ", brand: "MILANO TESSUTI", collection: "Classic Wool", product_code: "MT-1455", color: "シルバーグレー", color_family: "grey", pattern: "birdseye", material: "ウール", composition: "Wool 100%", weight_g: 260, season: "all_season", gloss: "semi", price_tier: "standard", price_jpy: 132000, stock_m: 18 },
  { id: "fab_black_solid", file: "fabric-black-solid.jpg", name: "ブラック フォーマル", brand: "TOKYO MILLS", collection: "Ceremony", product_code: "TM-0090", color: "ブラック", color_family: "black", pattern: "solid", material: "ウール", composition: "Wool 100%", weight_g: 300, season: "all_season", gloss: "matte", price_tier: "standard", price_jpy: 118000, stock_m: 20 },
  { id: "fab_blue_hopsack", file: "fabric-navy-hopsack.jpg", name: "ブルー ホップサック", brand: "MILANO TESSUTI", collection: "Summer Air", product_code: "MT-2210", color: "ミッドブルー", color_family: "blue", pattern: "solid", material: "ウール", composition: "Wool 100%", weight_g: 230, season: "spring_summer", gloss: "matte", price_tier: "standard", price_jpy: 126000, stock_m: 16 },
  { id: "fab_beige_linen", file: "fabric-beige-linen.jpg", name: "ベージュ リネンウール", brand: "TOKYO MILLS", collection: "Summer Air", product_code: "TM-2077", color: "ウォームベージュ", color_family: "beige", pattern: "solid", material: "リネン混", composition: "Wool 60% / Linen 40%", weight_g: 240, season: "spring_summer", gloss: "matte", price_tier: "entry", price_jpy: 96000, stock_m: 11 },
  { id: "fab_green_check", file: "fabric-green-check.jpg", name: "オリーブ ウィンドウペン", brand: "LONDON HOUSE", collection: "Heritage", product_code: "LH-1322", color: "オリーブグリーン", color_family: "green", pattern: "windowpane", material: "ウール", composition: "Wool 100%", weight_g: 320, season: "autumn_winter", gloss: "matte", price_tier: "premium", price_jpy: 172000, stock_m: 5 },
];

const CUSTOMERS = [
  {
    id: "cus_demo_01", file: "person-01.jpg", name: "井上 直輝", name_kana: "イノウエ ナオキ",
    age: 42, gender: "male", height_cm: 176, body_type: "standard", skin_tone: "light",
    preferred_style: "modern", preferred_colors: ["ネイビー", "チャコール"],
    occupation: "会社経営", lifestyle: "週2〜3回の会食、月1回の講演",
    primary_use_case: "executive_meeting",
    notes: "肩まわりを少しゆったり。派手すぎるものは好まれない。前回は無地のネイビー。",
    purchases: [{ months: 8, fabric: "fab_navy_solid", name: "オーダースーツ（ネイビー）", amount: 128000 }],
  },
  {
    id: "cus_demo_02", file: "person-02.jpg", name: "高橋 涼", name_kana: "タカハシ リョウ",
    age: 29, gender: "male", height_cm: 181, body_type: "tall_slim", skin_tone: "fair",
    preferred_style: "italian", preferred_colors: ["ブルー", "グレー"],
    occupation: "法人営業", lifestyle: "外回り中心、夏場は特に暑がり",
    primary_use_case: "sales",
    notes: "初回来店。夏に着られる軽い生地を探している。",
    purchases: [],
  },
  {
    id: "cus_demo_03", file: "person-03.jpg", name: "森 健一郎", name_kana: "モリ ケンイチロウ",
    age: 55, gender: "male", height_cm: 170, body_type: "sturdy", skin_tone: "medium",
    preferred_style: "british", preferred_colors: ["チャコール", "ブラウン"],
    occupation: "税理士", lifestyle: "式典・来賓の機会が多い",
    primary_use_case: "formal",
    notes: "大きい柄は避けたいとのご希望。",
    purchases: [
      { months: 14, fabric: "fab_black_solid", name: "オーダースーツ（フォーマル）", amount: 118000 },
      { months: 7, fabric: "fab_charcoal_hb", name: "オーダースーツ（チャコール）", amount: 186000 },
    ],
  },
  {
    id: "cus_demo_04", file: "person-04.jpg", name: "中村 由紀", name_kana: "ナカムラ ユキ",
    age: 38, gender: "female", height_cm: 163, body_type: "slim", skin_tone: "light",
    preferred_style: "minimal", preferred_colors: ["グレー", "ネイビー"],
    occupation: "弁護士", lifestyle: "法廷・クライアント面談",
    primary_use_case: "business",
    notes: "装飾のないミニマルな仕立てを好まれる。",
    purchases: [{ months: 3, fabric: "fab_lgrey_birdseye", name: "オーダースーツ（ライトグレー）", amount: 132000 }],
  },
];

function build() {
  const db = {
    organizations: [], users: [], customers: [], customer_photos: [], fabrics: [], fabric_images: [],
    try_ons: [], recommendations: [], purchases: [], sales_knowledge: [], follow_ups: [],
    ai_jobs: [], analytics_events: [], subscriptions: [], share_links: [], media: [],
  };

  db.organizations.push({
    id: ORG, name: "GINZA TAILOR TAKAGI", display_name: "銀座テーラー髙木",
    plan: "pro", monthly_tryon_limit: 300, monthly_cost_limit_jpy: 9000, created_at: monthsAgo(2),
  });
  db.subscriptions.push({
    id: "sub_demo", organization_id: ORG, plan: "pro", status: "trialing", started_at: monthsAgo(2),
  });

  db.users.push({
    id: "usr_demo_owner", organization_id: ORG, name: "髙木 修一", login_id: "demo",
    password_hash: hashPassword("coresuits2026"), role: "owner", created_at: monthsAgo(2),
  });
  db.users.push({
    id: "usr_demo_staff", organization_id: ORG, name: "佐藤 美咲", login_id: "staff",
    password_hash: hashPassword("coresuits2026"), role: "staff", created_at: monthsAgo(1),
  });

  let missing = 0;
  for (const f of FABRICS) {
    const mediaId = `md_${f.id}`;
    const m = media(ORG, mediaId, f.file, "fabric_image");
    if (m) {
      db.media.push(m);
      db.fabric_images.push({
        id: `fim_${f.id}`, organization_id: ORG, fabric_id: f.id, media_id: mediaId,
        capture_ok: true, created_at: monthsAgo(2),
      });
    } else missing += 1;
    const { file, ...rest } = f;
    db.fabrics.push({
      ...rest, organization_id: ORG, primary_image_id: m ? mediaId : undefined,
      archived: false, created_at: monthsAgo(2), updated_at: monthsAgo(2),
      texture: undefined, notes: undefined,
    });
  }

  for (const c of CUSTOMERS) {
    const mediaId = `md_${c.id}`;
    const m = media(ORG, mediaId, c.file, "customer_photo");
    if (m) {
      db.media.push(m);
      db.customer_photos.push({
        id: `cph_${c.id}`, organization_id: ORG, customer_id: c.id, media_id: mediaId,
        captured_note: "店内・自然光・正面", created_at: monthsAgo(1),
      });
    } else missing += 1;

    const lastPurchaseMonths = c.purchases.length ? Math.min(...c.purchases.map((p) => p.months)) : null;
    db.customers.push({
      id: c.id, organization_id: ORG, name: c.name, name_kana: c.name_kana,
      primary_photo_id: m ? mediaId : undefined,
      age: c.age, gender: c.gender, height_cm: c.height_cm, body_type: c.body_type,
      skin_tone: c.skin_tone, preferred_style: c.preferred_style, preferred_colors: c.preferred_colors,
      occupation: c.occupation, lifestyle: c.lifestyle, primary_use_case: c.primary_use_case,
      notes: c.notes, favorite_fabric_ids: [],
      last_visit_at: lastPurchaseMonths !== null ? monthsAgo(lastPurchaseMonths) : monthsAgo(9),
      created_at: monthsAgo(18), updated_at: monthsAgo(1),
    });

    for (const [i, p] of c.purchases.entries()) {
      db.purchases.push({
        id: `pur_${c.id}_${i}`, organization_id: ORG, customer_id: c.id, fabric_id: p.fabric,
        product_name: p.name, amount_jpy: p.amount,
        purchased_at: monthsAgo(p.months), created_at: monthsAgo(p.months),
      });
      db.analytics_events.push({
        id: `ev_${c.id}_${i}`, organization_id: ORG, name: "sale_created",
        customer_id: c.id, fabric_id: p.fabric, amount_jpy: p.amount, created_at: monthsAgo(p.months),
      });
    }
  }

  db.sales_knowledge.push({
    id: "skn_demo_01", organization_id: ORG,
    title: "40代以上の経営者はプレミアム帯が通りやすい",
    body: "会食・会談の機会が多い方は、生地の格を上げたご提案のほうが納得されやすい。価格ではなく「人前に立つ回数」で説明する。",
    applies_to: { use_cases: ["executive_meeting", "formal"], age_min: 40, price_tiers: ["premium", "luxury"] },
    created_by: "usr_demo_owner", created_at: monthsAgo(1),
  });
  db.sales_knowledge.push({
    id: "skn_demo_02", organization_id: ORG,
    title: "式典用途に柄は勧めない",
    body: "ご列席・来賓の場では、黒またはチャコールの無地に絞る。柄はご本人が希望された場合のみ。",
    applies_to: { use_cases: ["ceremony", "formal"], color_families: ["black", "charcoal"] },
    created_by: "usr_demo_owner", created_at: monthsAgo(1),
  });

  return { db, missing };
}

function main() {
  if (RESET && fs.existsSync(ROOT)) fs.rmSync(ROOT, { recursive: true, force: true });
  if (fs.existsSync(DB) && !RESET) {
    console.error(".data/db.json が既にあります。作り直すなら --reset を付けてください。");
    process.exit(1);
  }
  if (!fs.existsSync(ASSETS)) {
    console.error("demo-assets/ がありません。先に npm run seed:photos を実行してください。");
    process.exit(1);
  }
  fs.mkdirSync(ROOT, { recursive: true });
  const { db, missing } = build();
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
  console.log(`投入しました: 店舗1 / ユーザー2 / 顧客${db.customers.length} / 生地${db.fabrics.length} / 購入${db.purchases.length}`);
  if (missing) console.warn(`※ 画像が見つからなかった項目が ${missing} 件あります（demo-assets/ を確認してください）`);
  console.log("ログイン: demo / coresuits2026 （オーナー）、staff / coresuits2026 （スタッフ）");
}

main();
