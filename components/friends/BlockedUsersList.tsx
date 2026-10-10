import { getBlockedUsers } from "@/lib/queries/socialQueries";
import { BlockedUsersInfiniteScroll } from "../pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// BlockedUsersList component to show the list of blocked users with infinite scrolling, receives a cursor prop for pagination
export default async function BlockedUsersList({ cursor }: { cursor?: string }) {

  // Fetch blocked users with pagination, pass the limit & cursor  
  const data = await getBlockedUsers(20, cursor);
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

  // Transform blocked users to include initialStatus (for FriendCard)
  const items = (data.users || []).map((user: { id: string; name: string; image: string; bio: string; friendshipId?: string;}) => ({
    ...user,
    initialStatus: { status: "BLOCKED", friendshipId: user.friendshipId }
  }));

  return (
    // Blocked infiniteScroll wrapper component, pass the initialItems, initialNextCursor, fetchMore and initialError 
    <BlockedUsersInfiniteScroll
      initialItems={items}
      initialNextCursor={data.nextCursor}
      initialError={cursor ? data.error : undefined}
    />
  );
}