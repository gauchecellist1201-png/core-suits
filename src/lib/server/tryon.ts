import "server-only";
import { getStore } from "@/lib/db";
import type { Customer, Fabric, GarmentSpec, Id, Organization, TryOn, User } from "@/lib/domain/types";
import { getImageProvider } from "@/lib/ai/providers";
import { newId, nowIso } from "@/lib/util/ids";
import { track } from "./events";
import { assertCanGenerate, recordAiJob } from "./usage";

export interface GenerateParams {
  organization: Organization;
  user: User;
  customer: Customer;
  fabric: Fabric;
  garment: GarmentSpec;
  /** 使う顧客写真。未指定なら主写真 */
  sourceMediaId?: Id;
}

export type GenerateOutcome =
  | { ok: true; tryOn: TryOn }
  | { ok: false; message: string; tryOn?: TryOn };

/**
 * 試着を1枚つくる。
 * 順番は必ず「上限の確認 → 入力の用意 → 生成 → 原価の記録 → 結果の保存」。
 * 失敗しても ai_jobs には必ず1行残す（呼んだ事実と原価を消さないため）。
 */
export async function generateTryOn(p: GenerateParams): Promise<GenerateOutcome> {
  const store = getStore();
  const orgId = p.organization.id;

  const verdict = await assertCanGenerate(p.organization);
  if (!verdict.allowed) return { ok: false, message: verdict.message };

  const sourceMediaId = p.sourceMediaId ?? p.customer.primary_photo_id;
  if (!sourceMediaId) {
    return { ok: false, message: "この顧客の写真がまだ登録されていません。写真を追加してください。" };
  }
  const photo = await store.getMediaBytes(orgId, sourceMediaId);
  if (!photo) return { ok: false, message: "顧客写真を読み込めませんでした。" };

  const fabricMediaId = p.fabric.primary_image_id;
  const fabricMedia = fabricMediaId ? await store.getMediaBytes(orgId, fabricMediaId) : null;

  const existing = await store.list("try_ons", orgId, { customer_id: p.customer.id });
  const lookNo = existing.filter((t) => t.status === "succeeded").length + 1;

  const tryOn: TryOn = {
    id: newId("try"),
    organization_id: orgId,
    customer_id: p.customer.id,
    fabric_id: p.fabric.id,
    source_media_id: sourceMediaId,
    fabric_media_id: fabricMedia?.media.id,
    status: "running",
    look_no: lookNo,
    garment: p.garment,
    created_by: p.user.id,
    created_at: nowIso(),
  };
  await store.insert("try_ons", tryOn);
  await track(orgId, "try_on_started", { customer_id: p.customer.id, fabric_id: p.fabric.id, try_on_id: tryOn.id });

  const provider = getImageProvider();
  const result = await provider.generateTryOn({
    customerPhoto: { bytes: photo.bytes, mime: photo.media.mime },
    fabricImage: fabricMedia ? { bytes: fabricMedia.bytes, mime: fabricMedia.media.mime } : undefined,
    fabricDescription: describeFabric(p.fabric),
    garment: p.garment,
  });

  await recordAiJob({
    organizationId: orgId,
    kind: "image",
    provider: result.provider,
    model: result.model,
    estimatedCostJpy: provider.estimateJpy(),
    actualCostJpy: result.costJpy,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
    ok: result.ok,
    errorMessage: result.errorMessage,
    tryOnId: tryOn.id,
  });

  if (!result.ok || !result.image) {
    const failed = await store.update("try_ons", orgId, tryOn.id, {
      status: "failed",
      error_message: result.errorMessage ?? "生成に失敗しました",
      completed_at: nowIso(),
    });
    await track(orgId, "try_on_failed", { customer_id: p.customer.id, fabric_id: p.fabric.id, try_on_id: tryOn.id });
    return { ok: false, message: result.errorMessage ?? "生成に失敗しました", tryOn: failed ?? tryOn };
  }

  const media = await store.putMedia(
    {
      id: newId("md"),
      organization_id: orgId,
      kind: "try_on_result",
      mime: result.image.mime,
      bytes: result.image.bytes.byteLength,
      created_at: nowIso(),
    },
    result.image.bytes,
  );

  const done = await store.update("try_ons", orgId, tryOn.id, {
    status: "succeeded",
    result_media_id: media.id,
    completed_at: nowIso(),
  });
  await track(orgId, "try_on_completed", { customer_id: p.customer.id, fabric_id: p.fabric.id, try_on_id: tryOn.id });
  return { ok: true, tryOn: done ?? { ...tryOn, status: "succeeded", result_media_id: media.id } };
}

/** 生地の言葉づかい。画像の代わりではなく、画像を補う説明。 */
export function describeFabric(f: Fabric): string {
  const bits = [
    f.color,
    patternLabelEn(f.pattern),
    f.material,
    f.composition,
    f.weight_g ? `${f.weight_g}g` : undefined,
    f.gloss ? `${f.gloss} sheen` : undefined,
    f.brand ? `by ${f.brand}` : undefined,
  ].filter(Boolean);
  return bits.join(", ");
}

function patternLabelEn(p: Fabric["pattern"]): string {
  return {
    solid: "solid", stripe: "striped", pinstripe: "pinstripe", check: "checked",
    glen_check: "glen check", herringbone: "herringbone", birdseye: "birdseye",
    windowpane: "windowpane",
  }[p];
}
