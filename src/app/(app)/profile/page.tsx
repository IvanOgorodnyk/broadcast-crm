import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/integrations/google";
import { telegramEnabled } from "@/lib/integrations/telegram";
import ProfileForm from "@/components/ProfileForm";
import MyWork from "@/components/MyWork";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">My profile</h1>
      <ProfileForm
        user={{
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          surname: user.surname,
          avatarUrl: user.avatarUrl,
          role: user.role,
          company: user.company?.name ?? null,
          disciplines: user.disciplines.map((d) => d.name),
          googleConnected: Boolean(user.googleRefreshToken),
          telegramConnected: Boolean(user.telegramChatId),
        }}
        integrations={{ google: googleEnabled(), telegram: telegramEnabled() }}
      />

      {user.role !== "VIEWER" && (
        <div className="mt-8">
          <MyWork />
        </div>
      )}
    </div>
  );
}
