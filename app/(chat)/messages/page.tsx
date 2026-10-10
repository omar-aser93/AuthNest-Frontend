import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import { getConversations } from "@/lib/queries/chatQueries";
import ConversationList from "@/components/chat/ConversationList";
import { RefreshCcw } from "lucide-react";

// Page metadata
export const metadata = {
  title: "Messages - AuthNest",
  description: "Your conversations.",
};


// Messages page — shows list of conversations + empty state when no conversation is open 
// (desktop only, on mobile the list takes the full screen and you navigate into a conversation to see messages)
export default async function MessagesPage() {
  
  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [user, data] = await Promise.all([
    getCurrentUser(),              // Get current user (AuthProviderServer -> cached server-action)                           
    getConversations(),            // get all conversations query function
  ]);
  
  // Check for server error on initial load
  if (data?.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{data.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* Left panel — conversation list (full width on mobile, fixed width on desktop) */}
      <aside className="flex flex-col w-full md:w-80 border-r bg-white overflow-hidden shrink-0">
        <ConversationList initialConversations={data?.conversations ?? []} currentUserId={user.id} />
      </aside>

      {/* Right panel — empty state, desktop only */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 bg-gray-50 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="font-semibold text-gray-700">Your Messages</p>
        <p className="text-sm text-gray-400 max-w-xs"> Select a conversation or start a new one to begin chatting. </p>
      </div>

    </div>
  );
}