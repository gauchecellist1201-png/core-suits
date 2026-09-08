import type { Id, Media, Organization, ShareLink, User } from "@/lib/domain/types";
import type { TenantTable, Tables } from "./schema";

/**
 * データ保管の共通口
 * ---------------------------------------------------------------------------
 * 店舗スコープの読み書きは必ず organizationId を要求する。引数として強制することで
 * 「うっかり他店のデータを引く」経路をコンパイル時に潰す。
 *
 * 店舗をまたぐ参照が必要なのは次の3つだけで、それぞれ専用のメソッドにしてある。
 *   ・ログイン（login_id からユーザーを引く）
 *   ・店舗そのものの取得
 *   ・共有リンク（token から引く。閲覧は token を知っている人だけ）
 */
export interface Store {
  list<T extends TenantTable>(
    table: T, organizationId: Id, where?: Partial<Tables[T]>,
  ): Promise<Tables[T][]>;

  get<T extends TenantTable>(
    table: T, organizationId: Id, id: Id,
  ): Promise<Tables[T] | null>;

  insert<T extends TenantTable>(table: T, row: Tables[T]): Promise<Tables[T]>;

  update<T extends TenantTable>(
    table: T, organizationId: Id, id: Id, patch: Partial<Tables[T]>,
  ): Promise<Tables[T] | null>;

  remove<T extends TenantTable>(table: T, organizationId: Id, id: Id): Promise<boolean>;

  /* 店舗をまたぐ、限定された入り口 */
  findUserByLoginId(loginId: string): Promise<User | null>;
  getOrganization(id: Id): Promise<Organization | null>;
  updateOrganization(id: Id, patch: Partial<Organization>): Promise<Organization | null>;
  insertOrganization(row: Organization): Promise<Organization>;
  findShareLinkByToken(token: string): Promise<ShareLink | null>;

  /* バイナリ（顧客写真・生地画像・生成結果）。公開バケットには置かない */
  putMedia(media: Media, bytes: Buffer): Promise<Media>;
  getMediaBytes(organizationId: Id, mediaId: Id): Promise<{ media: Media; bytes: Buffer } | null>;
  /** ダウンロード用の一時URL（対応しない driver は null を返し、呼び出し側は認証ルートで配る） */
  signedMediaUrl(organizationId: Id, mediaId: Id, ttlSec: number): Promise<string | null>;

  /** 実装名（画面と診断に出す） */
  readonly driver: "local" | "supabase";
}
