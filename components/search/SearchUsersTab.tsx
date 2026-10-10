import { searchUsers } from "@/lib/queries/userQueries";
import { SearchUsersInfiniteScroll } from "../pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// SearchUsersTab component that handles searching for users based on the query and cursor for pagination. 
export default async function SearchUsersTab({ query, cursor }: { query: string; cursor?: string }) {

  // Fetch initial users with pagination, pass the limit & cursor & (q = query)
  const data = await searchUsers(query, 20, cursor);  

  // first, Check for server-action initial response errors (no cursor yet) 
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

  // If No users found (only on initial load), show a message 
  if (!cursor && data.users.length === 0 && !data.error) {
    return (
      <div className="text-center text-gray-500 py-10"> No users found for &quot;{query}&quot;. </div>
    );
  }
  
  // SearchUsers infiniteScroll wrapper component, pass the initial users & cursor from the server-action, the error, ....
  return (
    <SearchUsersInfiniteScroll query={query} initialItems={data.users} initialNextCursor={data.nextCursor} initialError={cursor ? data.error : undefined} />
  );
}
