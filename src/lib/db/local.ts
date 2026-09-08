import fs from "node:fs/promises";
import path from "node:path";
import type { Id, Media, Organization, ShareLink, User } from "@/lib/domain/types";
import { ALL_TABLES, type TenantTable, type Tables } from "./schema";
import type { Store } from "./store";

/**
 * ローカル保管（開発・実演用）
 * ---------------------------------------------------------------------------
 * Supabase を繋ぐまでの間、店舗に持ち込んで動かせるようにするための実装。
 * ★ 本番（Supabase 設定済み）では絶対に選ばれない。選択は db/index.ts が決める。
 *
 * 置き場所は .data/（gitignore 済み）。顧客写真は .data/media/ に置き、
 * 静的配信の対象外（public/ ではない）。配るのは認証付きルートのみ。
 */

const ROOT = path.join(process.cwd(), ".data");
const DB_FILE = path.join(ROOT, "db.json");
const MEDIA_DIR = path.join(ROOT, "media");

type Snapshot = { [K in keyof Tables]: Tables[K][] };

function emptySnapshot(): Snapshot {
  const s = {} as Snapshot;
  for (const t of ALL_TABLES) (s as Record<string, unknown[]>)[t] = [];
  return s;
}

let cache: Snapshot | null = null;
/** 読み書きを直列化する（同時更新で片方の書き込みが消えないように） */
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

async function load(): Promise<Snapshot> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    const base = emptySnapshot();
    for (const t of ALL_TABLES) {
      const rows = parsed[t];
      if (Array.isArray(rows)) (base as Record<string, unknown[]>)[t] = rows as unknown[];
    }
    cache = base;
  } catch {
    cache = emptySnapshot();
  }
  return cache;
}

async function save(s: Snapshot): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(s, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE); // 途中で落ちても壊れた JSON を残さない
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

export function resetLocalCache(): void {
  cache = null;
}

export const localStore: Store = {
  driver: "local",

  async list(table, organizationId, where) {
    const s = await load();
    const rows = s[table] as unknown as Record<string, unknown>[];
    return rows.filter(
      (r) => r.organization_id === organizationId && (!where || matches(r, where as Record<string, unknown>)),
    ) as never;
  },

  async get(table, organizationId, id) {
    const s = await load();
    const rows = s[table] as unknown as Record<string, unknown>[];
    return (rows.find((r) => r.id === id && r.organization_id === organizationId) ?? null) as never;
  },

  async insert(table, row) {
    return serialize(async () => {
      const s = await load();
      (s[table] as unknown as unknown[]).push(row);
      await save(s);
      return row;
    });
  },

  async update(table, organizationId, id, patch) {
    return serialize(async () => {
      const s = await load();
      const rows = s[table] as unknown as Record<string, unknown>[];
      const i = rows.findIndex((r) => r.id === id && r.organization_id === organizationId);
      if (i < 0) return null as never;
      // organization_id と id は patch で動かさない（付け替え事故を防ぐ）
      const { organization_id: _o, id: _i, ...rest } = patch as Record<string, unknown>;
      rows[i] = { ...rows[i], ...rest };
      await save(s);
      return rows[i] as never;
    });
  },

  async remove(table, organizationId, id) {
    return serialize(async () => {
      const s = await load();
      const rows = s[table] as unknown as Record<string, unknown>[];
      const i = rows.findIndex((r) => r.id === id && r.organization_id === organizationId);
      if (i < 0) return false;
      rows.splice(i, 1);
      await save(s);
      return true;
    });
  },

  async findUserByLoginId(loginId) {
    const s = await load();
    return s.users.find((u: User) => u.login_id === loginId) ?? null;
  },

  async getOrganization(id) {
    const s = await load();
    return s.organizations.find((o: Organization) => o.id === id) ?? null;
  },

  async updateOrganization(id, patch) {
    return serialize(async () => {
      const s = await load();
      const i = s.organizations.findIndex((o: Organization) => o.id === id);
      if (i < 0) return null;
      const { id: _i, ...rest } = patch;
      s.organizations[i] = { ...s.organizations[i]!, ...rest };
      await save(s);
      return s.organizations[i]!;
    });
  },

  async insertOrganization(row) {
    return serialize(async () => {
      const s = await load();
      s.organizations.push(row);
      await save(s);
      return row;
    });
  },

  async findShareLinkByToken(token) {
    const s = await load();
    return s.share_links.find((l: ShareLink) => l.token === token) ?? null;
  },

  async putMedia(media, bytes) {
    return serialize(async () => {
      await fs.mkdir(path.join(MEDIA_DIR, media.organization_id), { recursive: true });
      await fs.writeFile(path.join(MEDIA_DIR, media.organization_id, media.id), bytes);
      const s = await load();
      s.media.push(media);
      await save(s);
      return media;
    });
  },

  async getMediaBytes(organizationId, mediaId) {
    const s = await load();
    const media = s.media.find(
      (m: Media) => m.id === mediaId && m.organization_id === organizationId,
    );
    if (!media) return null;
    try {
      const bytes = await fs.readFile(path.join(MEDIA_DIR, organizationId, mediaId));
      return { media, bytes };
    } catch {
      return null;
    }
  },

  async signedMediaUrl() {
    // ローカルには一時URLの仕組みがない。呼び出し側は認証ルートで配る。
    return null;
  },
};
