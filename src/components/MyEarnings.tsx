"use client";

import { useEffect, useState } from "react";
import PayBreakdown from "./PayBreakdown";
import type { PayPerson } from "@/types";

/** "My earnings" — the signed-in user's own payroll breakdown, on their profile. */
export default function MyEarnings() {
  const [pay, setPay] = useState<PayPerson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/finance")
      .then((r) => r.json())
      .then((d) => setPay(d.pay))
      .catch(() => setPay(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-1 font-bold">My earnings</h2>
      <p className="mb-4 text-sm text-gray-500">
        Pay per map, by role and tournament. Rates: $4 cast · $3 direction · $1.50 analysis · $2 guest.
      </p>
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : pay ? (
        <PayBreakdown person={pay} openFirst />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          No earnings yet.
        </p>
      )}
    </section>
  );
}
