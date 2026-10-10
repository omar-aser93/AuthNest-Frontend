import { getFriendRequests } from "@/lib/queries/socialQueries";
import { FriendRequestsInfiniteScroll } from "../pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// FriendRequests component to show either received or sent friend requests based on the type prop + cursor for infinite scrolling
export default async function FriendRequests({ type, cursor }: { type: "received" | "sent"; cursor?: string }) {
  
  // Fetch friend requests with pagination, pass the type, limit & cursor
  const data = await getFriendRequests(type, 20, cursor);
  // If there's an error and it's the initial load (no cursor yet), show an error message
  if (!cursor && data.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{data.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  // Transform friend requests to include initialStatus & sent/received direction (for FriendCard) 
  const items = data.requests.map((req: { id: string; requester: { id: string; name: string; image: string; bio: string; }; receiver: { id: string; name: string; image: string; bio: string; }}) => {
    const user = type === "received" ? req.requester : req.receiver;
    return { ...user, initialStatus: { status: "PENDING", friendshipId: req.id, direction: type } };
  });

  return (
    // Request infiniteScroll wrapper component, pass the initialItems, initialNextCursor, fetchMore and initialError 
    <FriendRequestsInfiniteScroll
      type={type}
      initialItems={items}
      initialNextCursor={data.nextCursor}
      initialError={cursor ? data.error : undefined}
    />
  );
}