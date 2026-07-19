"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/calendar");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Invalid email or password");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={40} />
        </div>

        <label className="mb-1 block text-sm font-semibold">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-200 bg-blue-50/50 px-3 py-2 outline-none focus:border-brand"
          placeholder="you@company.com"
        />

        <label className="mb-1 block text-sm font-semibold">Password</label>
        <div className="relative mb-2">
          <input
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-blue-50/50 px-3 py-2 pr-10 outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>

        <a href="/forgot-password" className="mb-6 block text-sm text-gray-500 underline">
          Forgot your password?
        </a>

        {error && <p className="mb-4 text-sm text-brand">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mx-auto block rounded-md bg-brand px-10 py-3 font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          Staff member without an account?{" "}
          <a href="/register" className="text-brand underline">
            Sign up
          </a>
        </p>

        <p className="mt-8 text-center text-xs text-gray-400">
          Demo: admin@maincast.com / password123
        </p>
      </form>
    </div>
  );
}
