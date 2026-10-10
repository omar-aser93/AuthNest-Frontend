import { getMySavedPosts } from "@/lib/queries/savedPostsQueries";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import { SavedPostsInfiniteScroll } from "@/components/pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// Page metadata
export const metadata = {
  title: "Saved Posts - AuthNest",
  description: "View all the posts you've bookmarked.",
};


// Bookmarked Posts Page to display all your saved posts, we get the cursor from the URL query for (infinite scroll)
export default async function SavedPostsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {

  const cursor = (await searchParams).cursor;       // Get the cursor from the URL query (if any)
  
  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [data, user] = await Promise.all([
    getMySavedPosts(10, cursor),   // Fetch your saved posts (server-action), pass the limit & cursor
    getCurrentUser()               // Get current user data (auth-provider), we will need to pass it down to postCard component
  ]);
  
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

  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">

      {/* HEADER */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold">Saved Posts</h1>
        <p className="text-gray-600 mt-3"> All the posts you&apos;ve bookmarked in one place. </p>
      </header>

      {/* BOOKMARKED POSTS */}
      <div className="space-y-6">
        {data.posts.length === 0 ? (
          <p className="text-center text-gray-500"> You haven&apos;t saved any posts yet. </p>
        ) : (
          // saved-posts InfiniteScroll wrapper component, we pass (the initialPosts, the initialNextCursor, the fetchMore function, ...) as props
          <SavedPostsInfiniteScroll
            initialItems={data.posts}
            initialNextCursor={data.nextCursor}
            currentUser={user}
            initialError={cursor ? data.error : undefined}
          />
        )}
      </div>

    </div>
  );
}
