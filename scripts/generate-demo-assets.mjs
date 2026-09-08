/**
 * デモ用の画像を作る（架空の人物・架空の生地写真）
 * ---------------------------------------------------------------------------
 * ★ 実在の人物の写真は使わない。デモに出る人はすべて架空。
 * ★ 一度作ったら demo-assets/ に置いてリポジトリに入れる。以後 API キーなしで実演できる。
 *
 * 使い方: GEMINI_API_KEY=... node scripts/generate-demo-assets.mjs [--force]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = path.join(process.cwd(), "demo-assets");
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.SUITS_IMAGE_MODEL || "gemini-3.1-flash-image";
const FORCE = process.argv.includes("--force");

const PEOPLE = [
  { file: "person-01.jpg", prompt: "Photorealistic half-body portrait of a fictional Japanese man in his early 40s, standing straight, facing camera, plain warm light-grey seamless studio background, soft even softbox lighting, wearing a plain white dress shirt, no tie, no jacket, arms relaxed at sides. Natural skin texture, 85mm lens. A generic fictional person, not a celebrity. Head to hips visible." },
  { file: "person-02.jpg", prompt: "Photorealistic half-body portrait of a fictional Japanese man in his late 20s, slim build, standing straight, facing camera, plain warm light-grey seamless studio background, soft even lighting, wearing a plain white dress shirt, no tie, no jacket. Natural skin texture, 85mm lens. A generic fictional person. Head to hips visible." },
  { file: "person-03.jpg", prompt: "Photorealistic half-body portrait of a fictional Japanese man in his mid 50s, sturdy build, standing straight, facing camera, plain warm light-grey seamless studio background, soft even lighting, wearing a plain white dress shirt, no tie, no jacket. Natural skin texture, 85mm lens. A generic fictional person. Head to hips visible." },
  { file: "person-04.jpg", prompt: "Photorealistic half-body portrait of a fictional Japanese woman in her late 30s, standing straight, facing camera, plain warm light-grey seamless studio background, soft even lighting, wearing a plain white blouse, no jacket. Natural skin texture, 85mm lens. A generic fictional person. Head to hips visible." },
];

const swatch = (desc) =>
  `A flat top-down macro photograph of a folded wool suiting fabric swatch, ${desc}. Natural daylight, matte studio surface, the fabric fills the entire frame, no background, no props, no text, high detail weave texture, colour accurate.`;

const FABRICS = [
  { file: "fabric-navy-solid.jpg", prompt: swatch("deep navy plain solid worsted wool, fine smooth weave") },
  { file: "fabric-charcoal-herringbone.jpg", prompt: swatch("charcoal grey with a subtle white herringbone weave, matte finish") },
  { file: "fabric-navy-pinstripe.jpg", prompt: swatch("dark navy with narrow chalk-white pinstripes spaced about 12mm apart") },
  { file: "fabric-brown-solid.jpg", prompt: swatch("rich dark chocolate brown plain wool, slightly textured") },
  { file: "fabric-grey-glen.jpg", prompt: swatch("mid grey glen check (Prince of Wales check) with a faint blue overcheck") },
  { file: "fabric-lightgrey-birdseye.jpg", prompt: swatch("light silver grey birdseye weave, tiny dotted texture") },
  { file: "fabric-black-solid.jpg", prompt: swatch("jet black formal wool, smooth fine weave, low sheen") },
  { file: "fabric-navy-hopsack.jpg", prompt: swatch("mid blue summer hopsack weave, open airy texture, matte") },
  { file: "fabric-beige-linen.jpg", prompt: swatch("warm beige linen-wool blend, visible slubby linen texture") },
  { file: "fabric-green-check.jpg", prompt: swatch("deep olive green with a subtle tonal windowpane check") },
];

async function gen(item) {
  const dest = path.join(OUT, item.file);
  if (fs.existsSync(dest) && !FORCE) {
    console.log(`skip  ${item.file}`);
    return;
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: item.prompt }] }] }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`${item.file}: ${JSON.stringify(json).slice(0, 300)}`);
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) throw new Error(`${item.file}: 画像が返りませんでした`);

  const tmp = `${dest}.png`;
  fs.writeFileSync(tmp, Buffer.from(inline.data, "base64"));
  // 保管サイズを抑える（macOS 標準の sips。無い環境では PNG のまま残す）
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "1024", tmp, "--out", dest], { stdio: "ignore" });
    fs.unlinkSync(tmp);
  } catch {
    fs.renameSync(tmp, dest.replace(/\.jpg$/, ".png"));
  }
  console.log(`ok    ${item.file}`);
}

async function main() {
  if (!KEY) {
    console.error("GEMINI_API_KEY が必要です。");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const item of [...PEOPLE, ...FABRICS]) {
    await gen(item);
  }
  console.log("完了:", OUT);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
