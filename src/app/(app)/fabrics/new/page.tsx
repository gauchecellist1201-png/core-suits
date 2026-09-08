import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { NewFabricForm } from "@/components/NewFabricForm";
import { PageTitle } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function NewFabric() {
  if (!(await currentSession())) redirect("/login");
  return (
    <>
      <PageTitle
        title="生地を登録"
        lead="この写真が、そのまま試着イメージの色と柄の基準になります。撮り方を揃えるほど、仕上がりが実物に近づきます。"
      />
      <NewFabricForm />
    </>
  );
}
