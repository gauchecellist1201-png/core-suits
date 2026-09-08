import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CORE Suits",
  description: "オーダースーツ店のための AI Sales OS。仕立てる前に、似合うが見える。",
  robots: { index: false, follow: false }, // 顧客情報を扱う業務システム。検索には出さない
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
