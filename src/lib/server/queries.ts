import "server-only";
import { getStore } from "@/lib/db";
import type { Id, Organization } from "@/lib/domain/types";
import { computeKpis, type Kpis } from "@/lib/domain/analytics";
import { findOpportunities, type Opportunity } from "@/lib/domain/followups";

export async function dashboardData(org: Organization): Promise<{
  kpis: Kpis;
  opportunities: Opportunity[];
  fabricCount: number;
}> {
  const store = getStore();
  const [customers, tryOns, purchases, followUps, events, aiJobs, fabrics] = await Promise.all([
    store.list("customers", org.id),
    store.list("try_ons", org.id),
    store.list("purchases", org.id),
    store.list("follow_ups", org.id),
    store.list("analytics_events", org.id),
    store.list("ai_jobs", org.id),
    store.list("fabrics", org.id),
  ]);
  return {
    kpis: computeKpis({ customerCount: customers.length, tryOns, purchases, followUps, events, aiJobs }),
    opportunities: findOpportunities(customers, purchases, followUps),
    fabricCount: fabrics.filter((f) => !f.archived).length,
  };
}

export async function customerPage(orgId: Id, customerId: Id) {
  const store = getStore();
  const customer = await store.get("customers", orgId, customerId);
  if (!customer) return null;
  const [photos, tryOns, purchases, recs, fabrics, followUps] = await Promise.all([
    store.list("customer_photos", orgId, { customer_id: customerId }),
    store.list("try_ons", orgId, { customer_id: customerId }),
    store.list("purchases", orgId, { customer_id: customerId }),
    store.list("recommendations", orgId, { customer_id: customerId }),
    store.list("fabrics", orgId),
    store.list("follow_ups", orgId, { customer_id: customerId }),
  ]);
  return {
    customer, photos, fabrics, followUps,
    tryOns: tryOns.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    purchases: purchases.sort((a, b) => b.purchased_at.localeCompare(a.purchased_at)),
    recommendations: recs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}
