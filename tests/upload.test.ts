import { describe, expect, it } from "vitest";
import { sniffImageMime } from "@/lib/util/image";
import { parseJsonArray } from "@/lib/util/json";
import { newShareToken, newId } from "@/lib/util/ids";

describe("画像の判定", () => {
  const pad = (head: number[]) => Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);

  it("中身の先頭を見て種類を決める", () => {
    expect(sniffImageMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("WebP を見分ける", () => {
    const b = Buffer.alloc(20);
    b.write("RIFF", 0, "ascii");
    b.write("WEBP", 8, "ascii");
    expect(sniffImageMime(b)).toBe("image/webp");
  });

  it("画像でないものは受け付けない（拡張子を信用しない）", () => {
    expect(sniffImageMime(Buffer.from("<?php echo 1; ?>          "))).toBeNull();
    expect(sniffImageMime(Buffer.from("GIF89a              "))).toBeNull();
    expect(sniffImageMime(Buffer.alloc(4))).toBeNull();
  });
});

describe("返答の解釈", () => {
  it("前後に文章があっても配列だけ取り出す", () => {
    expect(parseJsonArray('了解しました。["A","B"] 以上です。')).toEqual(["A", "B"]);
  });
  it("解釈できないときは無理に作らない", () => {
    expect(parseJsonArray("配列ではありません")).toBeNull();
    expect(parseJsonArray("[壊れている")).toBeNull();
    expect(parseJsonArray("[]")).toBeNull();
    expect(parseJsonArray('[1,2,3]')).toBeNull();
  });
});

describe("識別子", () => {
  it("共有トークンは推測しづらい長さがある", () => {
    const t = newShareToken();
    expect(t.length).toBeGreaterThanOrEqual(32);
    expect(newShareToken()).not.toBe(t);
  });
  it("id は種類が分かる接頭辞つき", () => {
    expect(newId("cus")).toMatch(/^cus_/);
  });
});
