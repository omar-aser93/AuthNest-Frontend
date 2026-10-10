"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/lib/socket/socketProvider";
import { getUnreadNotificationsCount } from "@/lib/queries/notificationQueries";
import { useAuth } from "../authProvider/AuthProviderClient";

// Typescript types for NotificationCountContext
type NotificationCountContextType = {
  count: number;
  refreshCount: () => Promise<void>;
  incrementCount: () => void;
};


// ------------- A GLOBAL NOTIFICATIONS COUNT BADGE ACROSS ALL PAGES -------------

// Create the NotificationCountContext
const NotificationCountContext = createContext<NotificationCountContextType | undefined>(undefined);

// Custom hook to be able to use the NotificationCountContext
export const useNotificationCount = () => {
  // get the context, if there is no context, throw an error, otherwise return the context
  const context = useContext(NotificationCountContext);
  if (!context) throw new Error("useNotificationCount must be used within NotificationCountProvider");
  return context;
};

// Provider component
export const NotificationCountProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState(0);              // State to hold the count
  const { socketRef, isConnected } = useSocket();     // Get socket instance
  const { user } = useAuth();                         // Get current user

  // ✅ Shared refresh count function – can be called from anywhere
  const refreshCount = useCallback(async () => {
    if (!user) return;                                 // don't fetch when logged out
    const res = await getUnreadNotificationsCount();
    setCount(res.count ?? 0);
  }, [user]);

  // increment count function, it increments the count state
  const incrementCount = useCallback(() => {
    setCount(prev => prev + 1);    
  }, []);


 // Initial fetch  
  useEffect(() => {    
    let isMounted = true;                 // Flag to check if component is mounted
    (async () => {
      // reset on logout — now inside async, not sync
      if (!user) { if (isMounted) setCount(0); return; }
      const res = await getUnreadNotificationsCount();    // Fetch unread notifications count
      if (isMounted) setCount(res.count ?? 0);            // Set count if component is still mounted
    })();
    return () => { isMounted = false; };                  // Cleanup on unmount
  }, [user]); // runs once on mount

  // Socket listener – increments count on new notification
  useEffect(() => {
    const socket = socketRef.current;                 // Get socket instance from the ref
    if (!socket || !isConnected) return;              // If not connected, do not listen    
    socket.on("new_notification", incrementCount);    // Listen for new_notification event
    return () => { socket.off("new_notification", incrementCount) };   // Cleanup on unmount
  }, [socketRef, isConnected, incrementCount]);

  return (
    // Provider Wrapper for the notification Context
    <NotificationCountContext.Provider value={{ count, refreshCount, incrementCount }}>
      {children}
    </NotificationCountContext.Provider>
  );
};