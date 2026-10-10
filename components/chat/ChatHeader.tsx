"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/lib/socket/socketProvider";
import CallUI from "./CallUI";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import type { Conversation } from "@/lib/hooks/useChat";


// Chat header component displaying conversation name, avatar, online status, and group info button
export default function ChatHeader({ conversation, currentUserId, otherParticipant }: { conversation: Conversation; currentUserId: string; otherParticipant: { id: string; name: string; image: string | null } | null }) {
  
  const { onlineUsers } = useSocket();                        // get online users from socket context 
  const [showGroupInfo, setShowGroupInfo] = useState(false);  // state for group info modal

  // Display name — group name or the other person's name in a DM (1-on-1 conversations)
  const displayName = conversation.isGroup ? conversation.name ?? "Group" : otherParticipant?.name ?? "Unknown";

  // Avatar — group placeholder or other person's image
  const avatar = conversation.isGroup ? null : otherParticipant?.image ?? null;

  // Online status — only meaningful for DMs
  const isOnline = !conversation.isGroup && otherParticipant ? onlineUsers.has(otherParticipant.id) : false;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">

        {/* ← Back button — mobile only, goes back to conversation list */}
        <Link href="/messages" className="md:hidden shrink-0">
          <Button variant="ghost" size="icon" aria-label="Back to messages" className="cursor-pointer">
            <ArrowLeft size={20} />
          </Button>
        </Link>

        {/* Avatar */}
        <div className="relative shrink-0">
          {avatar ? (
            <Image src={avatar} alt={displayName} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
          ) : (
            // if no avatar, show placeholder with first initial 
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online dot — DMs only (1 on 1 conversations) */}
          {!conversation.isGroup && (
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{displayName}</p>
          <p className="text-xs text-gray-400">
            {conversation.isGroup ? `${conversation.participants.length} members` : isOnline ? "Online" : "Offline" }
          </p>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* WebRTC Video/Audio Call button — DMs only (1 on 1 conversations) */}
          {/* {!conversation.isGroup && otherParticipant && (<CallUI conversationId={conversation.id} participantName={otherParticipant.name} /> )} */}
          {/* LiveKit Video/Audio Call button, we'll use it in this app... we show the CallUI for both DMs and groups */ }
          <CallUI conversationId={conversation.id} />
          
          {/* Group info button — groups only */}
          {conversation.isGroup && (
            <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(true)} aria-label="Group info" className="text-gray-500 hover:text-blue-600 shrink-0" >
              <Info size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Group info panel — slide-in sheet component */}
      {showGroupInfo && (<GroupInfoPanel conversation={conversation} currentUserId={currentUserId}  onClose={() => setShowGroupInfo(false)} /> )}
    </>
  );
}