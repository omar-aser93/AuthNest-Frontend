"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/lib/socket/socketProvider";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import type { Message } from "@/lib/hooks/useChat";

// Typescript types for UnreadContext
type UnreadContextType = {
  unreadMap: Record<string, number>;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  totalUnread: number;
};


// ------------- A GLOBAL MESSAGES UNREAD COUNT BADGE ACROSS ALL PAGES -------------

// Create the UnreadContext
const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

// Custom hook to be able to use the UnreadContext
export const useUnreadCount = () => {
  // get the context, if there is no context, throw an error, otherwise return the context
  const context = useContext(UnreadContext);
  if (!context) throw new Error("useUnreadCount must be used within UnreadCountProvider");
  return context;
};

// Provider component
export const UnreadCountProvider = ({ children }: { children: React.ReactNode }) => {
  const { socketRef, isConnected } = useSocket();      // get socket instance
  const { user } = useAuth();                          // get current user (authProviderServer -> cached server-action)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});  // Global State to hold unread counts

  // incrementUnread function to update unread counts
  const incrementUnread = useCallback((conversationId: string) => {
    setUnreadMap(prev => ({ ...prev, [conversationId]: (prev[conversationId] ?? 0) + 1 }));
  }, []);

  // clearUnread function to reset unread counts
  const clearUnread = useCallback((conversationId: string) => {
    setUnreadMap(prev => { const next = { ...prev }; delete next[conversationId]; return next; });
  }, []);

  // calculate the total (sum of all unread counts) for the navbar/sidebar badges outside the chat pages
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  // Fetch unread counts when user logs in (user?.id changes)
  useEffect(() => {
    if (!user?.id) return;    // no user → keep empty map (already empty)
    // function for initial fetch of unread counts from the DB
    const fetchUnread = async () => {
      try {
        // API call to fetch unread counts from the backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}/api/v1/chat/unread`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();            // parse the response
          setUnreadMap(data.unreadMap);             // update the unread map
        }
      } catch (error) {
        console.error("Failed to fetch unread counts", error);        // log error
      }
    };
    fetchUnread();   // call the fetchUnread function
  }, [user?.id]);    // re‑fetch on login dependency

  // Socket listeners for real‑time updates
  useEffect(() => {
    const socket = socketRef.current;           // Get socket instance from the ref
    if (!socket || !isConnected) return;        // If socket is not connected, return

    // Listener for new messages, if the sender is not the current user -> increment unread
    const onNewMessage = (msg: Message) => {
      if (msg.senderId !== user?.id)  incrementUnread(msg.conversationId);
   };

    // Listener for messages read, if the sender is the current user -> clear unread
    const onMessagesRead = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      if (userId === user?.id) clearUnread(conversationId);     
    };

    // Listener for removed from conversation -> clear unread
    const onRemovedFromConversation = ({ conversationId }: { conversationId: string }) => {
      clearUnread(conversationId);
    };

    // register the listeners
    socket.on("new_message", onNewMessage);
    socket.on("messages_read", onMessagesRead);
    socket.on("removed_from_conversation", onRemovedFromConversation);

    // clean up the listeners
    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("messages_read", onMessagesRead);
      socket.off("removed_from_conversation", onRemovedFromConversation);
    };
  }, [socketRef, isConnected, user?.id, incrementUnread, clearUnread]);

  return (
    // Provider Wrapper for the UnreadContext
    <UnreadContext.Provider value={{ unreadMap, incrementUnread, clearUnread, totalUnread }}>
      {children}
    </UnreadContext.Provider>
  );
};