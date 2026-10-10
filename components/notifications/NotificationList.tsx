"use client";

import { useState, useTransition } from "react";
import { markAllNotificationsAsReadAction, deleteNotificationAction, markNotificationAsReadAction } from "@/lib/actions/notificationActions";
import { getMyNotifications } from "@/lib/queries/notificationQueries";
import { useNotificationCount } from "@/lib/socket/notificationCountContext";
import NotificationItem from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Notification } from "@/lib/validator";


// Notifications list component, displays a list of notifications 
export default function NotificationList({ initialNotifications, initialNextCursor }: { initialNotifications: Notification[]; initialNextCursor: string | null }) {
  // States to hold notifications, next cursor, loading more
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [nextCursor, setNextCursor]       = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // useTransition hook to handle pending state for async server-actions
  const [isPending, startTransition]      = useTransition();

  const { refreshCount } = useNotificationCount();   // get refreshCount from NotificationCountContext provider
  
  // Function to handle mark all read 
  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();    // Calls the server-action to mark all notifications as read
      if (res.error) { toast.error(res.error); return; }       // If there's an error, show a toast notification and exit
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));    // If successful, set all notifications as read
      await refreshCount();                                                 // Refresh the notification count of the context
    });
  };

  // Function to handle delete
  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteNotificationAction(id);           // Calls the server-action to delete notification
      if (res.error) { toast.error(res.error); return; }        // If there's an error, show a toast notification and exit
      setNotifications(prev => prev.filter(n => n.id !== id));  // If successful, filter out the deleted notification
      await refreshCount();                                     // Refresh the notification count of the context
    });
  };

  // Function to handle mark single notification as read
  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      // Calls the server-action to mark notification as read
      await markNotificationAsReadAction(id);    
      // If successful, set the notification as read
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await refreshCount();                      // Refresh the notification count of the context
    });
  };

  // Function to load more notifications (infinite scroll)
  const loadMore = async () => {
    // If there's no next cursor or already loading more, return out
    if (!nextCursor || isLoadingMore) return;       
    setIsLoadingMore(true);                                       // Set loading more to true
    const res = await getMyNotifications(20, nextCursor);         // Calls the fetch function to get more notifications
    setNotifications(prev => [...prev, ...res.notifications]);    // Add the new notifications to the existing ones
    setNextCursor(res.nextCursor);                                // Update the next cursor
    setIsLoadingMore(false);                                      // Set loading more to false
  };

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-2">
      {/* Mark all read button */}
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending} className="cursor-pointer">
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        // if there are no notifications, display a message "No notifications yet"
        <p className="text-center text-gray-400 py-16">No notifications yet</p>
      ) : (
        // if notifications fetched, map over them array and pass them to the notification item component
        notifications.map(n => (
          <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} onDelete={handleDelete} />
        ))
      )}

      {/* Load more button - If we want, We can replace it with "useInView" intersection observer like in posts pages */}
      {nextCursor && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Load more...
          </Button>
        </div>
      )}
    </div>
  );
}