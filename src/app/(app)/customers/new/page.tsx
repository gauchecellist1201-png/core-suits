import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { NewCustomerForm } from "@/components/NewCustomerForm";
import { PageTitle } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function NewCustomer() {
  if (!(await currentSession())) redirect("/login");
  return (
    <>
      <PageTitle
        title="顧客を登録"
        lead="お名前だけで登録できます。分かっている項目だけ埋めてください。後からいつでも足せます。"
      />
      <NewCustomerForm />
    </>
  );
}
