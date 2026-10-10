
"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { getCallTokenAction } from "@/lib/actions/chatActions";
import { useSocket } from "@/lib/socket/socketProvider";
import { useCallSound } from "@/lib/hooks/useCallSound";
import { toast } from "sonner";


// ------------ LiveKit Video/Audio Call UI component ------------
export default function CallUI({ conversationId }: { conversationId: string; }) {
  // States to manage  the call token, server URL, call type (audio/video), connecting status, current call ID and if we're waiting for an answer.
  const [token, setToken]       = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [connecting, setConnecting] = useState(false);
  const [callId, setCallId]         = useState<string | null>(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  
  // From the SocketProvider context, Get socket instance and setIncomingCall function 
  const { socketRef, setIncomingCall } = useSocket();  

  // Play outgoing dial tone while waiting for answer using the useCallSound hook
  useCallSound(isWaitingForAnswer ? "calling" : null);
      
  // Join the call Function
  const joinCall = async (type: "audio" | "video") => {
    setConnecting(true);          // set the connecting status
    setCallType(type);            // set the call type (audio/video) based on user selection
    // Server-action to get the token and server URL for the call, If error show toast and reset state
    const res = await getCallTokenAction(conversationId);
    if (res.error) { toast.error(res.error); setConnecting(false); return; }
    // Emit socket event to tell backend a call is starting — creates Call record + rings others
    socketRef.current?.emit( "call_user", { conversationId, callType: type }, (response: { callId?: string; error?: string }) => {
        if (response?.error) { toast.error(response.error); setIsWaitingForAnswer(false); }
        if (response?.callId) { setCallId(response.callId); setIsWaitingForAnswer(true); }
      }
    );
    setToken(res.token);             // set the token state with the received token
    setServerUrl(res.url);           // set the server URL state with the received server URL
    setConnecting(false);            // reset the connecting status
  };


  // Leave the call Function
  const leaveCall = useCallback(() => {
    // emit socket event to tell backend user is leaving    
    if (callId) socketRef.current?.emit("call_leave", { callId });  
    setIncomingCall(null);         // reset the state & clear any stale incoming call 
    setToken(null);                // reset the token state to null, this will unmount the LiveKitRoom component & disconnect the call
    setServerUrl(null);            // reset the server URL state to null
    setCallId(null);               // reset the call ID state to null  
    setIsWaitingForAnswer(false);  // reset the waiting for answer status to stop dial tone when leaving  
  }, [callId, socketRef, setIncomingCall]);


  // Effect to Stop dial tone when the call is answered, missed, or ended
  useEffect(() => {
    // get the current socket instance from the ref, if no socket, return early
    const socket = socketRef.current;
    if (!socket) return;
    // Define the event handler to stop the dial tone, it will be called when we receive "call_answered", "call_missed", or "call_ended_all" socket events.
    const stopWaiting = () => setIsWaitingForAnswer(false);
    socket.on("call_answered", stopWaiting);
    socket.on("call_missed", stopWaiting);
    socket.on("call_ended_all", stopWaiting);
    // Clean up the event listeners on unmount
    return () => { socket.off("call_answered", stopWaiting); socket.off("call_missed", stopWaiting); socket.off("call_ended_all", stopWaiting); };
  }, [socketRef]);

  // Effect to listen for "call_ended_all" event from the socket, then call the leaveCall function to clean up the call state and disconnect from LiveKit
  useEffect(() => {
    // get the current socket instance from the ref, if no socket, return early
    const socket = socketRef.current;
    if (!socket) return;
    // Define the event handler for "call_ended_all" event, it checks if the ended call ID matches the current call ID, if yes, it calls leaveCall function to clean up the call state
    const onEndedAll = ({ callId: endedCallId }: { callId: string }) => { if (endedCallId === callId) leaveCall() };
    socket.on("call_ended_all", onEndedAll);
    return () => { socket.off("call_ended_all", onEndedAll); };   // Clean up the event listener on unmount 
  }, [socketRef, callId, leaveCall]);


  // If Active call, Render this UI
  if (token && serverUrl) {
    return (
      <div data-lk-theme="default" className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <LiveKitRoom token={token} serverUrl={serverUrl} video={callType === "video"} audio={true} onDisconnected={leaveCall} className="flex-1" >
          {/* VideoConference handles participant grid automatically */}
          <VideoConference />
          <RoomAudioRenderer />          
        </LiveKitRoom>
      </div>
    );
  }

  // If Idle — show call buttons in header
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" disabled={connecting} onClick={() => joinCall("audio")} title="Voice call">
        <Phone size={18} />
      </Button>
      <Button variant="ghost" size="icon" disabled={connecting} onClick={() => joinCall("video")} title="Video call">
        <Video size={18} />
      </Button>
    </div>
  );
}




// // UNUSED: WebRTC Call UI component that shows call controls and video elements based on the current call state
// "use client";

// import { Phone, PhoneOff, Video } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useWebRTC } from "@/lib/hooks/useWebRTC";

// export default function CallUI({ conversationId, participantName }: { conversationId: string; participantName: string }) {
//   // Get call state and actions from the useWebRTC hook
//   const { callState, callType, incomingFrom, startCall, answerCall, endCall, rejectCall, localRef, remoteRef } = useWebRTC(conversationId);
  
//   // ------------------ Render based on call state ---------------
//   // if idle, show call buttons;  
//   if (callState === "idle") return (
//     <div className="flex gap-2">
//       <Button variant="ghost" size="icon" onClick={() => startCall("audio")} title="Voice call"><Phone size={18} /></Button>
//       <Button variant="ghost" size="icon" onClick={() => startCall("video")} title="Video call"><Video size={18} /></Button>
//     </div>
//   );

//   // if incoming, show accept/reject UI;
//   if (callState === "incoming") return (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//       <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl">
//         <p className="text-xl font-semibold">Incoming {callType} call</p>
//         <p className="text-gray-500">{incomingFrom}</p>
//         <div className="flex gap-6">
//           <Button className="bg-green-500 hover:bg-green-600 rounded-full w-16 h-16" onClick={answerCall}><Phone size={24} /></Button>
//           <Button className="bg-red-500 hover:bg-red-600 rounded-full w-16 h-16" onClick={rejectCall}><PhoneOff size={24} /></Button>
//         </div>
//       </div>
//     </div>
//   );

//   // if in ACTIVE call, show video and end button
//   return (
//     <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
//       {/* Video Call UI */}
//       {callType === "video" ? (
//         <>
//           {/* Remote video */}
//           <video ref={remoteRef} autoPlay playsInline className="flex-1 w-full object-cover" />
//           {/* Local video (PiP) */}
//           <video ref={localRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white" />
//         </>
//       ) : (
//         /* Audio Call UI */
//         <div className="flex-1 flex items-center justify-center text-white text-2xl"> Voice Call with {participantName} </div>
//       )} 
      
//       {/* Controls */}
//       <div className="flex justify-center gap-6 p-6 bg-gray-900">
//         <p className="text-white self-center">{callState === "calling" ? "Calling..." : "Connected"}</p>
//         <Button className="bg-red-500 hover:bg-red-600 rounded-full w-14 h-14" onClick={endCall}><PhoneOff size={22} /></Button>
//       </div>
//     </div>
//   );
// }

