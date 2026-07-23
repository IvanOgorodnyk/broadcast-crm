"use client";

import { useEffect, useState } from "react";
import WorkBreakdown from "./WorkBreakdown";
import type { WorkPerson } from "@/types";

/** "My work" — the signed-in user's own game log, shown on their profile. */
export default function MyWork() {
  const [stats, setStats] = useState<WorkPerson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-1 font-bold">My work</h2>
      <p className="mb-4 text-sm text-gray-500">
        Games you worked on, by role and tournament.
      </p>
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : stats ? (
        <WorkBreakdown person={stats} openFirst />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          No games worked yet.
        </p>
      )}
    </section>
  );
}
