import type { GarmentSpec } from "@/lib/domain/types";

/**
 * 試着生成の撮影指示書
 * ---------------------------------------------------------------------------
 * ここが CORE Suits の中身のいちばん大事な部分。方針は2つだけ。
 *
 *   1. 人は変えない。顔・髪・骨格・年齢感・肌色・姿勢・背景・光は入力写真のまま。
 *      「似た人」ではなく「同じ人」。美化・痩身・若返りをさせない。
 *   2. 生地は言葉で作らせない。必ず生地の実物画像を参照させ、
 *      色・柄・柄の大きさ・光沢をその画像に合わせさせる。
 *
 * 生地画像が無いときは、色柄が別物になる危険が跳ね上がる。その場合は
 * usedFabricReference=false として画面側で注意を強める（黙って作らない）。
 */

const LAPEL: Record<GarmentSpec["lapel"], string> = {
  notch: "notch lapel",
  peak: "peak lapel",
};

const STYLE_NOTE: Record<GarmentSpec["style"], string> = {
  classic: "classic tailoring: moderate shoulder, straight clean lines, full canvas drape",
  modern: "modern tailoring: slightly trimmer fit, natural shoulder, shorter jacket length",
  british: "British tailoring: structured roped shoulder, suppressed waist, defined chest",
  italian: "Italian tailoring: soft unstructured shoulder, light drape, open quarters",
  minimal: "minimal tailoring: unadorned, clean seams, no visible pocket flap detailing",
};

const SCENE_NOTE: Record<GarmentSpec["scene"], string> = {
  business: "everyday business setting",
  wedding: "wedding guest / celebratory setting",
  executive_meeting: "senior executive meeting",
  sales: "client-facing sales setting",
  formal: "formal ceremony",
  casual: "relaxed smart-casual setting",
  party: "evening party",
  ceremony: "ceremonial occasion",
};

const SHIRT: Record<GarmentSpec["shirt"], string> = {
  white: "crisp white dress shirt",
  light_blue: "light blue dress shirt",
};

const TIE: Record<GarmentSpec["tie"], string> = {
  none: "no tie, top button open",
  navy: "navy silk tie, neat four-in-hand knot",
  burgundy: "burgundy silk tie, neat four-in-hand knot",
};

export interface PromptParts {
  text: string;
  usesFabricReference: boolean;
}

export function buildTryOnPrompt(
  garment: GarmentSpec,
  fabricDescription: string,
  hasFabricImage: boolean,
): PromptParts {
  const fabricBlock = hasFabricImage
    ? [
        "IMAGE 1 is the CUSTOMER. IMAGE 2 is the actual FABRIC SWATCH held by this store.",
        "",
        "FABRIC FIDELITY — this is the most important requirement after identity:",
        "- The suit must be made of the exact fabric in IMAGE 2.",
        "- Match the colour, the weave pattern, the SCALE of the pattern, the sheen and the surface texture to IMAGE 2.",
        "- Do not substitute a similar colour. Do not invent a pattern that is not in IMAGE 2.",
        "- Render the weave at realistic garment scale (a swatch photographed close up must not become an oversized pattern on the jacket).",
        `- For reference, the store describes this fabric as: ${fabricDescription}. The IMAGE takes priority over these words.`,
      ].join("\n")
    : [
        "IMAGE 1 is the CUSTOMER. No fabric photograph is available.",
        "",
        `FABRIC: ${fabricDescription}.`,
        "Render it as a realistic wool suiting cloth. Keep the colour restrained and true to the description.",
      ].join("\n");

  const text = [
    fabricBlock,
    "",
    "TASK: Edit IMAGE 1 so that the same person is wearing a bespoke suit tailored from this fabric.",
    "",
    "IDENTITY — absolute, non-negotiable:",
    "- Keep the person from IMAGE 1 exactly as they are: same face, same facial features and proportions,",
    "  same hairstyle, same skin tone, same apparent age, same body build and shoulder width, same posture.",
    "- Keep the same camera angle, same framing, same background, same lighting direction and colour temperature.",
    "- Do NOT beautify, slim, de-age, whiten, or restyle the person. Do NOT produce a lookalike. It is the same individual.",
    "- Change ONLY the clothing.",
    "",
    "GARMENT:",
    `- ${garment.piece === "three_piece" ? "Three-piece suit with matching waistcoat" : "Two-piece single-breasted suit"}, ${garment.buttons}-button front, ${LAPEL[garment.lapel]}.`,
    `- ${STYLE_NOTE[garment.style]}.`,
    `- ${SHIRT[garment.shirt]}, ${TIE[garment.tie]}.`,
    `- Suitable for a ${SCENE_NOTE[garment.scene]}.`,
    "- Correct tailoring: clean shoulder line, sleeve ending at the wrist bone with a little shirt cuff showing,",
    "  jacket length covering the seat, natural wool drape with real fabric folds. No floating or pasted-on garment.",
    "",
    "OUTPUT: one photorealistic photograph, same framing and aspect ratio as IMAGE 1. No text, no watermark, no collage.",
  ].join("\n");

  return { text, usesFabricReference: hasFabricImage };
}

/** 顧客に見せる注意書き。生成画像には必ずこれを添える。 */
export const DISCLAIMER_JA =
  "AI による完成イメージです。実物の色・質感・光沢とは異なる場合があります。最終確認は必ず生地の現物でお願いします。";
