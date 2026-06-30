import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({
    where: { recipientId: user.id, read: false },
  });

  return (
    <div className="min-h-screen">
      <TopBar
        user={{
          id: user.id,
          username: user.username,
          name: user.name,
          surname: user.surname,
          avatarUrl: user.avatarUrl,
          role: user.role,
        }}
        unread={unread}
      />
      <main>{children}</main>
    </div>
  );
}

export const dynamic = "force-dynamic";
