"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { reactionType } from "@/lib/validator";
import { ThumbsUp, Heart, Smile, Eye, Frown, Angry } from "lucide-react";
import { reactToCommentAction, reactToPostAction, removeCommentReactionAction, removePostReactionAction,  reactToMessageAction, removeMessageReactionAction } from "@/lib/actions/reactionActions";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { useMounted } from "@/lib/hooks/useMounted";
import { useSocket } from "@/lib/socket/socketProvider";
import { Button } from "@/components/ui/button";

// Array of Reaction types with icons and colors
const REACTION_TYPES = [
  { type: "LIKE", label: "Like", icon: ThumbsUp, emoji: "👍", color: "text-blue-600" },
  { type: "LOVE", label: "Love", icon: Heart, emoji: "❤️", color: "text-red-500" },
  { type: "HAHA", label: "Haha", icon: Smile, emoji: "😄", color: "text-yellow-500" },
  { type: "WOW", label: "Wow", icon: Eye, emoji: "😲", color: "text-yellow-400" },
  { type: "SAD", label: "Sad", icon: Frown, emoji: "😢", color: "text-blue-400" },
  { type: "ANGRY", label: "Angry", icon: Angry, emoji: "😠", color: "text-orange-500" },
] as const;


// Reaction Button component, receives target type (post/comment/message), targetId, initial reaction count, user's initial reaction (if any), and initial reaction summary - as props
export default function ReactionButton({ target, targetId, initialCount, initialReaction, initialSummary }: 
    { target: "post" | "comment"; targetId: string; initialCount: number; initialReaction?: reactionType | null; initialSummary?: never; }
    | { target: "message"; targetId: string; initialCount: number; initialReaction?: reactionType | null; initialSummary: Partial<Record<reactionType, number>>; }) {
  
  const { user } = useAuth();              // get current user from AuthProviderClient
  const mounted = useMounted();            // check if component is mounted (to avoid hydration errors)
  const { socketRef } = useSocket();       // listen for real-time updates to chat messages reactions via WebSocket   
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);   // Ref to store the timer for hiding the reaction picker
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);  // Ref to store the timer for long-press on mobile devices
  
  // States to track reaction count + track user's reaction (defaults to initial_reaction/null), message reaction summary + show/hide reaction picker 
  const [count, setCount] = useState(initialCount);            
  const [reaction, setReaction] = useState<reactionType | null>(initialReaction ?? null ); 
  const [summary, setSummary] = useState<Partial<Record<reactionType, number>>>(initialSummary ?? {});
  const [showReactionPicker, setShowReactionPicker] = useState(false);   
  // useTransition for async server-actions, used to show loading state when reacting or removing reaction
  const [isPending, startTransition] = useTransition();


  // ─── Real-time: listen for message_reaction_updated event (chat message only, not post or comment) ──
  useEffect(() => {
    if (target !== "message") return;           // If target is not a message, return
    const socket = socketRef.current;           // Get socket instance from the ref
    if (!socket) return;                        // If socket is not connected, return out
    // Handler function to update reaction summary and count when a message reaction is updated in real-time
    const handler = ({ messageId, summary: newSummary, count: newCount }: { messageId: string; summary: Partial<Record<reactionType, number>>; count: number; conversationId: string }) => {
      if (messageId !== targetId) return;
      setSummary(newSummary);
      setCount(newCount);
    };
    // Listen for message_reaction_updated events from the socket
    socket.on("message_reaction_updated", handler);    
    return () => { socket.off("message_reaction_updated", handler); };    // Cleanup: remove event listener on unmount  
  }, [target, targetId, socketRef]);


  // Function to handle reaction change (optimistically updates the UI, then calls the appropriate server-action based on whether the user has already reacted or not)
  const handleReaction = (pickedReaction: reactionType) => {
    if (!user) return;             // If user is not logged in, return out of the function (button is already disabled in this case, but this is an extra safeguard)
    startTransition(async () => {      
      // Store previous reaction, count and summary for potential rollback if API call fails
      const prevReaction = reaction;
      const prevCount = count; 
      const prevSummary  = { ...summary }; 
      // ---------- If user clicks same reaction again -> they want to remove their reaction ------------
      if (reaction === pickedReaction) {
        setReaction(null);                        // set reaction state to null 
        setCount(prev => Math.max(0, prev - 1));  // decrement reaction count (but not below 0)
        // If it's a message reaction, also update the summary counts optimistically
        if (target === "message") {
          setSummary(prev => {
            const next = { ...prev };    // create a new summary object based on the previous summary
            next[pickedReaction] = Math.max(0, (next[pickedReaction] ?? 0) - 1);  // decrement count for the removed reaction type
            if (!next[pickedReaction]) delete next[pickedReaction];   // if count goes to 0, remove the reaction type from the summary
            return next;        // return the updated summary object to update the state
          });
        }
        setShowReactionPicker(false);             // Hide reaction picker after removing reaction
        // call remove Reaction server-action based on the target type (post or comment or message)
        const res = target === "post" ? await removePostReactionAction(targetId) : target === "comment" ? await removeCommentReactionAction(targetId) : await removeMessageReactionAction(targetId);  
        // If there's an error with the API call, revert the count & reaction UI changes & summary for messages
        if (res.error) { setCount(prevCount); setReaction(prevReaction); if (target === "message") setSummary(prevSummary) }                
      } else { 
        // --------------- User is picking a new reaction (or changing their reaction) ----------------
        setReaction(pickedReaction);                 // set reaction state to the new reaction
        if (!reaction) setCount(prev => prev + 1);   // If user had no previous reaction, increment count. If they had a previous reaction, count stays the same (one reaction replaced by another)
        // If it's a message reaction, also update the summary counts optimistically
        if (target === "message") {
          setSummary(prev => {
            const next = { ...prev };    // create a new summary object based on the previous summary
            // if there was a prev reaction (just switching from one reaction type to another)
            if (prevReaction) {
              next[prevReaction] = Math.max(0, (next[prevReaction] ?? 0) - 1);  // decrement count for the previous reaction type
              if (!next[prevReaction]) delete next[prevReaction];     // if count goes to 0, remove the previous reaction type from the summary
            }
            next[pickedReaction] = (next[pickedReaction] ?? 0) + 1;    // increment count for the new reaction type
            return next;         // return the updated summary object to update the state
          });
        }         
        setShowReactionPicker(false);                // Hide reaction picker after picking a reaction
        // call reaction server-action based on the target type (post or comment or message)
        const res = target === "post" ? await reactToPostAction(targetId, pickedReaction) : target === "comment" ? await reactToCommentAction(targetId, pickedReaction) : await reactToMessageAction(targetId, pickedReaction);  
        // If there's an error with the API call, revert the count & reaction UI changes & summary for messages
        if (res.error) { setCount(prevCount); setReaction(prevReaction); if (target === "message") setSummary(prevSummary) }             
      }
    });
  }

  
  // ------- Handlers for showing/hiding the reaction picker based on mouse enter/leave -----------
  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current); // cancel any pending hide
    if (user) setShowReactionPicker(true);                  // show the reaction picker
  };
  const handleMouseLeave = () => {
    // Small delay before hiding — gives user time to move mouse to the picker
    hideTimer.current = setTimeout(() => setShowReactionPicker(false), 150);
  };
  // Clean up timer on unmount
  useEffect(() => { return () => { if (hideTimer.current) clearTimeout(hideTimer.current); } }, []);


  // UI of current reaction, get its UI details from the REACTION_TYPES array we created (icon, color, etc..) 
  const activeReactionUI = reaction ? REACTION_TYPES.find((r) => r.type === reaction) : null;  
  // Top 3 emoji types sorted by count — shown in chat message summary badge
  const summaryEntries = Object.entries(summary).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 3);
  
  return (
    // Wrapper div, it handles hover state for showing/hiding the reaction picker */}
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative inline-block" aria-label="Reaction picker">
      {/* Reaction Picker Tooltip */}
      {showReactionPicker && (
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="absolute bottom-full left-25 md:left-1/2 -translate-x-1/2 mb-1 pb-2 bg-white shadow-xl rounded-full px-3 py-2 flex gap-2 border animate-in slide-in-from-bottom-2 duration-300" >
          {REACTION_TYPES.map((r) => (
            <button key={r.type} onClick={() => handleReaction(r.type)} type="button" title={r.label} aria-label={`React with ${r.label}`} disabled={isPending} 
              className={`transform hover:scale-125 transition-transform duration-200 cursor-pointer ${reaction === r.type ? 'scale-110' : ''}`}
            >
              <span className="text-lg md:text-xl">{r.emoji}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Main Button, it handles Mobile long-press to show/hide the reaction picker, and it's disabled while not logged in or the server-action is pending */}
      <Button type="button" variant="ghost" size="sm" disabled={!mounted || !user || isPending} aria-label={reaction ? `Your reaction: ${activeReactionUI?.label}. Click to ${reaction ? 'remove' : 'add'} reaction` : "Add a reaction"}
        className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-full transition-all ${ activeReactionUI?.color || "text-gray-600 hover:text-blue-600"} hover:bg-blue-50`}
        onTouchStart={() => { touchTimer.current = setTimeout(() => { setShowReactionPicker(true) }, 500) }}  // On mobile, if user long-presses the button (500ms), show the reaction picker
        onTouchEnd={() => { if (touchTimer.current) clearTimeout(touchTimer.current) }}     // Clear the timer on touch end 
        onTouchMove={() => { if (touchTimer.current) clearTimeout(touchTimer.current) }}    // Clear the timer if the user moves their finger quickly (indicating they are not long-pressing)
        onClick={() => handleReaction(reaction ?? "LIKE")}   // If user clicks without picking a reaction, default to 'LIKE' reaction. If they already have a reaction, toggle it off (same as clicking the same reaction in the picker)       
      >
        {/* Show Current reaction UI or default to Like */}
        {activeReactionUI ? (
          <><activeReactionUI.icon className="w-5 h-5" /> <span className="font-medium">{activeReactionUI.label}</span></>
        ) : (
          <><ThumbsUp className="w-5 h-5" /> <span className="font-medium">Like</span></>
        )}
        
        {/* Count badge, only show if count is greater than 0, the color depends on whether the user has already reacted or not */}
        {count > 0 && (
          target === "message" && summaryEntries.length > 0 ? (
            // Message: display WhatsApp-style emoji summary + total count
            <span className="ml-1 flex items-center gap-0.5 text-xs bg-gray-100 rounded-full px-2 py-0.5">
              {summaryEntries.map(([type]) => { 
                const found = REACTION_TYPES.find(r => r.type === type);
                return found ? <span key={type} className="text-sm leading-none">{found.emoji}</span> : null;
              })}
              <span className="ml-1 font-medium text-gray-600">{count}</span>
            </span>
          ) : (
            // Post/Comment: display the plain count
            <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${reaction ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600" } `}>
              {count}
            </span>
          )
        )}
      </Button>
    </div>
  );
}
