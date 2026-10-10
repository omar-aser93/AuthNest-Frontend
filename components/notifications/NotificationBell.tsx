"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useNotificationCount } from "@/lib/socket/notificationCountContext";

// Component: A Notification Bell that shows the number of unread notifications (Real-time)
export default function NotificationBell() {
  const { count } = useNotificationCount();     // get count from NotificationCountContext provider
  const pathname = usePathname();               // get current pathname

  // Reset badge when we are inside the notifications page, otherwise show the count
  const displayCount = pathname === "/notifications" ? 0 : count;

  return (
    <Link href="/notifications" className="relative p-2">
      {/* Bell icon */}
      <Bell className="w-4 h-4 md:w-6 md:h-6" />
      {/* Notification count badge, if count is greater than 9, show "9+" */}
      {displayCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium px-1">
          {displayCount > 9 ? "9+" : displayCount}
        </span>
      )}
    </Link>
  );
}