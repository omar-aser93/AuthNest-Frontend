"use client";

import { useState } from "react";
import { reactionType } from "@/lib/validator";
import ReactionButton from "@/components/reaction-button";
import ShareButton from "./share-button";
import CommentsToggleButton from "./comments-toggle-button";
import PostComments from "@/components/comments/post-comments";

// Post Footer Component, It contains (reactions, comments toggle, and share button) components
export default function PostFooter({ postId, reactionCount, commentCount, shareCount, initialReaction, initialShared, authorId }: {
    postId: string; reactionCount: number; commentCount: number; shareCount: number; initialReaction?: reactionType; initialShared?: boolean; authorId?: string; }) {
  
  // State to toggle comments section visibility
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex justify-around gap-6 text-sm text-gray-600">

        {/* Reaction Button component, We pass (post/comment, post id, reaction count & initial reaction) as props */}
        <ReactionButton target="post" targetId={postId} initialCount={reactionCount} initialReaction={initialReaction as "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY" | null | undefined} />

        {/* Comments Toggle Button component, We pass (comment count, showComments state & toggle function) as props */}
        <CommentsToggleButton count={commentCount} open={showComments} onToggle={() => setShowComments((v) => !v)} />
       
        {/* Share Button component, We pass (post id & share count & initial shared) as props */}
        <ShareButton postId={postId} shareCount={shareCount} initialShared={initialShared} authorId={authorId} />
      </div>

      {/* Render comments section if showComments is true */}
      {showComments && (
        <div className="mt-3">
          <PostComments postId={postId} />
        </div>
      )}
    </div>
  );
}
