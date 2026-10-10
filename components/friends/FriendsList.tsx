import { getMyFriends } from "@/lib/queries/socialQueries";
import { FriendsInfiniteScroll } from "../pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// FriendsList component to show the list of friends with infinite scrolling, receives a cursor prop for pagination
export default async function FriendsList({ cursor }: { cursor?: string }) {
  
  // Fetch friends with pagination, pass the limit & cursor
  const data = await getMyFriends(20, cursor);        
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

  // Transform friends to include initialStatus (for FriendCard)
  const items = data.friends.map((friend: { id: string; friendshipId?: string }) => ({
    ...friend,
    initialStatus: friend.friendshipId ? { status: "ACCEPTED", friendshipId: friend.friendshipId } : null 
  }));


  return (
    // Friends InfiniteScroll wrapper component, pass the initialItems, initialNextCursor, fetchMore and initialError 
    <FriendsInfiniteScroll
      initialItems={items}
      initialNextCursor={data.nextCursor}
      initialError={cursor ? data.error : undefined}
    />
  );
}