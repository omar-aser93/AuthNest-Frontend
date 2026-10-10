import { getAllPosts } from "@/lib/queries/postQueries";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import { SearchPostsInfiniteScroll } from "../pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// SearchPostsTab component to display search results for posts, we get the query and cursor from the URL query 
export default async function SearchPostsTab({ query, cursor }: { query: string; cursor?: string }) {

  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [data, currentUser] = await Promise.all([
    getAllPosts(query, 10, cursor),      // Fetch initial data, pass the limit & cursor & (q = query)
    getCurrentUser()                     // Get current user data (auth-provider), we will need to pass it down to postCard component
  ]); 

  // first, Check for server-action initial response errors (no cursor yet) 
  if (!cursor && data?.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{data.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  // If No posts found (only on initial load), show a message 
  if (!cursor && data.posts.length === 0 && !data.error) {
    return (
      <div className="text-center text-gray-500 py-10"> No posts found for &quot;{query}&quot;. </div>
    );
  }
  
  return (
    // Pass the query, initial fetched posts, nextCursor for pagination, currentUser for any user-specific UI, and error message (only on subsequent pages) to the Infinit wrapper component
    <SearchPostsInfiniteScroll
      query={query}
      initialItems={data.posts}
      initialNextCursor={data.nextCursor}
      currentUser={currentUser}
      initialError={cursor ? data.error : undefined}
    />
  );
}