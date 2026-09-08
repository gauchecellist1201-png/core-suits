import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentSession()) redirect("/dashboard");
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-navy text-canvas p-14">
        <div className="font-display text-[15px] tracking-widest">CORE SUITS</div>
        <div>
          <p className="font-display text-[40px] leading-[1.25] tracking-wide">
            仕立てる前に、
            <br />
            似合うが見える。
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-canvas/70 max-w-sm">
            お客様の写真と、この店の生地。その2つだけで、出来上がりを先にお見せする。
            接客の記録は顧客台帳に残り、次のご提案になります。
          </p>
        </div>
        <p className="text-[11px] tracking-wider text-canvas/45">Your best suit, before it exists.</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden font-display text-sm tracking-widest mb-10">CORE SUITS</div>
          <h1 className="font-display text-2xl tracking-wide">ログイン</h1>
          <p className="mt-2 text-sm text-muted">店舗アカウントでお入りください。</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
