"use client";

import { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { getPostComments } from "@/lib/queries/commentQueries";
import { CommentType } from "@/lib/validator";
import CommentCard from "./commentCard";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";


// Replies Component for rendering the list of replies for a given comment (parentId), with infinite scroll pagination.
export default function CommentReplies({ postId, parentId, depth }: { postId: string; parentId: string; depth: number }) {
 
  const [replies, setReplies] = useState<CommentType[]>([]);          // state to store the replies
  const [nextCursor, setNextCursor] = useState<string | null>(null);  // state to store the next cursor (infinite scroll)
  const [loading, setLoading] = useState(false);                      // state to show loading spinner
  const [error, setError] = useState<string | null>(null);            // state to show error message

  // useInView from react-intersection-observer, Sentinel for infinite scroll [trigger]
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "250px" });

  // Function to load replies, accepts an optional cursor for infinite scroll
  const loadReplies = useCallback(
    async (cursor?: string) => {
      setLoading(true);            // set loading state to true when starting to load
      setError(null);              // reset error state before loading
      try {
        // call getComments function, passing postId, limit, cursor (for infinite scroll) & parentId (for replies)
        const res = await getPostComments(postId, 10, cursor, parentId);
        if (res.error) {
          setError(res.error);           // set error state if there's an error
        } else if (res.comments) {
          // append new replies to existing ones if cursor is provided, otherwise replace (first load)
          setReplies((prev) => cursor ? [...prev, ...res.comments] : res.comments);           
          setNextCursor(res.nextCursor);      // update nextCursor state
        }
      } catch {
        setError("Failed to load replies");   // set generic error message on catch (network/server errors)
      } finally {
        setLoading(false);                    // set loading state to false after loading is done
      }
    },
    [postId, parentId]
  );
  
  // Effect to trigger Initial load when parentId changes
  useEffect(() => { loadReplies() }, [loadReplies]);

  // Effect to Auto-load when scrolled into view (infinite scroll) 
  useEffect(() => {
    if (inView && nextCursor && !loading && !error) loadReplies(nextCursor);    
  }, [inView, nextCursor, loading, error, loadReplies]);

  //  Handle first load error even if nextCursor is null
  if (error && replies.length === 0) {
    return (
      <div className="flex flex-col items-center py-4">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => loadReplies()} className="flex items-center gap-2" >
          <RefreshCcw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }
  // Render a centered loader only on the very first load
  if (loading && replies.length === 0) { return <Loader2 className="animate-spin h-6 w-6 mx-auto my-4 text-gray-500" /> }

  return (
    <div className="mt-2">
      {/*Map through fetched replies, then pass each reply to CommentCard component */}
      {replies.map((reply) => (<CommentCard key={reply.id} comment={reply} postId={postId} depth={depth} />))}
      {/* Infinite scroll sentinel, only trigger if there's a nextCursor (more data to load) and no error */}
      {nextCursor && !error && <div ref={ref} className="h-10" />}
      {/* Show loading spinner at the bottom when loading more replies (infinite scroll) */}
      {loading && nextCursor && (
        <div className="flex justify-center py-2">
          <Loader2 className="animate-spin h-4 w-4" />
        </div>
      )}

      {/* Retry button for failed load (infinite scroll) */}
      {error && nextCursor && (
        <Button variant="ghost" size="sm" onClick={() => loadReplies(nextCursor)} className="mx-auto flex items-center gap-2 text-sm text-red-500" >
          <RefreshCcw className="w-4 h-4" /> Failed to load. Click to retry.
        </Button>
      )}

      {/* Show no more replies message when there are no more replies to load (infinite scroll) */}
      {!nextCursor && replies.length > 0 && !error && (
        <p className="text-center text-gray-400 py-2 text-sm">No more replies.</p>
      )}
    </div>
  );
}