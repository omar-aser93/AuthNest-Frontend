"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { useMentions } from "@/lib/hooks/useMentions";
import { renderWithTags, formatMentionsForEditing, extractMentionDetails, formatMentionsForStorage } from "@/components/renderWithTags-helper";
import ReactionButton from "@/components/reaction-button";
import EditHistoryDialog from "@/components/edit-history-dialog";
import { hardDeleteMessageAction } from "@/lib/actions/chatActions";
import { formatTimeAgo } from "@/lib/utils";
import { Pencil, Trash2, Trash, Check, CheckCheck, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Message } from "@/lib/hooks/useChat";

// TypeScript interface for the props of the MessageBubble component
interface Props {
  message: Message;
  currentUserId: string;
  isGrouped: boolean;        // true = consecutive message from same sender, hide avatar + name
  onEdit: (messageId: string, data: { content: string; taggedUserIds?: string[] }) => void;
  onDelete: (messageId: string) => void;
}


// ─── MessageBubble component, renders individual chat message with edit/delete and reactions ────────
export default function MessageBubble({ message, currentUserId, isGrouped, onEdit, onDelete }: Props) {
  const { user } = useAuth();                          // get current user (authProvider Client)  
  const isMine = message.senderId === currentUserId;   // check if message is sent by current user

  // States for edit mode, action menu, and edit content
  const [isEditing, setIsEditing]     = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // ----- Mobile long‑press context menu states & Refs -----
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [isPressing, setIsPressing] = useState(false);
  const touchCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);  

  // 'useMentions' a custom reusable hook to handle mention/tagging logic 
  const { mentionResults, taggedUsers, setTaggedUsers, handleMentionSearch, insertMention, resetMentions } = useMentions();

  // Variables to Determine if message is deleted or edited or a system message (like "call ended", "call missed", etc.).
  const isDeleted = message.content === null && message.attachments.length === 0;
  const wasEdited = message.editHistory && message.editHistory.length > 0;
  const isSystemMessage = message.content?.startsWith('📞') ?? false;

  // ----- Long‑press handlers -----
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't trigger if we're already editing or if message is deleted
    if (isEditing || isDeleted) return;    
    // Extract coordinates immediately — synthetic event is recycled after handler returns
    const touch = e.touches[0];
    touchCoordsRef.current = { x: touch.clientX, y: touch.clientY };
    setIsPressing(true);      // state for visual feedback
    longPressTimer.current = setTimeout(() => {
      if (touchCoordsRef.current) { setContextMenu({ visible: true, x: touchCoordsRef.current.x, y: touchCoordsRef.current.y }) }
      setIsPressing(false);
    }, 500); // 500ms long press
  };
  const handleTouchEnd = () => {    
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null;  }
    setIsPressing(false);
  };
  const handleTouchMove = () => {    
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null;  }
    setIsPressing(false);
  };
  // Close (mobile) context menu when clicking outside
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) { setContextMenu({ visible: false, x: 0, y: 0 }) }
    };
    // Delay adding listener slightly to avoid immediate close from the same touch that opened it
    const timer = setTimeout(() => { document.addEventListener("click", handleClickOutside) }, 0);
    // Cleanup listener on unmount or when context menu closes
    return () => { clearTimeout(timer); document.removeEventListener("click", handleClickOutside); };
  }, [contextMenu.visible]);
  
  
  // Start editing function – initialize edit content and tagged users
  const startEdit = () => {
    // Format stored content to plain @name for editing
    setEditContent(formatMentionsForEditing(message.content ?? ""));
    // Extract existing tagged users from message.tags (or content)
    if (message.tags && message.tags.length > 0) {
      const existingTags = message.tags.map((tag) => ({ id: tag.tagged.id, name: tag.tagged.name }));
      setTaggedUsers(existingTags);
    } else {
      const details = extractMentionDetails(message.content ?? "");
      setTaggedUsers(details);
    }
    setIsEditing(true);       // open edit form
    setShowActions(false);    // close action menu
    setContextMenu({ visible: false, x: 0, y: 0 });  // close context menu if open (for mobile)
  };


  // ─── Edit submit handler ──────────── 
  const handleEditSubmit = () => {
    if (!editContent.trim()) return;           // if no content, return
    // Convert plain mentions to stored format & extract tagged IDs
    const storedContent = formatMentionsForStorage(editContent.trim(), taggedUsers);
    const taggedIds = taggedUsers.map((u) => u.id);
    // pass content and tagged IDs to onEdit handler
    onEdit(message.id, { content: storedContent, taggedUserIds: taggedIds });
    setIsEditing(false);       // close edit form
    resetMentions();           // clear mentions after submission
  };

  // Edit cancel handler — 
  const handleEditCancel = () => {
    setEditContent(formatMentionsForEditing(message.content ?? ""));  // reset to original content or empty
    setIsEditing(false);       // close edit form
    resetMentions();           // clear mentions
  };

  // ─── Hard delete (REST — removes record + Cloudinary) ────────────────────
  const handleHardDelete = async () => {
    const res = await hardDeleteMessageAction(message.id);
    if (res.error) toast.error(res.error);
    setContextMenu({ visible: false, x: 0, y: 0 });  // close context menu (for mobile)
  };
  // ─── Soft delete ──────────────────────────────────────────────────
    const handleSoftDelete = () => {
    onDelete(message.id);
    setContextMenu({ visible: false, x: 0, y: 0 });  // close context menu (for mobile)
  };

  // ─── Read receipt: last read tick logic ──────────────────────────────────
  // For own messages — show double tick if at least one other person has read it
  const readByOthers = message.reads.filter(r => r.userId !== currentUserId);
  const isRead = readByOthers.length > 0;


  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} ${isGrouped ? "mt-0.5" : "mt-3"} group`} >

      {/* Avatar — hidden for grouped messages and own messages */}
      <div className="w-8 shrink-0">
        {!isMine && !isGrouped && (
          message.sender.image ? (
            <Image src={message.sender.image} alt={message.sender.name} width={32} height={32} className="rounded-full object-cover w-8 h-8" />
          ) : (
            // if no image, show first letter 
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
              {message.sender.name.charAt(0).toUpperCase()}
            </div>
          )
        )}
      </div>

      {/* Bubble + meta */}
      <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}` }>

        {/* Sender name — only for others in groups or only on first of grouped messages */}
        {!isMine && !isGrouped && ( <span className="text-xs text-gray-400 ml-1">{message.sender.name}</span> )}

        {/* Edit mode */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-72">
            {/* Edit form, Textarea */}
            <Textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); handleMentionSearch(e.target.value); }} className="text-sm resize-none min-h-[60px]" autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                if (e.key === "Escape") handleEditCancel();
              }}
            />
            {/* Mention dropdown */}
            {mentionResults.length > 0 && (
              <div className="z-20 mb-1 rounded-md border bg-white shadow-md top-full">
                {mentionResults.map((user) => (
                  <button key={user.id} type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted text-left cursor-pointer"
                    onClick={() => insertMention(user, editContent, (val) => setEditContent(val)) }
                  >
                    <Image src={user.image || "/default-avatar.png"} className="h-5 w-5 rounded-full" alt="user" width={20} height={20} />
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Edit form Action buttons (Save/Cancel) */}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="cursor-pointer" onClick={handleEditCancel}>Cancel</Button>
              <Button size="sm" className="cursor-pointer" onClick={handleEditSubmit}>Save</Button>
            </div>
          </div>

        ) : (
          /* Normal bubble */
          <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} style={{ transform: isPressing ? 'scale(0.98)' : 'scale(1)', opacity: isPressing ? 0.8 : 1, transition: 'all 0.1s' }}>
            <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed
                ${isMine ? "bg-blue-500 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm" }
                ${isDeleted ? "italic opacity-60" : ""}`} >
              {/* Deleted message */}
              {isDeleted ? (
                <span className="flex items-center gap-1 text-xs"> <Trash size={12} /> Message deleted </span>
              // System messages "call missed", "call ended", etc. — styled differently and centered
              ) : isSystemMessage ? (
                <div className="flex justify-center items-center w-full my-2">
                  <div className={`text-xs px-3 py-1.5 rounded-full text-center max-w-full
                    ${isMine ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    {message.content}
                  </div>
                </div>
              ) : (
                <>
                  {/* Message text with mentions rendered as links */}
                  <p className="whitespace-pre-wrap wrap-break-word"> {renderWithTags(message.content ?? "")} </p>

                  {/* If message has Attachments, render the the Attachments Sub-component */}
                  {message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      {message.attachments.map(att => (<Attachment key={att.id} attachment={att} />))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action menu trigger — appears on hover */}
            {!isDeleted && !isSystemMessage && (
              <div ref={actionsRef} className={`absolute top-1 ${isMine ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 hidden md:flex`} >
                {/* Reaction picker component, show when hovering over message & no reactions yet */}
                {message.reactionCount === 0 && <ReactionButton
                  target="message"
                  targetId={message.id}
                  initialCount={message.reactionCount}
                  initialReaction={message.reactions.find(r => r.userId === currentUserId)?.type as never ?? null}
                  initialSummary={message.reactionSummary ?? {}}
                />}

                {/* More actions (edit/delete) — own messages only */}
                {isMine && (
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => setShowActions(v => !v)} >
                      <MoreHorizontal size={15} />
                    </Button>

                    {showActions && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        {/* Edit - opens edit form (only for messages that have text content) */}
                        {message.content && (
                          <button onClick={startEdit} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 text-gray-700">
                            <Pencil size={13} /> Edit
                          </button>
                        )}
                        {/* Soft delete — nulls content */}
                        <button onClick={handleSoftDelete} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 text-red-500" >
                          <Trash2 size={13} /> Delete
                        </button>
                        {/* Hard delete — removes record entirely (admin or own) */}
                        {user?.role === "admin" && (
                          <button onClick={handleHardDelete} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 text-red-700" >
                            <Trash2 size={13} /> Delete permanently
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reaction summary (handled by ReactionButton component as well) — shown below the bubble if reactions exist */}
        {!isDeleted && !isSystemMessage && message.reactionCount > 0 && (
          <div className="mt-0.5 ml-1">
            <ReactionButton
              target="message"
              targetId={message.id}
              initialCount={message.reactionCount}
              initialReaction={message.reactions.find(r => r.userId === currentUserId)?.type as never ?? null}
              initialSummary={message.reactionSummary ?? {}}
            />
          </div>
        )}

        {/* Timestamp + edited badge + read receipt */}
        <div className={`flex items-center gap-0.5 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs text-gray-400" suppressHydrationWarning>{formatTimeAgo(message.createdAt)}</span>

          {wasEdited && !isDeleted && (<EditHistoryDialog type="message" targetId={message.id} />)}

          {/* Read receipt ticks — own messages only (not other users messages) */}
          {isMine && !isDeleted && ( isRead ? <CheckCheck size={13} className="text-blue-400" /> : <Check size={13} className="text-gray-400" /> )}
        </div>
      </div>

      {/* Mobile context menu – reuses ReactionButton component */}
      {contextMenu.visible && !isEditing && !isDeleted && !isSystemMessage && (
        <div className="fixed z-50 bg-white rounded-lg shadow-xl py-2 min-w-[200px] border" style={{ top: Math.max(0, Math.min(contextMenu.y - 20, window.innerHeight - 200)), left: Math.min(window.innerWidth - 220, Math.max(8, contextMenu.x - 100)), maxWidth: 'calc(100vw - 20px)', }} 
             ref={contextMenuRef} onClick={(e) => e.stopPropagation()} >
          {/* Reaction section – reuse the existing ReactionButton */}
          {message.reactionCount === 0 && <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Add reaction</p>
            <ReactionButton target="message" targetId={message.id} initialCount={message.reactionCount} initialSummary={message.reactionSummary ?? {}}
              initialReaction={message.reactions.find(r => r.userId === currentUserId)?.type as never ?? null}              
            />
          </div>}
          {/* Edit & Delete (only own messages) */}
          {isMine && (
            <div className="mt-1">
              {/* Edit (only for messages that have text content) */}
              {message.content && (
                <button onClick={startEdit} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left">
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button onClick={handleSoftDelete} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-gray-50 text-left" >
                <Trash2 size={14} /> Delete
              </button>
              {user?.role === "admin" && (
                <button onClick={handleHardDelete} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-gray-50 text-left" >
                  <Trash2 size={14} /> Delete permanently
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Attachment Sub-component renderer ───────────────────────────────────────────────
function Attachment({ attachment }: { attachment: { id: string; url: string; fileType: string; fileName: string; fileSize: number } }) {
  // if it's an image, display it
  if (attachment.fileType === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <Image src={attachment.url} alt={attachment.fileName} width={240} height={160} className="rounded-lg object-cover max-w-xs cursor-pointer hover:opacity-90 transition" />
      </a>
    );
  }
  // if it's a Video, display it
  if (attachment.fileType === "video") {
    return (
      <video controls className="rounded-lg max-w-xs max-h-48">
        <source src={attachment.url} />
      </video>
    );
  }
  // if it's an Audio, display it
  if (attachment.fileType === "audio") {
    return (
      <audio controls className="max-w-[215px] md:max-w-xs rounded-lg">
        <source src={attachment.url} />
      </audio>
    );
  } 

  // if it's not an image or video or audio (Document / other file), diplay an icon + file name & size
  const sizeKB = Math.round(attachment.fileSize / 1024);
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 text-xs hover:bg-white/30 transition" >
      <span className="text-lg">📎</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{attachment.fileName}</p>
        <p className="opacity-70">{sizeKB} KB</p>
      </div>
    </a>
  );
}