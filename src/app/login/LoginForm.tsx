"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui/primitives";

export function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "ログインできませんでした。");
        setBusy(false);
        return;
      }
      // 成功したときだけ進む。ここで busy を戻さない（二重送信を防ぐ）
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("通信に失敗しました。電波状況をご確認ください。");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <Field label="ログインID">
        <input
          className={inputClass} value={loginId} autoComplete="username" autoCapitalize="none"
          onChange={(e) => setLoginId(e.target.value)} required
        />
      </Field>
      <Field label="パスワード">
        <input
          className={inputClass} type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} required
        />
      </Field>

      {error ? (
        <p role="alert" className="text-[13px] text-danger bg-danger/[0.06] border border-danger/25 rounded px-3 py-2.5">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "確認しています…" : "ログイン"}
      </Button>
    </form>
  );
}
