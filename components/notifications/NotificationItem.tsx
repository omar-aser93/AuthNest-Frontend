"use client";

import Link from "next/link";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/utils";
import { X } from "lucide-react";
import { Notification } from "@/lib/validator";

// ─── Emoji for reactions notifications ─────────────────────────────
const reactionEmoji: Record<string, string> = { LIKE: "👍", LOVE: "❤️", HAHA: "😂", WOW: "😮", SAD: "😢", ANGRY: "😡" };


// Notification item component, displays a single notification in the notifications list
export default function NotificationItem({ notification: n, onMarkRead, onDelete }: { notification: Notification; onMarkRead: (id: string) => void; onDelete: (id: string) => void }) {
  // Variables to get the actor, avatar and name, All used in the AI
  const actor  = n.sender ?? n.tag?.taggedBy ?? n.request?.requester;
  const avatar = actor?.image ?? "/default-avatar.png";
  const name   = actor?.name ?? "Someone";

  // Call the buildNotification function to get the message and href (the function is under this component)
  const { message, href } = buildNotification(n);

  // Handle click function, if the notification is unread, mark it as read when clicked
  const handleClick = () => { if (!n.isRead) onMarkRead(n.id) };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.isRead ? "bg-white" : "bg-blue-50 border-blue-100"}`}>
      {/* Avatar */}
      <Link href={`/user/${actor?.id}`} onClick={handleClick}>
        <Image src={avatar} alt={name} width={40} height={40} className="rounded-full w-10 h-10 object-cover shrink-0" />
      </Link>

      {/* Content */}
      <Link href={href} className="flex-1 min-w-0" onClick={handleClick}>
        <p className="text-sm text-gray-800">
          <span className="font-semibold">{name}</span>{" "}{message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(n.createdAt)}</p>
      </Link>

      {/* Unread dot */}
      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}

      {/* Delete button */}
      <button onClick={() => onDelete(n.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5 cursor-pointer">
        <X size={15} />
      </button>
    </div>
  );
}


// ─── Build message + href per notification type ... separate to prevent it from being recreated on every render 
// if a function inside a component doesn't use props, state, or hooks, it belongs outside the component... it's a pure utility — could be moved to lib/utils.ts
function buildNotification(n: Notification): { message: string; href: string } {
  // Variables to get the post id and comment id
  const postId    = n.post?.id ?? n.tag?.post?.id;
  const commentId = n.comment?.id ?? n.tag?.comment?.id;
  // Switch statement to return (the message & href) based on the notification type
  switch (n.type) {
    case "REACTION":
      return { message: `reacted ${reactionEmoji[n.reactionType!] ?? "👍"} to your ${commentId ? "comment" : "post"}`, href: postId ? `/posts/${postId}` : "/" };
    case "COMMENT":
      return { message: `commented on your post`, href: postId ? `/posts/${postId}` : "/" };
    case "REPLY":
      return { message: `replied to your comment`, href: postId ? `/posts/${postId}` : "/" };
    case "SHARE":
      return { message: `shared your post`, href: postId ? `/posts/${postId}` : "/" };
    case "TAG":
      return { message: `mentioned you in a ${commentId ? "comment" : "post"}`, href: postId ? `/posts/${postId}` : "/" };
    case "FRIEND_REQUEST":
      return { message: `sent you a friend request`, href: "/friends" };
    case "FRIEND_REQUEST_ACCEPT":
      return { message: `accepted your friend request`, href: `/user/${n.sender?.id}` };
    default:
      return { message: "sent you a notification", href: "/" };
  }
}