"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { STAFF_POSITIONS, STAFF_POSITION_LABEL } from "@/lib/labels";

const inputCls =
  "mb-4 w-full rounded-md border border-gray-200 bg-blue-50/50 px-3 py-2 outline-none focus:border-brand";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function togglePosition(p: string) {
    setPositions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (positions.length === 0) {
      setError("Pick at least one position");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, surname, email, password, positions }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/calendar");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm py-8">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="mb-6 text-center text-lg font-bold">Create a staff account</h1>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Surname</label>
            <input
              required
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-semibold">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@company.com"
        />

        <label className="mb-1 block text-sm font-semibold">Password</label>
        <div className="relative mb-4">
          <input
            type={show ? "text" : "password"}
            required
            minLength={6}
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

        <span className="mb-2 block text-sm font-semibold">I work as</span>
        <div className="mb-6 space-y-2">
          {STAFF_POSITIONS.map((p) => (
            <label key={p} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={positions.includes(p)}
                onChange={() => togglePosition(p)}
                className="h-4 w-4 accent-brand"
              />
              {STAFF_POSITION_LABEL[p]}
            </label>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-brand">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mx-auto block rounded-md bg-brand px-10 py-3 font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-brand underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
