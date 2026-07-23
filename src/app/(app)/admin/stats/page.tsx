import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import WorkStatsAdmin from "@/components/WorkStatsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/calendar");
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <WorkStatsAdmin />
    </div>
  );
}
