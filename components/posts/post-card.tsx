import Image from "next/image";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import { PostType } from "@/lib/validator";
import { renderWithTags } from "@/components/renderWithTags-helper";
import EditHistoryDialog from "@/components/edit-history-dialog";
import ThreeDotsMenu from "./three-dots-menu";
import SavePostButton from "./save-post-button";
import { ClickableImage } from "./clickable-image";
import PostFooter from "./postFooter/post-footer";
import { Bookmark } from "lucide-react";


// Post Card Component, receives post & other props, displays the post/shared-post content
export default function PostCard({ post , showSavedAt, currentUser, isEmbedded = false}: { post: PostType; showSavedAt?: boolean; currentUser?: { id: string; role: string; savedPosts?: { postId: string }[] ; name: string; image?: string | null; }; isEmbedded?: boolean; }) {
  
  // check if post author is the current user or admin (to allow editing/deleting in the post menu)  
  const isAuthorized = post.author?.id === currentUser?.id || currentUser?.role === "admin";
  // check if the post is saved by the current user
  const isSaved = currentUser?.savedPosts?.some((sp) => sp.postId === post.id);  
  // check if the post is a shared post (originalPost not null)
  const isShared = Boolean(post.isShared ?? post.originalPost);
 
  return (
    <div className={`border rounded-xl shadow-md p-5 bg-white hover:shadow-lg transition ${isEmbedded ? "shadow-none border-gray-200" : ""}`} >
      
      {/* Post Header */}
      {!isEmbedded ? (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-4">
            {/* Author Image, if not available, use default image, or intial letter */}
            <div className="mt-2 w-10 h-10 md:w-12 md:h-12 relative">
              <Image src={post.author?.image || "/default-avatar.png"} alt={`${post.author?.name || "User"} avatar`} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill className="rounded-full object-cover" />
            </div>
            {/* Author Name & Post Date (formatted) */}
            <div className="flex flex-col text-sm ">
              {/* Author Name, Also show "shared by" if it's a shared post */}
              <div className="flex flex-col">
                <p className="font-medium"><Link href={`/user/${post.author?.id}`}> {post.author?.name || "Anonymous"} </Link></p>
                {isShared && post.originalPost && (<p className="text-gray-500 text-sm"> shared {post.originalPost.author?.name}&apos;s post </p>)}
              </div>
              {/* Post Date (formatted using utility) + Edit history component  */}
              <div className="flex items-center gap-0 md:gap-2 text-xs md:text-sm text-gray-500">
                <Link href={`/posts/${post.id}`}> {formatTimeAgo(post.createdAt)} </Link>
                {post.isEdited && isAuthorized && (<EditHistoryDialog type="post" targetId={post.id} />)}
              </div>
              {/* bookmark Date (formatted using utility, displayed only in bookmarks pages */}
              {showSavedAt && post.savedAt && (
                <div className="text-xs md:text-sm text-gray-500 flex items-center gap-1"> <Bookmark className="w-3 h-3" /> Saved: {formatTimeAgo(post.savedAt)} </div>
              )}
              {/* Privacy Badge */}
              <span className={`text-xs w-fit px-2 py-1 rounded-full ${post.privacy === "PUBLIC" ? "bg-green-100 text-green-800" : post.privacy === "FRIENDS" ? "bg-blue-100 text-blue-800" : post.privacy === "ONLY_ME" ? "bg-gray-100 text-gray-800" : "bg-purple-100 text-purple-800"}`} >
                {post.privacy?.toLowerCase().replace("_", " ") || "public"}
              </span>
            </div>
          </div>
          <div className="flex flex-col-reverse md:flex-row items-center gap-0 md:gap-2">
            {/* bookmark Post Button, We pass the post id & isSaved as props */}
            {currentUser && (<SavePostButton postId={post.id} isSaved={Boolean(isSaved)} />)}
            {/* Three-dots menu, We pass the post id & isAuthorized as props */}
            <ThreeDotsMenu postId={post.id} isAuthorized={isAuthorized} isShared={isShared} originalPostId={post.originalPost?.id} currentUser={currentUser}/>
          </div>
        </div>
      ) : (
        // Condensed header for embedded original posts (inside a share)
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <div className="w-6 h-6 md:w-7 md:h-7 relative">
            <Image src={post.author?.image || "/default-avatar.png"} alt={`${post.author?.name || "User"} avatar`} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill className="rounded-full object-cover" />
          </div>          
          <Link href={`/user/${post.author?.id}`} className="font-medium text-gray-700 hover:underline" >
            {post.author?.name || "Anonymous"}
          </Link>
          <span>•</span>
          <Link href={`/posts/${post.id}`}> {formatTimeAgo(post.createdAt)} </Link>
          {post.privacy !== "PUBLIC" && (
            <span className="capitalize px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100"> {post.privacy.toLowerCase().replace("_", " ")} </span>
          )}
        </div>
      )}

      {/* SHARE MESSAGE - for shared posts (if available), in backend, we sat it in the content field instead of creating a new separate field in the db) */}
      {isShared && post.content && (
        <p className="mb-4 text-gray-800 whitespace-pre-wrap wrap-break-word">
          {renderWithTags(post.content)}
        </p>
      )}

      {/* CHECK IF POST IS A SHARED POST */}
      {isShared ? (
        // if it's a shared post & original post is available, show the shared original post inside a nested PostCard component with some styling to differentiate it as a shared post (like a border and background color)
        post.originalPost ? (
          <div className="border rounded-lg p-4 bg-gray-50">
            <PostCard post={post.originalPost} currentUser={currentUser} isEmbedded />
          </div>
        ) : (
          // if it's a shared post but the original post is not available (might have been deleted), show a message indicating that the original post is not available
          <p className="border rounded-lg p-4 bg-gray-100 text-center text-gray-500">            
            Original post not available. It might be private or deleted.
          </p>
        )
      ) : (
        <>
          {/* Normal Post Content */}
          {post.image && (
            <ClickableImage src={post.image} alt={post.title} postId={post.id} />
          )}
          {/* Title */}
          <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
          {/* Content, with mentions if available */}
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap wrap-break-word overflow-hidden">
            {renderWithTags(post.content)}
          </p>
        </>
      )}

      {/* Post Interactive footer (reactions, comments, shares), Only show for normal posts & shared post wrapped but not embedded shared post itself */}
      {!isEmbedded && (
        <PostFooter
          postId={post.id}
          reactionCount={post.reactionCount}
          commentCount={post.commentCount}
          shareCount={post.shareCount}
          initialReaction={post.myReaction}
          initialShared={post.hasShared}
          authorId={post.author?.id}          
        />
      )}
    </div>
  );
}
