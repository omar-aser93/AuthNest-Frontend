"use client";

import { useEffect, useRef, useCallback } from "react";
import MessageBubble from "@/components/chat/MessageBubble";
import { groupMessagesByDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { Message } from "@/lib/hooks/useChat";

// TypeScript interface for the props of the MessageList component
interface Props {
  messages: Message[];
  currentUserId: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onEditMessage: (messageId: string, data: { content: string; taggedUserIds?: string[] }) => void;
  onDeleteMessage: (messageId: string) => void;
}

// MessageList component, renders chat messages with infinite scroll and date grouping, ...
export default function MessageList({ messages, currentUserId, hasMore, isLoadingMore, onLoadMore, onEditMessage, onDeleteMessage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);      // anchor to scroll to bottom
  const containerRef = useRef<HTMLDivElement>(null);   // scrollable container
  const prevScrollHeightRef = useRef<number>(0);       // stores scroll height before prepending older messages

  // ─── Scroll to bottom on new message (only if user is near bottom) ─────────
  useEffect(() => {
    // get current container ref, if not available, return early
    const container = containerRef.current;  
    if (!container) return;
    // Check if user is near the bottom before auto-scrolling
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    // Always scroll to bottom on initial load or when user is near the bottom
    if (isNearBottom || messages.length <= 30) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  // ─── Preserve scroll position when older messages are prepended ────────────
  // Without this, loading older messages jumps the view to the top
  useEffect(() => {
    // get current container ref, if not available or not loading older messages, return early
    const container = containerRef.current;
    if (!container || !isLoadingMore) return;
    prevScrollHeightRef.current = container.scrollHeight;  // snapshot before prepend
  }, [isLoadingMore]);
   
  useEffect(() => {
    // get current container ref, if not available or loading older messages, return early
    const container = containerRef.current;
    if (!container || isLoadingMore) return;
    // After prepend: restore position by adjusting scrollTop by the height difference
    const diff = container.scrollHeight - prevScrollHeightRef.current;
    if (diff > 0) container.scrollTop += diff;
  }, [messages, isLoadingMore]);


  // ─── Detect scroll to top → load more ─────────────────────────────────────
  const handleScroll = useCallback(() => {
    // get current container ref, if not available, return early
    const container = containerRef.current;
    if (!container) return;
    // Trigger load when user scrolls within 100px of the top
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);


  // ─── Group messages by date (Exported utility), Inserts a date separator between messages from different days ─────────
  const groupedMessages = groupMessagesByDate(messages);


  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-2 space-y-1" >
      {/* Load more spinner at the top */}
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Load more button — shown when there are older messages and not currently loading */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center py-2">
          <button onClick={onLoadMore} className="text-xs text-blue-500 hover:underline" >
            Load earlier messages.
          </button>
        </div>
      )}

      {/* Message groups with date separators */}
      {groupedMessages.map(({ date, messages: dayMessages }) => (
        <div key={date}>

          {/* Date separator */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 shrink-0">{date}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Messages for this day */}
          {dayMessages.map((msg, index) => {
            const prevMsg   = dayMessages[index - 1];
            // Group consecutive messages from the same sender — hide avatar/name for follow-ups
            const isGrouped = !!prevMsg && prevMsg.senderId === msg.senderId;

            return (
              // Single Message bubble component, we pass the necessary props. 
              <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} isGrouped={isGrouped} onEdit={onEditMessage} onDelete={onDeleteMessage} />
            );
          })}
        </div>
      ))}

      {/* Empty state, Show no messages yet */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-20">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Be the first to say something 👋</p>
        </div>
      )}

      {/* Invisible anchor — scrolled to on new message */}
      <div ref={bottomRef} />
    </div>
  );
}
