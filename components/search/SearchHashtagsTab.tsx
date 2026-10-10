import { searchHashtags } from "@/lib/queries/postQueries";
import Link from "next/link";


// SearchHashtagsTab component that displays search results for hashtags based on the search query. It also includes pagination controls.
export default async function SearchHashtagsTab({query, page = 1}: { query: string; page?: number;}) {
  
  const data = await searchHashtags(query, 20, page);     // Fetch initial data, pass the limit & page & (q = query)
  const { hashtags, totalPages, currentPage } = data;     // Destructure the response to get the list of hashtags, total pages, and current page

  // If no hashtags are found, display a message indicating that no results were found
  if (hashtags.length === 0) {
    return <div className="text-center text-gray-500 py-10">No hashtags found.</div>;
  }

  return (
    <div className="space-y-3">

      {/* Map over the list of hashtags and display each one with a link to [tag] page */}
      {hashtags.map((tag: { hashtag: string; count: number }) => (
        <Link key={tag.hashtag} href={`/hashtags/${encodeURIComponent(tag.hashtag)}`} className="block p-3 border rounded-lg hover:bg-gray-50" >
          <div className="font-mono text-blue-600">#{tag.hashtag}</div>
          <div className="text-sm text-gray-500">{tag.count} posts</div>
        </Link>
      ))}

      {/* Simple Pagination controls (Previous/Next) */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
          {currentPage > 1 && (
            <Link href={`/search?q=${encodeURIComponent(query)}&tab=hashtags&page=${currentPage - 1}`} className="px-4 py-2 border rounded-md hover:bg-gray-50" >
              Previous
            </Link>
          )}
          <span className="py-2">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/search?q=${encodeURIComponent(query)}&tab=hashtags&page=${currentPage + 1}`} className="px-4 py-2 border rounded-md hover:bg-gray-50" >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}