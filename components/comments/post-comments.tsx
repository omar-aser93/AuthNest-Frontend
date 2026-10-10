"use client";

import { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { getPostComments } from "@/lib/queries/commentQueries";
import { CommentType } from "@/lib/validator";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import CommentForm from "./commentForm";
import CommentCard from "./commentCard";
import { CommentSkeletonList } from "../skeletons/CommentSkeleton";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";


// Comments Component for rendering the list of top-level comments for a given post, with infinite scroll pagination.
export default function PostComments({ postId }: { postId: string }) {
 
  const { user } = useAuth();                                         // get current user from authProviderClient 
 
  const [comments, setComments] = useState<CommentType[]>([]);        // state to store the comments
  const [nextCursor, setNextCursor] = useState<string | null>(null);  // state to store the next cursor (infinite scroll)
  const [loading, setLoading] = useState(false);               // state to show loading spinner
  const [initialLoaded, setInitialLoaded] = useState(false);   // to track if the initial load has completed (to differentiate between first load and subsequent loads for error handling)
  const [error, setError] = useState<string | null>(null);     // state to show error message

  // useInView from react-intersection-observer, Sentinel for infinite scroll [trigger]
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "250px" });

  // Function to load comments, accepts an optional cursor for infinite scroll
  const loadComments = useCallback(
    async (cursor?: string) => {      
      setLoading(true);                 // set loading state to true when starting to load
      setError(null);                   // reset error state before loading
      try {
        // call getComments function, passing postId, limit, cursor (for infinite scroll)  
        const res = await getPostComments(postId, 10, cursor);
        if (res.error) {
          setError(res.error);            // set error state if there's an error
        } else if (res.comments) {
          // append new comments to existing ones if cursor is provided, otherwise replace (first load)
          setComments((prev) => cursor ? [...prev, ...res.comments] : res.comments );
          setNextCursor(res.nextCursor);       // update nextCursor state
        }
      } catch {
        setError("Failed to load comments");   // set generic error message on catch (network/server errors)
      } finally {
        setLoading(false);          // set loading state to false after loading is done
        setInitialLoaded(true);     // mark initial load as completed (used for error handling to differentiate between first load and subsequent loads)
      }
    },
    [postId]
  );

  // Effect to Reset the states + initial load when postId changes
  useEffect(() => {
    setComments([]);
    setNextCursor(null);
    setInitialLoaded(false);
    setError(null);
    loadComments();
  }, [postId, loadComments]);

  // Effect to Auto-load when scrolled into view (Infinite scroll)
  useEffect(() => {
    if (inView && nextCursor && !loading && !error) { loadComments(nextCursor); }
  }, [inView, nextCursor, loading, error, loadComments]);

  // Handler for optimistic update when new comment is added (for better UX)
  const handleCommentAdded = (newComment: CommentType) => {
    setComments((prev) => [newComment, ...prev]);
  };

  // Handler for optimistic Delete when comment is deleted (for better UX)
  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="space-y-4">
      {/* Top-level comment form */}
      {user && (<CommentForm postId={postId} onSuccess={handleCommentAdded} />)}

      {/* Initial loading, Display a Skeleton loader */}      
      {!initialLoaded && (<CommentSkeletonList count={2} />)}

      {/* Error (first load) */}
      {initialLoaded && error && comments.length === 0 && (
        <div className="flex flex-col items-center py-4">
          <p className="text-red-500 mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => loadComments()} className="flex items-center gap-2" >
            <RefreshCcw className="w-4 h-4" /> Retry
          </Button>
        </div>
      )}

      {/* Comments list */}
      {initialLoaded && !error && (
        <>
          {/* If no comments, show a message */}
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4"> No comments yet. </p>
          ) : (
            // Map through fetched comments, then pass each comment to CommentCard component 
            comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} postId={postId} onDelete={handleCommentDeleted}  />
            ))
          )}

          {/* Infinite scroll sentinel (Trigger) */}
          {nextCursor && (
            <div ref={ref} className="flex justify-center py-2">
              {loading && (<Loader2 className="animate-spin h-5 w-5" />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

