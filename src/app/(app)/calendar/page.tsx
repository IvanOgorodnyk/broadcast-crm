import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Calendar from "@/components/calendar/Calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canEdit = user.role === "ADMIN";
  return <Calendar canEdit={canEdit} />;
}
