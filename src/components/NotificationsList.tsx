"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "./Avatar";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  actor: { username: string; avatarUrl: string | null } | null;
  event: { id: string; title: string } | null;
};

export default function NotificationsList() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.notifications ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
    router.refresh();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAll} className="text-sm font-medium text-brand hover:underline">
          Mark all as read
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-gray-400">
          You're all caught up.
        </p>
      )}

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-red-50/40"}`}
            onMouseEnter={() => !n.read && markOne(n.id)}
          >
            <Avatar username={n.actor?.username ?? "?"} avatarUrl={n.actor?.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">{n.message}</p>
              {n.event && (
                <Link href={`/calendar?event=${n.event.id}`} className="text-xs text-blue-600 hover:underline">
                  {n.event.title}
                </Link>
              )}
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </div>
            {!n.read && <span className="mt-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
