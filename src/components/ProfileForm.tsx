"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

type ProfileUser = {
  id: string;
  email: string;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatarUrl?: string | null;
  role: string;
  company: string | null;
  disciplines: string[];
  googleConnected: boolean;
  telegramConnected: boolean;
};

const inputCls = "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";
const lockedCls = "w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500";

export default function ProfileForm({
  user,
  integrations,
}: {
  user: ProfileUser;
  integrations: { google: boolean; telegram: boolean };
}) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(user.name ?? "");
  const [surname, setSurname] = useState(user.surname ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // password
  const [showPwd, setShowPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // telegram
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, surname, avatarUrl }),
    });
    setSaving(false);
    setMsg(res.ok ? "Profile saved" : "Failed to save profile");
    if (res.ok) router.refresh();
  }

  async function changePassword() {
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Password changed" : data.error ?? "Failed to change password");
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  async function connectTelegram() {
    const res = await fetch("/api/integrations/telegram/link", { method: "POST" });
    const data = await res.json();
    setTgCode(data.code);
    setTgLink(data.deepLink);
  }

  return (
    <div className="space-y-8">
      {msg && <p className="rounded bg-gray-100 px-3 py-2 text-sm">{msg}</p>}

      {/* Avatar + identity */}
      <section className="flex items-start gap-6">
        <div className="text-center">
          <Avatar name={name} surname={surname} username={username} avatarUrl={avatarUrl} size={96} />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Avatar URL</label>
            <input className={inputCls} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Username</label>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Surname</label>
              <input className={inputCls} value={surname} onChange={(e) => setSurname(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {/* Locked / admin-managed fields */}
      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">Email</label>
          <input className={lockedCls} value={user.email} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Company / team</label>
          <input className={lockedCls} value={user.company ?? "—"} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Role</label>
          <input className={lockedCls} value={user.role} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Disciplines</label>
          <input className={lockedCls} value={user.disciplines.join(", ") || "—"} disabled />
        </div>
      </section>

      <button
        onClick={saveProfile}
        disabled={saving}
        className="rounded-md bg-brand px-6 py-2 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>

      {/* Integrations */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Integrations</h2>

        <div className="flex items-center justify-between border-b py-3">
          <div>
            <p className="font-medium">Google Calendar</p>
            <p className="text-sm text-gray-500">
              {user.googleConnected ? "Connected — assigned events sync automatically." : "Sync assigned events to your calendar."}
            </p>
          </div>
          {!integrations.google ? (
            <span className="text-sm text-gray-400">Not configured</span>
          ) : user.googleConnected ? (
            <button
              onClick={async () => {
                await fetch("/api/integrations/google/disconnect", { method: "POST" });
                router.refresh();
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Disconnect
            </button>
          ) : (
            <a href="/api/integrations/google/start" className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white">
              Connect
            </a>
          )}
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">Telegram Bot</p>
            <p className="text-sm text-gray-500">
              {user.telegramConnected ? "Connected — you receive reminders & assignments." : "Get assignment alerts and reminders."}
            </p>
            {tgCode && (
              <p className="mt-1 text-sm">
                Send <code className="rounded bg-gray-100 px-1">/start {tgCode}</code> to the bot
                {tgLink && (
                  <>
                    {" "}or{" "}
                    <a href={tgLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      open in Telegram
                    </a>
                  </>
                )}
                .
              </p>
            )}
          </div>
          {!integrations.telegram ? (
            <span className="text-sm text-gray-400">Not configured</span>
          ) : user.telegramConnected ? (
            <button
              onClick={async () => {
                await fetch("/api/integrations/telegram/link", { method: "DELETE" });
                router.refresh();
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Disconnect
            </button>
          ) : (
            <button onClick={connectTelegram} className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white">
              Connect Telegram Bot
            </button>
          )}
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Change password</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Current password</label>
            <input
              type={showPwd ? "text" : "password"}
              className={inputCls}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">New password</label>
            <input
              type={showPwd ? "text" : "password"}
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="accent-brand" />
            Show passwords
          </label>
          <button
            onClick={changePassword}
            disabled={!currentPassword || newPassword.length < 6}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Update password
          </button>
        </div>
      </section>
    </div>
  );
}
