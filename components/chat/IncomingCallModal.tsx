"use client";

import { useState, useCallback } from "react";
import { useSocket } from "@/lib/socket/socketProvider";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, Loader2 } from "lucide-react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { getCallTokenAction } from "@/lib/actions/chatActions";
import { useCallSound } from "@/lib/hooks/useCallSound";
import { toast } from "sonner";


// Global Component to show incoming call modal when there's an incoming call, with options to accept or reject the call
export default function IncomingCallModal() {
  // Get incoming call info and socket instance from the SocketProvider context
  const { incomingCall, setIncomingCall, socketRef } = useSocket();

   // LiveKit room states
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [acceptedCallType, setAcceptedCallType] = useState<"audio" | "video">("audio");
  const [acceptedCallId, setAcceptedCallId] = useState<string | null>(null);

  // check if we should play the ringtone: if there's an incoming call, we're not currently joining or we don't have a token (not already in a call), then play the ringtone  
  useCallSound(incomingCall && !joining && !token ? "ringtone" : null);

  // ------------------------------------------------------------------------
  // Accept call – fetch token and join LiveKit room
  // ------------------------------------------------------------------------
  const accept = async () => {
    if (!incomingCall) return;
    setJoining(true);
    setAcceptedCallType(incomingCall.callType);
    setAcceptedCallId(incomingCall.callId);

    // 1. Notify backend that we accepted
    socketRef.current?.emit("call_answer", { callId: incomingCall.callId });

    // 2. Get LiveKit token
    const res = await getCallTokenAction(incomingCall.conversationId);
    if (res.error) {
      toast.error(res.error);
      setJoining(false);
      // Optionally reject the call so backend knows we failed
      socketRef.current?.emit("call_reject", { callId: incomingCall.callId });
      setIncomingCall(null);
      return;
    }

    // 3. Show LiveKit room
    setToken(res.token);
    setServerUrl(res.url);
    // Clear the incoming call modal – the active call UI will now be rendered by this component
    setIncomingCall(null);
  };

  // ------------------------------------------------------------------------
  // Reject call
  // ------------------------------------------------------------------------
  const reject = () => {
    if (!incomingCall) return;
    socketRef.current?.emit("call_reject", { callId: incomingCall.callId });
    setIncomingCall(null);
  };

  // ------------------------------------------------------------------------
  // Leave call (when user hangs up from the active room)
  // ------------------------------------------------------------------------
  const leaveCall = useCallback(() => {
    if (acceptedCallId) socketRef.current?.emit("call_leave", { callId: acceptedCallId });
    setToken(null);
    setServerUrl(null);
    setJoining(false);
  }, [acceptedCallId, socketRef]);

  // ------------------------------------------------------------------------
  // If we have token – show active call UI (same as CallUI but embedded)
  // ------------------------------------------------------------------------
  if (token && serverUrl) {
    return (
      <div data-lk-theme="default" className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <LiveKitRoom token={token} serverUrl={serverUrl} video={acceptedCallType === "video"} audio={true} onDisconnected={leaveCall} className="flex-1" >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Incoming call modal (before accept)
  // ------------------------------------------------------------------------
  if (incomingCall && !joining) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-100">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl w-80">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            {incomingCall.callType === "video" ? (
              <Video size={28} className="text-blue-600 cursor-pointer" />
            ) : (
              <Phone size={28} className="text-blue-600 cursor-pointer" />
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{incomingCall.fromName}</p>
            <p className="text-sm text-gray-500">Incoming {incomingCall.callType} call</p>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-1">
              <Button className="bg-red-500 hover:bg-red-600 rounded-full w-14 h-14" onClick={reject}>
                <PhoneOff size={22} />
              </Button>
              <span className="text-xs text-gray-500">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button className="bg-green-500 hover:bg-green-600 rounded-full w-14 h-14" onClick={accept}>
                <Phone size={22} />
              </Button>
              <span className="text-xs text-gray-500">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while accepting
  if (joining) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-100">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-gray-600">Joining call...</p>
        </div>
      </div>
    );
  }

  return null;
}