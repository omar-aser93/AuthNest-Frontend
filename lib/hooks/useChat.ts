// A custom hook that centralises everything as the single source of truth for everything happening inside one open conversation.
/* Without it, every component would need to:
- Import & use useSocket directly, Register its own socket.on(...) listeners, Manage its own message state, and Clean up its own listeners on unmount
- That means (MessageList, MessageInput, TypingIndicator, ...) would all be fighting over the same socket events, duplicating state, and causing race conditions.
*/

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/lib/socket/socketProvider";
import { getMessages } from "@/lib/queries/chatQueries";
import { sendGifAction } from "@/lib/actions/chatActions";
import { toast } from "sonner";


// ─── TypeScript inerfaces, export: because they might be used in other components ───────────
export interface Conversation { 
  id: string; 
  isGroup: boolean; 
  name: string | null; 
  participants: { userId: string; user: { id: string; name: string; image: string | null } }[];
}

export interface MessageUser {
  id: string;
  name: string;
  image: string | null;
}

export interface MessageAttachment {
  id: string;
  url: string;
  publicId: string;
  fileType: string;   // 'image' | 'video' | 'application'
  fileName: string;
  fileSize: number;
}

export interface MessageRead {
  userId: string;
  readAt: string;
  user: MessageUser;
}

export interface MessageReaction {
  id: string;
  type: string;
  userId: string;
  user: MessageUser;
}

export interface Message {
  id: string;
  content: string | null;       // null = soft deleted
  senderId: string;
  sender: MessageUser;
  conversationId: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  reactionSummary: Record<string, number> | null;
  reactionCount: number;
  reads: MessageRead[];
  tags: { tagged: MessageUser }[];
  editHistory: { id: string }[];
  createdAt: string;
  updatedAt: string;
}

interface UseChatOptions {
  initialMessages?: Message[];
  initialNextCursor?: string | null;
}



// ─── UseChat Hook ──────────────────────────────────────────────────────────
export function useChat(conversationId: string, { initialMessages = [], initialNextCursor = null }: UseChatOptions = {}) {
  
  const { socketRef } = useSocket();     // get Socket context, which provides the connected socket instance (or null if not connected)
  // states for messages, typing users, loading more, pagination cursor, and if there's more to load
  const [messages, setMessages]         = useState<Message[]>(initialMessages);
  const [typingUsers, setTypingUsers]   = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor]     = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore]           = useState(!!initialNextCursor);
  // Ref for auto-stop typing timer — doesn't need to trigger re-renders
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // ─── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !conversationId) return;

    // Mark conversation as read as soon as we open it
    socket.emit("mark_read", { conversationId });

    // ── New message ──────────────────────────────────────────────────────────
    const onNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages(prev => {
        // Prevent duplicates — can happen on reconnect
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read since we're actively viewing this conversation
      socket.emit("mark_read", { conversationId });
    };

    // ── Message edited ───────────────────────────────────────────────────────
    const onMessageEdited = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
    };

    // ── Message soft-deleted (content nulled, record kept) ───────────────────
    const onMessageDeleted = ({ messageId, conversationId: cId }: { messageId: string; conversationId: string }) => {
      if (cId !== conversationId) return;
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: null, attachments: [] } : m
      ));
    };

    // ── Typing indicators ────────────────────────────────────────────────────
    const onTyping = ({ userId, conversationId: cId }: { userId: string; conversationId: string }) => {
      if (cId !== conversationId) return;
      setTypingUsers(prev => new Set([...prev, userId]));
    };

    const onStopTyping = ({ userId, conversationId: cId }: { userId: string; conversationId: string }) => {
      if (cId !== conversationId) return;
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    // ── Read receipts ────────────────────────────────────────────────────────
    const onMessagesRead = ({ userId, conversationId: cId, readAt }: { userId: string; conversationId: string; readAt: string }) => {
      if (cId !== conversationId) return;
      // Add this user to the reads array of every message they haven't read yet
      setMessages(prev => prev.map(m => {
        if (m.reads.some(r => r.userId === userId)) return m;  // already marked
        return {
          ...m,
          reads: [...m.reads, { userId, readAt, user: { id: userId, name: "", image: null } }],
        };
      }));
    };

    // ── Register all listeners ───────────────────────────────────────────────
    socket.on("new_message",       onNewMessage);
    socket.on("message_edited",    onMessageEdited);
    socket.on("message_deleted",   onMessageDeleted);
    socket.on("user_typing",       onTyping);
    socket.on("user_stopped_typing", onStopTyping);
    socket.on("messages_read",     onMessagesRead);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      socket.off("new_message",        onNewMessage);
      socket.off("message_edited",     onMessageEdited);
      socket.off("message_deleted",    onMessageDeleted);
      socket.off("user_typing",        onTyping);
      socket.off("user_stopped_typing", onStopTyping);
      socket.off("messages_read",      onMessagesRead);
    };
  }, [conversationId, socketRef]);
  // Note: socketRef is a ref — it never changes reference, so this effect
  // only re-runs when conversationId changes (user navigates to different chat)


  // ─── Load older messages (scroll up → load previous page) ─────────────────
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await getMessages(conversationId, nextCursor);
      if (data?.messages) {
        // Prepend older messages — MessageList handles scroll preservation
        setMessages(prev => [...data.messages, ...prev]);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(!!data.nextCursor);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, nextCursor, isLoadingMore]);


  // ─── Send text message (socket — fast path, no HTTP) ──────────────────────
  // File messages go through REST (sendWithFiles below) because socket can't handle binary
  const sendTextMessage = useCallback((content: string, taggedUserIds?: string[]) => {
    const socket = socketRef.current;
    if (!socket || !content.trim()) return;
    // No optimistic update needed — server broadcasts new_message back to sender too
    // so onNewMessage handler above will add it to the list automatically
    socket.emit("send_message", { conversationId, content: content.trim(), taggedUserIds });
  }, [conversationId, socketRef]);


  // ─── Send message with files (REST — server uploads to Cloudinary, then broadcasts via socket) ──
  const sendWithFiles = useCallback(async (content: string, files: File[], taggedUserIds?: string[]) => {
    const csrfToken = document.cookie.split("; ").find(r => r.startsWith("csrfToken="))?.split("=")[1];
    const formData = new FormData();
    if (content?.trim()) formData.append("content", content.trim());
    files.forEach(file => formData.append("attachments", file));
    taggedUserIds?.forEach(id => formData.append("taggedUserIds", id));

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}/api/v1/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        // No Content-Type — browser sets multipart/form-data boundary automatically
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to send message");
    }
    // No state update needed here — server broadcasts new_message via socket
    // and onNewMessage handler appends it to messages[] automatically
  }, [conversationId]);


  // ─── Send GIF (socket — fast path, no HTTP) ───────────────────────────────
  const sendGif = useCallback(
    async (gif: { url: string; }) => {
      const res = await sendGifAction(conversationId, gif);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      // Socket broadcasts new_message back to sender — no manual append needed
    },
    [conversationId]
  );

  // ─── Typing indicators ─────────────────────────────────────────────────────
  const emitTypingStart = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("typing_start", { conversationId });
    // Auto-stop after 1.5s of no input — prevents stale "is typing" if user stops abruptly
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId });
    }, 1500);
  }, [conversationId, socketRef]);

  const emitTypingStop = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socket.emit("typing_stop", { conversationId });
  }, [conversationId, socketRef]);


  // ─── Message actions (socket — instant, no HTTP roundtrip) ────────────────
  const editMessage = useCallback((messageId: string, data: { content: string; taggedUserIds?: string[] }) => {
    socketRef.current?.emit("edit_message", { messageId, content: data.content, taggedUserIds: data.taggedUserIds });
  }, [socketRef]);

  const softDeleteMessage = useCallback((messageId: string) => {
    // Soft delete via socket — nulls content, keeps DB record + thread intact
    socketRef.current?.emit("delete_message", { messageId });
  }, [socketRef]);


  // ─── Return everything ChatWindow needs ───────────────────────────────────
  return {
    // State
    messages, typingUsers, hasMore, isLoadingMore,
    // Actions
    loadMore, sendTextMessage, sendWithFiles, sendGif, emitTypingStart, emitTypingStop, editMessage, softDeleteMessage,
  };
}