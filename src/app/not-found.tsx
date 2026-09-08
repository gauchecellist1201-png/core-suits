import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <p className="font-display text-2xl">ページが見つかりません</p>
        <p className="mt-3 text-sm text-muted">リンクの期限が切れているか、URL が違う可能性があります。</p>
        <Link href="/" className="inline-block mt-6 text-sm text-navy hover:underline">最初の画面へ</Link>
      </div>
    </main>
  );
}
