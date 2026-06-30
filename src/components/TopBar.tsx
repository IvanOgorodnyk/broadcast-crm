"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Logo from "./Logo";
import type { SystemRole } from "@prisma/client";

type Props = {
  user: {
    id: string;
    username: string;
    name?: string | null;
    surname?: string | null;
    avatarUrl?: string | null;
    role: SystemRole;
  };
  unread: number;
};

export default function TopBar({ user, unread }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`rounded px-3 py-1.5 text-sm font-medium transition ${
          active ? "bg-white/15 text-white" : "text-white/70 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-nav px-4 py-2 text-white">
      <div className="flex items-center gap-1">
        <Link href="/calendar" className="mr-3">
          <Logo size={24} light />
        </Link>
        {link("/calendar", "Calendar")}
        {user.role === "ADMIN" && link("/admin/users", "Admin")}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative text-sm text-white/80 hover:text-white">
          🔔 Notifications
          {unread > 0 && (
            <span className="absolute -right-3 -top-2 rounded-full bg-brand px-1.5 text-[10px] font-bold leading-4">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <Link href="/profile" className="flex items-center gap-2 text-sm hover:opacity-90">
          <Avatar
            name={user.name}
            surname={user.surname}
            username={user.username}
            avatarUrl={user.avatarUrl}
            size={26}
          />
          <span className="hidden sm:inline">{user.username}</span>
        </Link>
        <button onClick={logout} className="text-sm text-white/60 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  );
}
