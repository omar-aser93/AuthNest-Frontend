import { getConversations } from "@/lib/queries/chatQueries";
import { getMessages } from "@/lib/queries/chatQueries";
import ChatWindow from "@/components/chat/ChatWindow";
import ConversationList from "@/components/chat/ConversationList";
import { requireParticipant } from "@/lib/guard";
import { RefreshCcw } from "lucide-react";

// Page metadata (this isn't Dynamic Metadata because conversations are private - SEO values unnecessary)
export const metadata = {
  title: "Conversation - AuthNest",
  description: "Your conversation.",
};


// Conversation page — shows messages for a specific conversation + conversation list on desktop (hidden on mobile)
export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;   // Get conversation ID from url params (e.g. /messages/123 → conversationId = 123)
    
  // Authorization check: Ensure user is a participant in the conversation (or redirect to messages/forbidden).. if authorized, we get user & conversation data 
  const { user, conversation } = await requireParticipant(conversationId);

  // Fetch (messages + conversations list for sidebar) in parallel — (server-actions)
  const [conversationsData, messagesData] = await Promise.all([
    getConversations(),   
    getMessages(conversationId),
  ]);

  // Show error state if messages failed to load
  if (messagesData?.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{messagesData.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* Left panel (conversation list) — hidden on mobile when a chat is open */}
      <aside className="hidden md:flex flex-col w-full md:w-80 border-r bg-white overflow-hidden shrink-0">
        <ConversationList initialConversations={conversationsData.conversations} currentUserId={user.id} activeConversationId={conversationId} />
      </aside>

      {/* Right panel (chat window) — client boundary, owns all real-time logic */}
      <ChatWindow
        conversation={conversation}
        currentUser={user}
        initialMessages={messagesData?.messages ?? []}
        initialNextCursor={messagesData?.nextCursor ?? null}
        klipyKey={process.env.KLIPY_API_KEY ?? ""}
      />

    </div>
  );
}