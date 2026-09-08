import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 親ディレクトリの lockfile を拾わせない（このリポだけを対象にする）。
  // ★ new URL(import.meta.url).pathname は日本語を含むパスを %エンコードして別の場所を指す。
  //   このリポは「マイル」配下にあるので fileURLToPath を必ず使う。
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // 顧客写真は必ず認証付きルート（/api/media/…）から配る。画像最適化に外部ホストは許可しない。
  images: { remotePatterns: [] },
};
export default nextConfig;
