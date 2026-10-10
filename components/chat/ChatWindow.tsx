"use client";

import { useChat } from "@/lib/hooks/useChat";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import type { Message, Conversation } from "@/lib/hooks/useChat";

// Typescript interface for ChatWindow props 
interface Props {
  conversation: Conversation;
  currentUser: { id: string; name: string; image: string | null };
  initialMessages: Message[];
  initialNextCursor: string | null;
  klipyKey: string ;
}


// Client container — owns all real-time logic via useChat, Distributes states & actions down to child components as props
export default function ChatWindow({ conversation, currentUser, initialMessages, initialNextCursor, klipyKey }: Props) {

  // get all chat-related logic (states, actions,..) from the useChat hook we created.
  const { messages, typingUsers, hasMore, isLoadingMore, loadMore, sendTextMessage, 
          sendWithFiles, sendGif, emitTypingStart, emitTypingStop, editMessage, softDeleteMessage } 
        = useChat(conversation.id, { initialMessages, initialNextCursor });

  // Get the other participant for DM display (name, avatar, online status), will pass it to ChatHeader component.
  const otherParticipant = !conversation.isGroup ? conversation.participants.find(p => p.userId !== currentUser.id)?.user ?? null : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">

      {/* Chat Header component — back button (mobile), name, avatar, group info trigger */}
      <ChatHeader conversation={conversation} currentUserId={currentUser.id} otherParticipant={otherParticipant} />
        
      {/* Message list — scrollable, handles load more on scroll up */}
      <MessageList messages={messages} currentUserId={currentUser.id} hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMore} onEditMessage={editMessage} onDeleteMessage={softDeleteMessage}/>

      {/* Typing indicator component — sits just above the input */}
      <TypingIndicator typingUsers={typingUsers} participants={conversation.participants} currentUserId={currentUser.id} />

      {/* Message input component — textarea, file picker, send */}
      <MessageInput onSendText={sendTextMessage} onSendFiles={sendWithFiles} onSendGif={sendGif} onTypingStart={emitTypingStart} onTypingStop={emitTypingStop} klipyKey={klipyKey} />

    </div>
  );
}