import type {
  AiJob, AnalyticsEvent, Customer, CustomerPhoto, Fabric, FabricImage, FollowUp,
  Media, Organization, Purchase, Recommendation, SalesKnowledge, ShareLink,
  Subscription, TryOn, User,
} from "@/lib/domain/types";

/** テーブル名 → 行の型。organization_id を持たない表は存在しない（organizations 自身を除く）。 */
export interface Tables {
  organizations: Organization;
  users: User;
  customers: Customer;
  customer_photos: CustomerPhoto;
  fabrics: Fabric;
  fabric_images: FabricImage;
  try_ons: TryOn;
  recommendations: Recommendation;
  purchases: Purchase;
  sales_knowledge: SalesKnowledge;
  follow_ups: FollowUp;
  ai_jobs: AiJob;
  analytics_events: AnalyticsEvent;
  subscriptions: Subscription;
  share_links: ShareLink;
  media: Media;
}

export type Table = keyof Tables;

/** organizations 以外はすべて店舗スコープ。 */
export type TenantTable = Exclude<Table, "organizations">;

export const TENANT_TABLES: TenantTable[] = [
  "users", "customers", "customer_photos", "fabrics", "fabric_images",
  "try_ons", "recommendations", "purchases", "sales_knowledge", "follow_ups",
  "ai_jobs", "analytics_events", "subscriptions", "share_links", "media",
];

export const ALL_TABLES: Table[] = ["organizations", ...TENANT_TABLES];
