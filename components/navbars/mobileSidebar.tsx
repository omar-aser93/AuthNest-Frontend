"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/lib/socket/UnreadCountContext";
import { Home, PlusCircle, FileText, Info, Menu, BookmarkCheck, List, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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


// Sidebar component (Mobile)
export default function MobileSidebar() {
  const pathname = usePathname();             // Get the current pathname
  const { totalUnread } = useUnreadCount();   // Get chat totalUnread count from useUnreadCount provider
  return (
    // Shadcn Sheet component
    <Sheet>
      {/* Button Trigger to open the sidebar, Hidden on Desktop */}
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden cursor-pointer"><Menu size={22} /></Button>
      </SheetTrigger>
      {/* Content of the sidebar */}
      <SheetContent side="left" className="p-4">
        <SheetTitle></SheetTitle>   {/* required for sheet accessibility, u can keep it empty */}
        <nav className="flex flex-col gap-3 mt-6">
          {/* Map over the links array and render each link, if the current pathname matches the href, change style */}
          {links.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl text-lg transition ${pathname === item.href ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"} `} >
                <item.icon size={20} />
                {item.label}
                {/* chat unread count Badge */}
                {item.href === "/messages" && totalUnread > 0 && (
                  <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"> {totalUnread > 99 ? "99+" : totalUnread} </span>
                )}
              </Link>

          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
