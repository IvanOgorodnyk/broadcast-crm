"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function InviteInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords don't match");
    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (res.ok) {
      router.push("/calendar");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to accept invite");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold">Set your password</h1>
        {!token && <p className="mb-4 text-sm text-brand">Missing invite token.</p>}
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded-md border border-gray-200 px-3 py-2"
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2"
          required
        />
        {error && <p className="mb-3 text-sm text-brand">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-brand py-2.5 font-bold text-white hover:bg-brand-dark">
          Activate account
        </button>
      </form>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  );
}
