import Link from "next/link";
import type { ReactNode } from "react";

/** 余白を大きく、線は細く、色は少なく。装飾のための装飾を足さない。 */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-line rounded-md ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <h2 className="text-[11px] tracking-widest uppercase text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageTitle({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        <h1 className="font-display text-[28px] leading-tight tracking-wide">{title}</h1>
        {lead ? <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "quiet";
  size?: "md" | "sm";
  className?: string;
};

function buttonClass({ variant = "primary", size = "md", className = "" }: Omit<ButtonProps, "children">) {
  const base = "inline-flex items-center justify-center gap-2 rounded t-color font-medium disabled:opacity-45 disabled:cursor-not-allowed";
  // 店頭では携帯でも触る。狭い画面ではタップ対象を 44px 確保する
  const sizes = size === "sm" ? "h-11 sm:h-8 px-3 text-[13px]" : "h-11 px-5 text-sm";
  const variants = {
    primary: "bg-navy text-canvas hover:bg-navyHover",
    ghost: "border border-line bg-surface text-ink hover:bg-sunken",
    quiet: "text-navy hover:bg-sunken",
  }[variant];
  return `${base} ${sizes} ${variants} ${className}`;
}

export function Button({
  children, variant, size, className, ...rest
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  children, href, variant, size, className,
}: ButtonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })}>
      {children}
    </Link>
  );
}

export function Stat({
  label, value, sub, tone = "default",
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "accent" }) {
  return (
    <div className="px-5 py-5">
      <div className="text-[11px] tracking-wider uppercase text-muted">{label}</div>
      <div className={`mt-2 font-display text-[26px] leading-none ${tone === "accent" ? "text-brass" : "text-ink"}`}>
        {value}
      </div>
      {sub ? <div className="mt-2 text-[12px] text-muted leading-relaxed">{sub}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "navy" | "brass" | "danger" | "success" }) {
  const tones = {
    neutral: "border-line text-muted bg-sunken",
    navy: "border-navy/25 text-navy bg-navy/[0.06]",
    brass: "border-brass/30 text-brass bg-brass/[0.07]",
    danger: "border-danger/30 text-danger bg-danger/[0.06]",
    success: "border-success/30 text-success bg-success/[0.06]",
  }[tone];
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-sm border text-[11px] tracking-wide ${tones}`}>
      {children}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line rounded-md py-14 px-8 text-center">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-sm bg-sunken border border-line text-[10px] tracking-widest uppercase text-faint">
      {children}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-muted mb-1.5">{label}</span>
      {children}
      {hint ? <span className="block mt-1 text-[11px] text-faint">{hint}</span> : null}
    </label>
  );
}

// ★ w-full を含むクラスに後から w-auto を足しても効かない（クラスの並び順は勝敗を決めない）。
//   幅を自分で決めたいところは inputAutoClass を使う。
const controlBase =
  "h-11 px-3 bg-surface border border-line rounded text-sm text-ink placeholder:text-faint t-color focus:border-navy";
export const inputClass = `w-full ${controlBase}`;
export const inputAutoClass = controlBase;
export const textareaClass =
  "w-full px-3 py-2.5 bg-surface border border-line rounded text-sm text-ink placeholder:text-faint t-color focus:border-navy";

export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}
