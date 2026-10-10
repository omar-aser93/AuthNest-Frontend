"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import PostFooter from "@/components/posts/postFooter/post-footer";
import EditHistoryDialog from "@/components/edit-history-dialog";
import { renderWithTags } from "@/components/renderWithTags-helper";
import { PostType } from "@/lib/validator";
import { formatTimeAgo } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ThreeDotsMenu from "@/components/posts/three-dots-menu";
import PostCard from "@/components/posts/post-card";


// parallel-route modal component, when user clicks on a post image/date, it renders a modal on top of everything
export default function PostModal({ post }: { post: PostType }) {

  const router = useRouter();             // Next.js useRouter kook, for navigation
  const { user } = useAuth();             // get current user from AuthProviderClient 
  // check if current user is the author of the post or an admin (to allow showing edit history & editing/deleting the post in the 3 dots menu)
  const isAuthorized = post?.author?.id === user?.id || user?.role === "admin";   
  // check if the post is a shared post (if it has originalPost, then it's a shared post)
  const isShared = Boolean(post?.originalPost);

  // If post not found (null after loading), show error message in the modal
  if (!post) {
    return (
      <Dialog open={true} onOpenChange={(open) => {if (!open) router.back() }}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[90vw] w-full h-[90vh] flex items-center justify-center">
          <DialogTitle className="sr-only"> Post not found </DialogTitle>
          <div className="text-red-500">Post not found</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    // If post is loaded successfully, show the post details in the modal
    <Dialog open={true} onOpenChange={(open) => {if (!open) router.back() }}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[90vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-white rounded-xl">
        <DialogTitle className="sr-only"> Post: {post.title} </DialogTitle>
        {/* Left side – The Image */}
        {post.image && (
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4 min-h-[40vh] md:min-h-0">
            <Image src={post.image} alt={post.title} width={800} height={600} className="object-contain max-h-full w-auto max-w-full" />
          </div>
        )}

        {/* Right side – Post details + reaction/comments footer */}
        <div className="flex-1 flex flex-col border-l overflow-y-auto max-h-full">
          {/* Header */}
          <div className="p-4 border-b justify-between flex items-center gap-3">
            <div className="flex items-center gap-3 mb-2">
              {/* Author Image, if not available, use default image */}
              <div className="mt-2 w-10 h-10 md:w-12 md:h-12 relative">
                <Image src={post.author?.image || "/default-avatar.png"} alt={`${post.author?.name || "User"} avatar`} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill className="rounded-full object-cover" />
              </div>
              {/* Author Name & Post Date (formatted) */}
              <div className="flex flex-col text-sm ">
                {/* Author Name */}              
                <p className="font-medium"><Link href={`/user/${post.author?.id}`}> {post.author?.name || "Anonymous"} </Link></p>
                {/* Post Date (formatted using utility) + Edit history component  */}
                <div className="flex items-center gap-0 md:gap-2 text-xs md:text-sm text-gray-500">
                  <Link href={`/posts/${post.id}`}> {formatTimeAgo(post.createdAt)} </Link>
                  {post.isEdited && isAuthorized && (<EditHistoryDialog type="post" targetId={post.id} />)}
                </div>
                {/* Privacy Badge */}
                <span className={`text-xs w-fit px-2 py-1 rounded-full ${post.privacy === "PUBLIC" ? "bg-green-100 text-green-800" : post.privacy === "FRIENDS" ? "bg-blue-100 text-blue-800" : post.privacy === "ONLY_ME" ? "bg-gray-100 text-gray-800" : "bg-purple-100 text-purple-800"}`} >
                  {post.privacy?.toLowerCase().replace("_", " ") || "public"}
                </span>
              </div>
            </div>
            {/* Three-dots menu, We pass the post id & isAuthorized as props */}
            <ThreeDotsMenu postId={post.id} isAuthorized={isAuthorized} isShared={isShared} originalPostId={post.originalPost?.id} onSuccess={() => router.back()}/>   
          </div>          
                
          {/* Post Content */}
          {/* SHARE MESSAGE - for shared posts (if available), in backend, we sat it in the content field instead of creating a new separate field in the db) */}
          {isShared && post.content && (
            <p className="mb-4 p-4 text-gray-800 whitespace-pre-wrap wrap-break-word">{renderWithTags(post.content)}</p>
          )}          
          {/* CHECK IF POST IS A SHARED POST */}
          {isShared ? (
            // if it's a shared post & original post is available, show the shared original post inside a nested PostCard component with some styling to differentiate it as a shared post (like a border and background color)
            post.originalPost ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <PostCard post={post.originalPost} currentUser={{ ...user!, role: user?.role ?? "user" }} isEmbedded />
              </div>
            ) : (
              // if it's a shared post but the original post is not available (might have been deleted), show a message indicating that the original post is not available
              <p className="border rounded-lg p-4 bg-gray-100 text-center text-gray-500"> Original post not available. It might have been deleted. </p>
            )
          ) : (
          <>
            {/* if it's not a shared post, show the regular post content */}
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap wrap-break-word">{renderWithTags(post.content)}</p>
            </div>
          </>
          )}

          {/* Post Interactive footer (reactions, comments, shares) */}
          <div className="border-t p-4">
            <PostFooter
              postId={post.id}
              reactionCount={post.reactionCount}
              commentCount={post.commentCount}
              shareCount={post.shareCount}
              initialReaction={post.myReaction}
              initialShared={post.hasShared}
              authorId={post.author?.id}
            />
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}