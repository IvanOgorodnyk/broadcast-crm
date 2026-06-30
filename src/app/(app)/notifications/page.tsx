import NotificationsList from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <NotificationsList />
    </div>
  );
}
