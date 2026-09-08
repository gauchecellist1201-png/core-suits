import "server-only";
import { getStore } from "@/lib/db";
import type { AnalyticsEvent, AnalyticsEventName, Id } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/util/ids";

/** 出来事を1件残す。計測の失敗で業務を止めない（記録できなくても処理は続ける）。 */
export async function track(
  organizationId: Id,
  name: AnalyticsEventName,
  extra: Partial<Omit<AnalyticsEvent, "id" | "organization_id" | "name" | "created_at">> = {},
): Promise<void> {
  try {
    await getStore().insert("analytics_events", {
      id: newId("ev"),
      organization_id: organizationId,
      name,
      created_at: nowIso(),
      ...extra,
    });
  } catch {
    // 記録できなくても本処理は続ける
  }
}
