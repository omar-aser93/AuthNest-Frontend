"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCount } from "@/lib/socket/UnreadCountContext";
import { Home, PlusCircle, FileText, Info, BookmarkCheck, List, MessageCircle } from "lucide-react";

// Array of sidebar links
const links = [
  { label: "Home", href: "/", icon: Home },
  { label: "Create Post", href: "/create-post", icon: PlusCircle },
  { label: "My Posts", href: "/my-posts", icon: FileText },
  { label: "Friends Manager", href: "/friends", icon: List },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Bookmarks", href: "/saved-posts", icon: BookmarkCheck },
  { label: "About", href: "/about", icon: Info },
];


// Sidebar component (Desktop)
export default function Sidebar() {
  const pathname = usePathname();                // Get the current pathname
  const { totalUnread } = useUnreadCount();      // Get chat totalUnread count from useUnreadCount provider
  return (
    <aside className="hidden md:flex flex-col w-64 p-4 border-r bg-white min-h-screen">
      <nav className="space-y-2">
        {/* Map over the links array and render each link, if the current pathname matches the href, change style */}
        {links.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl transition ${pathname === item.href ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`} >
              <item.icon size={18} className={pathname === item.href ? "text-blue-700" : "text-gray-600"} />
              <span className="font-medium">{item.label}</span>
              {/* chat unread count Badge */}
              {item.href === "/messages" && totalUnread > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"> {totalUnread > 99 ? "99+" : totalUnread} </span>
              )}
            </Link>
        ))}
      </nav>
    </aside>
  );
}
