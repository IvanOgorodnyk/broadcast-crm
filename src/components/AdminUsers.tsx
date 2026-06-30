"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  name?: string | null;
  surname?: string | null;
  role: "ADMIN" | "STAFF" | "VIEWER";
  active: boolean;
  company: string | null;
  disciplines: string[];
  pendingInvite: boolean;
};

const inputCls = "rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite() {
    setError(null);
    setInviteUrl(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, username: inviteUsername, role: inviteRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteUrl(data.inviteUrl);
      setInviteEmail("");
      setInviteUsername("");
      load();
    } else {
      setError(data.error ?? "Failed to invite");
    }
  }

  async function updateUser(id: string, patch: Partial<AdminUser>) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this user? Their historical assignments are preserved.")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">User management</h1>

      {/* Invite */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Invite a user</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Email</label>
            <input className={inputCls} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="person@company.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Username</label>
            <input className={inputCls} value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Role</label>
            <select className={inputCls} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <button
            onClick={invite}
            disabled={!inviteEmail || !inviteUsername}
            className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Send invite
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-brand">{error}</p>}
        {inviteUrl && (
          <p className="mt-3 break-all rounded bg-gray-50 px-3 py-2 text-sm">
            Invite link (share manually until email is wired up):{" "}
            <a href={inviteUrl} className="text-blue-600 underline">{inviteUrl}</a>
          </p>
        )}
      </section>

      {/* Users table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.username}</div>
                    <div className="text-xs text-gray-400">{[u.name, u.surname].filter(Boolean).join(" ")}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border border-gray-200 px-2 py-1 text-sm"
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as AdminUser["role"] })}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {u.pendingInvite ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Invited</span>
                    ) : u.active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u.active ? (
                      <button onClick={() => deactivate(u.id)} className="text-xs font-medium text-brand hover:underline">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => updateUser(u.id, { active: true })} className="text-xs font-medium text-green-600 hover:underline">
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
