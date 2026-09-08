import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { localStore, resetLocalCache } from "@/lib/db/local";
import type { Customer } from "@/lib/domain/types";

const DATA = path.join(process.cwd(), ".data");

const customer = (id: string, orgId: string): Customer => ({
  id, organization_id: orgId, name: id, preferred_colors: [], favorite_fabric_ids: [],
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
});

/** テスト中だけ .data を退避する（実演用のデータを壊さない） */
let backup: string | null = null;

beforeEach(() => {
  if (fs.existsSync(DATA)) {
    backup = `${DATA}.test-backup`;
    fs.renameSync(DATA, backup);
  }
  resetLocalCache();
});

afterEach(() => {
  fs.rmSync(DATA, { recursive: true, force: true });
  if (backup) {
    fs.renameSync(backup, DATA);
    backup = null;
  }
  resetLocalCache();
});

describe("店舗の分離", () => {
  it("他店の顧客は一覧に出ない", async () => {
    await localStore.insert("customers", customer("a1", "orgA"));
    await localStore.insert("customers", customer("b1", "orgB"));
    const a = await localStore.list("customers", "orgA");
    expect(a.map((c) => c.id)).toEqual(["a1"]);
  });

  it("id を知っていても、他店の顧客は取れない", async () => {
    await localStore.insert("customers", customer("b1", "orgB"));
    expect(await localStore.get("customers", "orgA", "b1")).toBeNull();
  });

  it("他店の顧客は更新できない", async () => {
    await localStore.insert("customers", customer("b1", "orgB"));
    expect(await localStore.update("customers", "orgA", "b1", { name: "乗っ取り" })).toBeNull();
    expect((await localStore.get("customers", "orgB", "b1"))?.name).toBe("b1");
  });

  it("他店の顧客は削除できない", async () => {
    await localStore.insert("customers", customer("b1", "orgB"));
    expect(await localStore.remove("customers", "orgA", "b1")).toBe(false);
    expect(await localStore.get("customers", "orgB", "b1")).not.toBeNull();
  });

  it("更新で organization_id を付け替えられない", async () => {
    await localStore.insert("customers", customer("a1", "orgA"));
    await localStore.update("customers", "orgA", "a1", { organization_id: "orgB" } as Partial<Customer>);
    expect(await localStore.get("customers", "orgB", "a1")).toBeNull();
    expect(await localStore.get("customers", "orgA", "a1")).not.toBeNull();
  });

  it("画像も店舗をまたいでは取れない", async () => {
    await localStore.putMedia(
      { id: "md1", organization_id: "orgB", kind: "customer_photo", mime: "image/png", bytes: 3, created_at: "2026-01-01T00:00:00.000Z" },
      Buffer.from([1, 2, 3]),
    );
    expect(await localStore.getMediaBytes("orgA", "md1")).toBeNull();
    expect((await localStore.getMediaBytes("orgB", "md1"))?.bytes.byteLength).toBe(3);
  });
});

describe("同時書き込み", () => {
  it("並行して足した行が消えない", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => localStore.insert("customers", customer(`c${i}`, "orgA"))),
    );
    expect(await localStore.list("customers", "orgA")).toHaveLength(12);
  });
});
