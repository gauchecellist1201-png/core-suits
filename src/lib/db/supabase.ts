import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Id, Media, Organization, ShareLink, User } from "@/lib/domain/types";
import type { Store } from "./store";

/**
 * Supabase 保管（本番）
 * ---------------------------------------------------------------------------
 * ★ すべての店舗スコープのクエリに .eq("organization_id", organizationId) を必ず付ける。
 *   認可の本体はここ（サーバー側）。RLS は二重の防御であって、これの代わりではない。
 * ★ 顧客写真は private バケット。公開URLは作らない。ブラウザへは
 *   認証付きルート（/api/media/[id]）が中継するか、短命の署名URLでのみ渡す。
 */

export const BUCKET = "core-suits-media";

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です");
  return createClient(url, key, { auth: { persistSession: false } });
}

function objectPath(organizationId: Id, mediaId: Id): string {
  return `${organizationId}/${mediaId}`;
}

export const supabaseStore: Store = {
  driver: "supabase",

  async list(table, organizationId, where) {
    let q = client().from(table).select("*").eq("organization_id", organizationId);
    for (const [k, v] of Object.entries(where ?? {})) q = q.eq(k, v as never);
    const { data, error } = await q;
    if (error) throw new Error(`${table} の取得に失敗: ${error.message}`);
    return (data ?? []) as never;
  },

  async get(table, organizationId, id) {
    const { data, error } = await client()
      .from(table).select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
    if (error) throw new Error(`${table} の取得に失敗: ${error.message}`);
    return (data ?? null) as never;
  },

  async insert(table, row) {
    const { data, error } = await client().from(table).insert(row).select().single();
    if (error) throw new Error(`${table} の追加に失敗: ${error.message}`);
    return data as never;
  },

  async update(table, organizationId, id, patch) {
    const { organization_id: _o, id: _i, ...rest } = patch as Record<string, unknown>;
    const { data, error } = await client()
      .from(table).update(rest).eq("organization_id", organizationId).eq("id", id).select().maybeSingle();
    if (error) throw new Error(`${table} の更新に失敗: ${error.message}`);
    return (data ?? null) as never;
  },

  async remove(table, organizationId, id) {
    const { error, count } = await client()
      .from(table).delete({ count: "exact" }).eq("organization_id", organizationId).eq("id", id);
    if (error) throw new Error(`${table} の削除に失敗: ${error.message}`);
    return (count ?? 0) > 0;
  },

  async findUserByLoginId(loginId) {
    const { data, error } = await client()
      .from("users").select("*").eq("login_id", loginId).maybeSingle();
    if (error) throw new Error(`ログインの照会に失敗: ${error.message}`);
    return (data as User | null) ?? null;
  },

  async getOrganization(id) {
    const { data, error } = await client()
      .from("organizations").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`店舗の取得に失敗: ${error.message}`);
    return (data as Organization | null) ?? null;
  },

  async updateOrganization(id, patch) {
    const { id: _i, ...rest } = patch;
    const { data, error } = await client()
      .from("organizations").update(rest).eq("id", id).select().maybeSingle();
    if (error) throw new Error(`店舗の更新に失敗: ${error.message}`);
    return (data as Organization | null) ?? null;
  },

  async insertOrganization(row) {
    const { data, error } = await client().from("organizations").insert(row).select().single();
    if (error) throw new Error(`店舗の作成に失敗: ${error.message}`);
    return data as Organization;
  },

  async findShareLinkByToken(token) {
    const { data, error } = await client()
      .from("share_links").select("*").eq("token", token).maybeSingle();
    if (error) throw new Error(`共有リンクの照会に失敗: ${error.message}`);
    return (data as ShareLink | null) ?? null;
  },

  async putMedia(media, bytes) {
    const c = client();
    const { error: upErr } = await c.storage
      .from(BUCKET)
      .upload(objectPath(media.organization_id, media.id), bytes, {
        contentType: media.mime, upsert: false,
      });
    if (upErr) throw new Error(`画像の保存に失敗: ${upErr.message}`);
    const { data, error } = await c.from("media").insert(media).select().single();
    if (error) throw new Error(`画像の控えの保存に失敗: ${error.message}`);
    return data as Media;
  },

  async getMediaBytes(organizationId, mediaId) {
    const c = client();
    const { data: media, error } = await c
      .from("media").select("*").eq("organization_id", organizationId).eq("id", mediaId).maybeSingle();
    if (error) throw new Error(`画像の控えの取得に失敗: ${error.message}`);
    if (!media) return null;
    const { data: blob, error: dlErr } = await c.storage
      .from(BUCKET).download(objectPath(organizationId, mediaId));
    if (dlErr || !blob) return null;
    return { media: media as Media, bytes: Buffer.from(await blob.arrayBuffer()) };
  },

  async signedMediaUrl(organizationId, mediaId, ttlSec) {
    const { data, error } = await client().storage
      .from(BUCKET).createSignedUrl(objectPath(organizationId, mediaId), ttlSec);
    if (error || !data) return null;
    return data.signedUrl;
  },
};
