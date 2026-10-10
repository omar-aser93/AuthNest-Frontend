"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket/socketProvider";
import { useUnreadCount } from "@/lib/socket/UnreadCountContext";
import { formatTimeAgo } from "@/lib/utils";
import { deleteConversationAction, leaveGroupAction } from "@/lib/actions/chatActions";
import { MessageCircle, Users, Edit, LogOut, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewConversationModal from "@/components/chat/NewConversationModal";
import type { Message } from "@/lib/hooks/useChat";
import { formatMentionsForEditing } from "../renderWithTags-helper";
import { Input } from "../ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Typescript type for conversation preview in the sidebar
type ConversationPreview = {
  id: string;
  isGroup: boolean;
  name: string | null;
  lastMessageAt: string | null;
  participants: { userId: string; user: { id: string; name: string; image: string | null } }[];
  messages: {
    content: string | null;
    sender: { id: string; name: string };
    attachments: { fileType: string; fileName: string }[];
  }[];
}


// Conversation list with live updates via socket, used in chat pages sidebar
export default function ConversationList({ initialConversations, currentUserId, activeConversationId }: { initialConversations: ConversationPreview[]; currentUserId: string; activeConversationId?: string }) {
  
  const { socketRef } = useSocket();       // get socket ref from provider to listen for live updates
  const router = useRouter();              // router hook to trigger router.refresh on new conversation 

  // Get from useUnreadCount() context provider
  const { unreadMap, clearUnread } = useUnreadCount();

  // States for conversations, local search q, new conversation modal visibility and delete/leave dialog
  const [conversations, setConversations] = useState<ConversationPreview[]>(initialConversations);
  const [showNewModal, setShowNewModal] = useState(false); 
  const [dialog, setDialog] = useState<{ open: boolean; convId: string; isGroup: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // A ref for activeConversationId & keep it up to date
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);

  // ─── Socket: live updates to conversation list ────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;        // get current socket instance from ref
    if (!socket) return;                     // if no socket, return early

    // New message — bump conversation to top + update preview + increment unread
    const onNewMessage = (msg: Message) => {
      setConversations(prev => {
        const existing = prev.find(c => c.id === msg.conversationId);   // find the conversation this message belongs to
        if (!existing) return prev;                                     // if conversation not found, return previous state
        const rest = prev.filter(c => c.id !== msg.conversationId);     // filter out the existing conversation
        return [{
          ...existing,
          lastMessageAt: msg.createdAt,
          messages: [{ content: msg.content, sender: { id: msg.sender.id, name: msg.sender.name }, attachments: msg.attachments.map(a => ({ fileType: a.fileType, fileName: a.fileName })) }],
        }, ...rest];
      });
    };

    // New conversation created — refresh list to include it with full data
    const onJoinNew = () => router.refresh();  

    // User removed from a conversation (self or by admin) – remove from list
    const onRemovedFromConversation = ({ conversationId }: { conversationId: string }) => {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      // If the removed conversation was the active one, navigate away
      if (activeConversationIdRef.current === conversationId) router.push("/messages");
    };

    // Register listeners
    socket.on("new_message", onNewMessage);          // Listen for new messages to update previews and unread badges
    socket.on("join_new_conversation", onJoinNew);   // Listen for new conversations to refresh the list
    socket.on("removed_from_conversation", onRemovedFromConversation);  // Listen for user removal from a conversation
    // Cleanup listeners on unmount
    return () => {
      socket.off("new_message", onNewMessage);      
      socket.off("join_new_conversation", onJoinNew);
      socket.off("removed_from_conversation", onRemovedFromConversation);
    };
 
  }, [socketRef, currentUserId, router]);


  // ─── Delete/Leave handler ─────────────────────────────────────────────────
  const handleDeleteLeave = async (convId: string, isGroup: boolean) => {
    const action = isGroup ? leaveGroupAction : deleteConversationAction;
    const res = await action(convId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(isGroup ? "Left group" : "Conversation deleted");
      // Optimistic removal (will also be confirmed by socket event)
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId)  router.push("/messages");      
    }
    setDialog(null); // close dialog after action
  };


  // ─── Helpers ──────────────────────────────────────────────────────────────
  // Get display name for conversation: group name or other participant's name
  const getDisplayName = (conv: ConversationPreview) => {
    if (conv.isGroup) return conv.name ?? "Group";
    const other = conv.participants.find(p => p.userId !== currentUserId);
    return other?.user.name ?? "Unknown";
  };

  // Get avatar for conversation: group avatar or other participant's avatar
  const getAvatar = (conv: ConversationPreview) => {
    if (conv.isGroup) return null;
    return conv.participants.find(p => p.userId !== currentUserId)?.user.image ?? null;
  };

  // Get preview text for conversation: last message or "No messages yet"
  const getPreviewText = (conv: ConversationPreview) => {
    const last = conv.messages[0];
    if (!last) return "No messages yet";
    if (!last.content && last.attachments.length > 0) {
      const type = last.attachments[0].fileType;
      if (type === "image")   return "📷 Image";
      if (type === "video")   return "🎥 Video";
      return "📎 File";
    }
    if (!last.content) return "Message deleted";
    // Prefix with "You: " if the last message was sent by current user
    const prefix = last.sender.id === currentUserId ? "You: " : "";
    // Format the content to remove IDs from mentions, then return the result
    const formatted = formatMentionsForEditing(last.content);
    return `${prefix}${formatted}`;           
  };


  // ─── Search conversations handler ─────────────────────────────────────────
  // Filter conversations based on search query (filter locally for instant results, instead of making API calls, because we already have all conversations [no pagination in sidebar])
  const filteredConversations = (() => {
    if (!searchQuery.trim()) return conversations;    // if search query is empty, return all conversations
    const lowerQuery = searchQuery.toLowerCase();     // convert search query to lowercase
    // Filter conversations where display name includes the search query (case-insensitive)
    return conversations.filter(conv => getDisplayName(conv).toLowerCase().includes(lowerQuery));
  })();


  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col shrink-0 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Messages</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowNewModal(true)} title="New conversation" className="text-gray-500 hover:text-blue-600 cursor-pointer">
            <Edit size={18} />
          </Button>
        </div>
        {/* Search input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            {searchQuery ? (
              <>
                <Search size={32} className="text-gray-300" />
                <p className="text-sm">No conversations match</p>
                <p className="text-xs text-gray-300">Try a different name</p>
              </>
            ) : (
              <>
                <Users size={32} className="text-gray-300" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs text-gray-300">Start one with the pencil icon above</p>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map(conv => {
            // Variables to Determine if conversation is the active one, get unread count, display name, avatar, and preview text
            const isActive   = conv.id === activeConversationId;
            const unread     = unreadMap[conv.id] ?? 0;
            const name       = getDisplayName(conv);
            const avatar     = getAvatar(conv);
            const preview    = getPreviewText(conv);

            return (
              <div key={conv.id} className="relative group">
              <Link href={`/messages/${conv.id}`} onClick={() => clearUnread(conv.id)} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`} >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {avatar ? (
                    <Image src={avatar} alt={name} width={44} height={44} className="rounded-full object-cover w-11 h-11" />
                  ) : (
                    // if no avatar, show placeholder with first letter of name
                    <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Group badge */}
                  {conv.isGroup && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users size={9} className="text-gray-500" />
                    </span>
                  )}
                </div>

                {/* Text: name, preview, unread count */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {name}
                    </span>
                    {conv.lastMessageAt && ( <span className="text-xs text-gray-400 shrink-0"> {formatTimeAgo(conv.lastMessageAt)} </span> )}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={`text-xs truncate ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}> {preview} </p>
                    {unreadMap[conv.id] > 0 && (
                      <span className="shrink-0 min-w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium px-1">
                        {unreadMap[conv.id] > 9 ? "9+" : unreadMap[conv.id]}
                      </span>
                    )}
                </div>
                </div>
              </Link>
              
              {/* Delete/Leave button */}
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDialog({ open: true, convId: conv.id, isGroup: conv.isGroup }); }}  title={conv.isGroup ? "Leave group" : "Delete conversation"}
                  className="absolute right-2 top-1/3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white shadow-sm border hover:bg-gray-100 text-gray-500 hover:text-red-500 cursor-pointer" >
                {conv.isGroup ? <LogOut size={14} /> : <Trash2 size={14} />}
              </button>
            </div>
            );
          })
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialog?.open ?? false} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle> {dialog?.isGroup ? "Leave group" : "Delete conversation"} </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.isGroup ? "Are you sure you want to leave this group? You'll no longer receive messages from it." : "Are you sure you want to delete this conversation? It will be removed from your list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (dialog) { handleDeleteLeave(dialog.convId, dialog.isGroup) }}} className="bg-red-500 hover:bg-red-600" >
              {dialog?.isGroup ? "Leave" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── New conversation modal ────────────────────────────────────────── */}
      {showNewModal && ( <NewConversationModal onClose={() => setShowNewModal(false)} /> )}
    </>
  );
}