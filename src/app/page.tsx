import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Root() {
  const s = await currentSession();
  redirect(s ? "/dashboard" : "/login");
}
