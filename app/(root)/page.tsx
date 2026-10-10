import { getAllPosts } from "@/lib/queries/postQueries";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import TrendingHashtags from "@/components/posts/trending-hashtags";
import { HomeInfinitePosts } from "@/components/pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// Page metadata 
export const metadata = {
  title: "Home - AuthNest",
  description: "Discover the latest posts from our awesome community.",
};


// Home Page to display all the posts, we get the cursor from the URL query for (infinite scroll)
export default async function Homepage({ searchParams }:{ searchParams: Promise<{ cursor?: string }> }) {
  
  const cursor = (await searchParams).cursor;         // Get the cursor from the URL query (if any)
  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [data, user] = await Promise.all([
    getAllPosts(undefined, 10, cursor),     // Fetch initial data, pass the limit & cursor & (q = undefined in homepage, only used in search page) 
    getCurrentUser(),                       // Get current user data (auth-provider), we will need to pass it down to postCard component 
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 py-5 mx-auto">

      <div className="md:col-span-2 max-w-2xl space-y-6">      
        {/* HEADER */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold">Welcome to the Blog</h1>
          <p className="text-gray-600 mt-3">Explore the latest posts from our awesome community</p>
        </header>

        {/* POSTS */}
        <div className="space-y-6">
          {data.posts.length === 0 ? (
            <p className="text-center text-gray-500">No posts yet.</p>
          ) : (
            // InfiniteScroll wrapper component, we pass the props (the initialPosts, initialNextCursor, currentUser, ...etc.) 
            <HomeInfinitePosts
              initialItems={data.posts}
              initialNextCursor={data.nextCursor}
              currentUser={user}
              showSavedAt={false}
              initialError={cursor ? data.error : undefined}
            />
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Trending Hashtags */}
      <aside className="hidden md:block sticky top-20">
        <TrendingHashtags />
      </aside>
    </div>
  );
}


