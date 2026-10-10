import { getMyNotifications } from "@/lib/queries/notificationQueries";
import NotificationList from "@/components/notifications/NotificationList";

// Page metadata
export const metadata = {
    title: "Notifications - AuthNest",
    description: "View and manage your notifications.",
};


// notifications page that displays a list of the notifications
export default async function NotificationsPage() {
  // get notifications with cursor, and limit to 20 (server-side) intial load  
  const { notifications, nextCursor } = await getMyNotifications(20);
  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
      <h1 className="text-xl font-semibold mb-6">Notifications</h1>
      {/* Notifications list component */}
      <NotificationList initialNotifications={notifications} initialNextCursor={nextCursor} />
    </div>
  );
}