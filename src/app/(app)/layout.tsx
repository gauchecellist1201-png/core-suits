import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { currentUsage } from "@/lib/server/usage";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const usage = await currentUsage(session.organization);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[228px_1fr]">
      <Nav
        storeName={session.organization.display_name}
        userName={session.user.name}
        plan={session.organization.plan}
        used={usage.used}
        limit={usage.limit}
      />
      <main className="px-6 py-8 lg:px-12 lg:py-12 max-w-shell w-full">{children}</main>
    </div>
  );
}
