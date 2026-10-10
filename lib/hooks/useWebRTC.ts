"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/lib/socket/socketProvider";

export type CallState = "idle" | "calling" | "incoming" | "connected";

// WebRTC configuration
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },  // Google's public STUN server
  // Production TURN example:
  // { urls: "turn:your-turn-server.com:3478", username: "username", credential: "password" },
];


// UNUSED HOOK, we will use it if we use WebRTC, But we'll use LiveKit for this project.
export function useWebRTC(conversationId: string) {
  const { socketRef } = useSocket();            // Get socket reference from context

  // States & Refs
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"video" | "audio">("audio");
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup helper (internal only)
  // ─────────────────────────────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    // Close peer connection
    pcRef.current?.close();
    pcRef.current = null;

    // Stop all local media tracks
    localStream.current?.getTracks().forEach((track) => { track.stop() });
    localStream.current = null;

    // Clear video elements
    if (localRef.current) { localRef.current.srcObject = null; }
    if (remoteRef.current) { remoteRef.current.srcObject = null; }

    // Reset UI state
    setCallState("idle");
    setIncomingOffer(null);
    setIncomingFrom(null);
  }, []);


  // ─────────────────────────────────────────────────────────────────────────────
  // Create PeerConnection
  // ─────────────────────────────────────────────────────────────────────────────
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Send ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice_candidate", { conversationId, candidate: event.candidate });
      }
    };

    // Receive remote media tracks
    pc.ontrack = (event) => {
      if (remoteRef.current) { remoteRef.current.srcObject = event.streams[0]; }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("WebRTC connection state:", state);
      if ( state === "disconnected" || state === "failed" || state === "closed" ) {
        cleanupCall();
      }
    };

    pcRef.current = pc;           // Store peer connection
    return pc;                    // Return peer connection
  }, [conversationId, socketRef, cleanupCall]);


  // ─────────────────────────────────────────────────────────────────────────────
  // Get microphone/camera
  // ─────────────────────────────────────────────────────────────────────────────
  const getMedia = useCallback(
    async (type: "video" | "audio") => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });

      localStream.current = stream;
      if (localRef.current) { localRef.current.srcObject = stream; }

      return stream;
    },
    []
  );


  // ─────────────────────────────────────────────────────────────────────────────
  // Start outgoing call
  // ─────────────────────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (type: "video" | "audio") => {
      try {
        setCallType(type);
        setCallState("calling");

        const pc = createPC();

        const stream = await getMedia(type);

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => { pc.addTrack(track, stream); });

        // Create SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send offer through signaling server
        socketRef.current?.emit("call_user", { conversationId, offer, callType: type });
      } catch (error) {
        console.error("startCall error:", error);
        cleanupCall();
      }
    },
    [ conversationId, socketRef, createPC, getMedia, cleanupCall ]
  );


  // ─────────────────────────────────────────────────────────────────────────────
  // Accept incoming call
  // ─────────────────────────────────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    try {
      if (!incomingOffer) return;

      setCallState("connected");
      const pc = createPC();
      const stream = await getMedia(callType);
      // Add local tracks
      stream.getTracks().forEach((track) => { pc.addTrack(track, stream) });

      // Set remote offer
      await pc.setRemoteDescription( new RTCSessionDescription(incomingOffer) );

      // Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      socketRef.current?.emit("call_answer", { conversationId, answer });
    } catch (error) {
      console.error("answerCall error:", error);
      cleanupCall();
    }
  }, [
    incomingOffer, callType, conversationId, socketRef, createPC, getMedia, cleanupCall ]);


  // ─────────────────────────────────────────────────────────────────────────────
  // End call manually
  // ─────────────────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    cleanupCall();
    socketRef.current?.emit("call_end", { conversationId });
  }, [conversationId, socketRef, cleanupCall]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Reject incoming call
  // ─────────────────────────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    cleanupCall();
    socketRef.current?.emit("call_reject", { conversationId });
  }, [conversationId, socketRef, cleanupCall]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Socket listeners
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Incoming call
    socket.on( "incoming_call", ({ from, offer, callType: type }: { from: string; offer: RTCSessionDescriptionInit; callType: "video" | "audio"; }) => {
        setIncomingFrom(from);
        setIncomingOffer(offer);
        setCallType(type);
        setCallState("incoming");
      }
    );

    // Remote accepted call
    socket.on( "call_answered", async ({ answer }: { answer: RTCSessionDescriptionInit; }) => {
        try {
          await pcRef.current?.setRemoteDescription( new RTCSessionDescription(answer) );
          setCallState("connected");
        } catch (error) {
          console.error("call_answered error:", error);
        }
      }
    );

    // Receive ICE candidate
    socket.on( "ice_candidate", async ({ candidate }: { candidate: RTCIceCandidateInit; }) => {
        try {
          if (!candidate || !pcRef.current) return;
          await pcRef.current.addIceCandidate( new RTCIceCandidate(candidate) );
        } catch (error) {
          console.error("ICE candidate error:", error);
        }
      }
    );

    // Remote ended call
    socket.on("call_ended", () => { cleanupCall(); });

    // Remote rejected call
    socket.on("call_rejected", () => { cleanupCall(); });

    // Cleanup listeners
    return () => {
      socket.off("incoming_call");
      socket.off("call_answered");
      socket.off("ice_candidate");
      socket.off("call_ended");
      socket.off("call_rejected");
    };
  }, [socketRef, cleanupCall]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup on component unmount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {return () => { cleanupCall() } }, [cleanupCall]);

  // Return states and actions
  return { callState, callType, incomingFrom, startCall, answerCall, endCall, rejectCall, localRef, remoteRef };
}