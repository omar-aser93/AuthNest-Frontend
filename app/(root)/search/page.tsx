import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import SearchPostsTab from "@/components/search/SearchPostsTab";
import SearchUsersTab from "@/components/search/SearchUsersTab";
import SearchHashtagsTab from "@/components/search/SearchHashtagsTab";
import { PostCardSkeletonList } from "@/components/skeletons/PostCardSkeleton";
import { UserCardSkeletonList } from "@/components/skeletons/UserCardSkeleton";
import { HashtagSkeletonList } from "@/components/skeletons/HashtagSkeleton";

// page metadata
export const metadata = {
  title: "Search - AuthNest",
  description: "Discover posts, users, and hashtags on AuthNest.",
};


// Search page that handles searching for posts, users, and hashtags based on query parameters. It uses Tabs.
export default async function SearchPage({searchParams}: { searchParams: Promise<{ q?: string; tab?: string; cursor?: string; page?: string }>;}) {
  
  // Get (search query, tab, cursor for pagination, and page number for hashtags pagination) from URL query parameters
  const { q = "", tab = "posts", cursor, page } = await searchParams;  

  // If no search query is provided, display a message prompting the user to enter a search term
  if (!q) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p className="text-lg">Enter a search term to get started.</p>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6"> Search results for &quot;{q}&quot; </h1>

      {/* Tabs for searching posts, users, and hashtags */}
      <Tabs value={tab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts" asChild>
            <Link href={`/search?q=${encodeURIComponent(q)}&tab=posts`}>Posts</Link>
          </TabsTrigger>
          <TabsTrigger value="people" asChild>
            <Link href={`/search?q=${encodeURIComponent(q)}&tab=people`}>People</Link>
          </TabsTrigger>
          <TabsTrigger value="hashtags" asChild>
            <Link href={`/search?q=${encodeURIComponent(q)}&tab=hashtags`}>Hashtags</Link>
          </TabsTrigger>
        </TabsList>

        {/* posts search component, wrapped in Suspense for streaming and lazy loading */}
        <TabsContent value="posts">          
          <Suspense fallback={<PostCardSkeletonList count={3} />}>
            <SearchPostsTab query={q} cursor={cursor} />
          </Suspense>        
        </TabsContent>

        {/* users search component, wrapped in Suspense for streaming and lazy loading */}
        <TabsContent value="people">
          <Suspense fallback={<UserCardSkeletonList count={5} />}>
            <SearchUsersTab query={q} cursor={cursor} />
          </Suspense>
        </TabsContent>

        {/* hashtags search component, wrapped in Suspense for streaming and lazy loading */}
        <TabsContent value="hashtags">
          <Suspense fallback={<HashtagSkeletonList count={5} />}>
            <SearchHashtagsTab query={q} page={page ? parseInt(page) : 1} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}