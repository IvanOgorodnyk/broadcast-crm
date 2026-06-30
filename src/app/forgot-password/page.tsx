"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setSent(true);
    if (data.devLink) setDevLink(data.devLink);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold">Reset password</h1>
        {sent ? (
          <div className="text-center text-sm text-gray-600">
            <p>If an account exists for that email, a reset link has been sent.</p>
            {devLink && (
              <p className="mt-3 break-all">
                Dev link:{" "}
                <a href={devLink} className="text-blue-600 underline">{devLink}</a>
              </p>
            )}
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2"
              required
            />
            <button type="submit" className="w-full rounded-md bg-brand py-2.5 font-bold text-white hover:bg-brand-dark">
              Send reset link
            </button>
          </>
        )}
        <Link href="/login" className="mt-4 block text-center text-sm text-gray-500 underline">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
