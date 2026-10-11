"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { toast } from "sonner";

// Type for incoming call info, null if no incoming call
type IncomingCall = {
  callId: string;
  conversationId: string;
  from: string;
  fromName: string;
  callType: "audio" | "video";
} | null;


// ─── Context  ───────────────────────────────────────────────
const SocketContext = createContext<{ socketRef: React.RefObject<Socket | null>; isConnected: boolean; onlineUsers: Set<string>; incomingCall: IncomingCall; setIncomingCall: (call: IncomingCall) => void;} | null>(null);

// ─── Provider using the Context ─────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();           // get current user from AuthProviderClient 
  const [isConnected, setIsConnected] = useState(false);                   // State to store connection state
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());  // State to store online user IDs
  const [incomingCall, setIncomingCall] = useState<IncomingCall>(null);    // State to store incoming call info (LIVEKIT CALL)
  // store socket instance in a ref (not state, because we don't want re-renders when socket instance changes)
  const socketRef = useRef<Socket | null>(null);    
  
  // useEffect to initialize socket connection on mount and clean up on unmount, also re-run when user ID changes (login/logout)
  useEffect(() => {
    if (!user?.id) return;          // If user is not logged in, do not connect to socket, return early
   
    let cancelled = false;          // flag to check if the effect has been cancelled
    let retries = 0;                // counter for retries

    // Initialize socket connection with backend origin from env variables, set autoConnect to false, as we'll connect when we get the token 
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_ORIGIN!, {
      autoConnect: false,
      // Called on every (re)connect attempt — always fresh
      auth: (cb) => {
        const fetchToken = () => fetch("/api/socket-token", { cache: "no-store" });
        fetchToken()
          .then(async (r) => {
            if (r.status !== 401) return r;
            // Access cookie expired — refresh once, then retry.
            const refreshed = await fetch("/api/v1/auth/refresh-token", { method: "POST", cache: "no-store" });
            if (!refreshed.ok) return null;
            return fetchToken();
          })
          .then((r) => (r && r.ok ? r.json() : { token: null }))
          .then((d) => cb({ token: d.token ?? undefined }))
          .catch(() => cb({ token: undefined }));
      },
    });
    socketRef.current = socket;    // Store socket instance in the ref

  
    // ─── Set the Connection states  ─────────────────────────────────────────
    socket.on("connect", () => { retries = 0; setIsConnected(true); });
    socket.on("disconnect", () => setIsConnected(false));

    // ─── Retry connection on error  ────────────────────────────────────────
    socket.on("connect_error", async (err) => {
      // Do not retry permanent failures
      if (err.message === "Your account has been suspended") return;
      if (err.message === "User not found") return;
      // Cap retries
      if (retries++ >= 3) return;
      // Backoff before retrying
      await new Promise((r) => setTimeout(r, 1000 * retries));
      if (cancelled) return;
      socket.connect();
    });

    // ─── listener for initial online users  ─────────────────────────────────
    socket.on("online_users", ({ users }: { users: string[] }) => {
      setOnlineUsers(new Set(users));
    });

    // ─── Presence ────────────────────────────────────────────────────────────
    socket.on("user_online", ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    });
    socket.on("user_offline", ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => { const next = new Set(prev); next.delete(userId); return next; });
    });


    // ─── Call events (LIVEKIT Calls)  ────────────────────────────────────────
    socket.on("incoming_call", (data) => setIncomingCall(data));
    socket.on("call_answered", () => setIncomingCall(null));
    socket.on("call_rejected", () => setIncomingCall(null));
    socket.on("call_ended_all", () => setIncomingCall(null));
    socket.on("call_missed", ({ missedBy }: { missedBy: string[]; callId: string; conversationId: string }) => {
      toast(`${missedBy.length} participant(s) missed the call`);
    });


    // ─── Room management ─────────────────────────────────────────────────────
    // Server emits join_new_conversation after DM/group creation, so the socket joins the room without needing a full reconnect
    socket.on("join_new_conversation", ({ conversationId }: { conversationId: string }) => {
      socket.emit("join_conversation", { conversationId });
    });
    // Server emits removed_from_conversation when user is kicked from a group
    socket.on("removed_from_conversation", ({ conversationId }: { conversationId: string }) => {
      socket.emit("leave_conversation", { conversationId });
    });

    socket.connect();                 // Connect socket

    // ─── Cleanup on unmount ─────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("online_users");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("incoming_call");
      socket.off("call_answered");
      socket.off("call_rejected");
      socket.off("call_ended_all");
      socket.off("call_missed");
      socket.off("join_new_conversation");
      socket.off("removed_from_conversation");
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers(new Set());
      setIncomingCall(null);
    };
  }, [user?.id]);  // re-run only when user id changes (login / logout)

  return (
    <SocketContext.Provider value={{ socketRef, isConnected, onlineUsers, incomingCall, setIncomingCall }}>
      {children}
    </SocketContext.Provider>
  );
}


// ─── The Hook that reads the Context & used in Client components ──────────
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}