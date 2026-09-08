"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ITEMS = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/customers", label: "顧客" },
  { href: "/fabrics", label: "生地" },
  { href: "/studio", label: "スタジオ" },
  { href: "/analytics", label: "分析" },
  { href: "/settings", label: "設定" },
];

export function Nav({
  storeName, userName, plan, used, limit,
}: { storeName: string; userName: string; plan: string; used: number; limit: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <>
      {/* 画面が狭いときの上部バー */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-5 bg-canvas/95 backdrop-blur border-b border-line">
        <Link href="/dashboard" className="font-display text-[13px] tracking-widest">CORE SUITS</Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-10 min-w-[44px] px-3 text-[13px] text-muted"
        >
          {open ? "閉じる" : "メニュー"}
        </button>
      </div>

      <nav
        className={`${open ? "block" : "hidden"} lg:block lg:sticky lg:top-0 lg:h-screen border-r border-line bg-canvas`}
      >
        <div className="flex flex-col h-full px-5 py-7">
          <Link href="/dashboard" className="hidden lg:block font-display text-[13px] tracking-widest mb-1">
            CORE SUITS
          </Link>
          <p className="hidden lg:block text-[11px] text-faint tracking-wider mb-9">{storeName}</p>

          <ul className="space-y-0.5">
            {ITEMS.map((it) => {
              const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center h-11 px-3 rounded text-sm t-color ${
                      active ? "bg-navy text-canvas" : "text-ink hover:bg-sunken"
                    }`}
                  >
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-8">
            <div className="text-[11px] text-muted">今月の試着生成</div>
            <div className="mt-2 h-1 bg-stone rounded-full overflow-hidden">
              <div
                className={`h-full ${pct >= 90 ? "bg-danger" : "bg-navy"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-faint">
              {used} / {limit} 回 ・ {plan.toUpperCase()}
            </div>

            <div className="mt-6 pt-5 border-t border-line">
              <div className="text-[12px] text-muted">{userName}</div>
              <form action="/api/auth/logout" method="post">
                <button className="mt-1.5 text-[12px] text-navy hover:underline">ログアウト</button>
              </form>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
