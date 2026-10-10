"use client";

import { useEffect, useState } from "react";
import { MyPostsInfiniteScroll } from "./wrappers";
import Pagination from "@/components/pagination/pagination";
import PostCard from "@/components/posts/post-card";
import { PostType } from "@/lib/validator";


// TypeScript interface for HybridPostsView received props
interface HybridPostsViewProps {
  posts: PostType[];
  nextCursor: string | null;
  currentPage?: number;
  totalPages?: number;
  currentUser: { id: string; role: string; savedPosts: { postId: string }[]; name: string; image?: string; };
  error?: string;
}


/** The HybridPostsView component, combines two pagination methods: 
 * - Mobile → Infinite Scroll (cursor-based)
 * - Desktop → Numbered Pagination (page-based) 
 */
export default function HybridPostsView({ posts, nextCursor, currentPage = 1, totalPages = 1, currentUser, error }: HybridPostsViewProps) {
  
  const [isMobile, setIsMobile] = useState<boolean | null>(null);    // State to track screen size

  // Detect screen size on client  
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");   // Media query for mobile
    const update = () => setIsMobile(media.matches);         // function to Update isMobile state
    update();                                                // call Initial update function

    media.addEventListener("change", update);                    // Add "change" event listener
    return () => media.removeEventListener("change", update);    // Clean up on unmount
  }, []);
  
  if (isMobile === null) return <div>Loading...</div>;      // Show loading & avoid hydration mismatch


  // ------------- MOBILE → Infinite Scroll ------------------
  if (isMobile) {
    return (
      <MyPostsInfiniteScroll initialItems={posts} initialNextCursor={nextCursor} currentUser={currentUser} initialError={error} />
    );
  }

  // ------------- DESKTOP → Numbered Pagination ------------------  
  return (
    <div className="space-y-6">
      {/* Map over posts, and pass down the props to postCard component */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUser={currentUser} />
      ))}
       {/* Show the Pagination, if totalPages is greater than 1 */} 
      {totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <Pagination page={currentPage} totalPages={totalPages} />
        </div>
      )}
      {/* Show error message, if any */}
      {error && !isMobile && ( <div className="text-center text-red-500 py-4"> {error} </div> )}
    </div>
  );
}
