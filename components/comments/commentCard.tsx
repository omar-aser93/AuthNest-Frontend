"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import { CommentType } from "@/lib/validator";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { deleteCommentAction } from "@/lib/actions/commentActions";
import { renderWithTags} from "@/components/renderWithTags-helper";
import ReactionButton from "@/components/reaction-button";
import EditHistoryDialog from "@/components/edit-history-dialog";
import ReportDialog from "@/components/reports/reportDialog";
import CommentForm from "./commentForm";
import CommentReplies from "./commentReplies";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";


// A Component for rendering a single comment, along with its actions (reply, edit, delete) and nested replies.
export default function CommentCard({ comment: initialComment, postId, depth = 0, onDelete }: { comment: CommentType; postId: string; depth?: number; onDelete?: (commentId: string) => void }) {
  const { user } = useAuth();                              // current user from AuthProviderClient
  const [comment, setComment] = useState(initialComment);  // state to hold the comment for optimistic updates 
  const [isReplying, setIsReplying] = useState(false);     // state to toggle reply form
  const [isEditing, setIsEditing] = useState(false);       // state to toggle edit form
  const [showReplies, setShowReplies] = useState(false);   // state to toggle replies visibility
  const [isReportOpen, setIsReportOpen] = useState(false); // state to toggle report dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false); // state to toggle delete confirmation dialog
  const [isPending, startTransition] = useTransition();    // useTransition for async server-action, to show loading state 

  const isAuthor = user?.id === comment.user.id;           // check if current user is the author  
 
  // ------------------- DELETE COMMENT HANDLER ------------------ */
  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteCommentAction(comment.id);   // call server-action to delete comment
      if (res?.error) {
        toast.error(res.error);                            // show error toast if deletion fails
      } else {
        onDelete?.(comment.id);                            // call onDelete callback to remove comment from UI if deletion is successful (handled in parent component)
        toast.success("Comment deleted");                  // show success toast
      }
      setIsDeleteOpen(false);                              // close delete confirmation dialog
    });
  };

  /* ------------------ EDIT SUCCESS (OPTIMISTIC) HANDLER ------------------ */
  const handleEditSuccess = (updated: CommentType) => {
    setComment(updated);        // immediate UI update
    setIsEditing(false);        // close edit form  
  };


  /* ------------------ REPLY SUCCESS HANDLER ------------------ */
  const handleReplySuccess = () => {
    setIsReplying(false);       // close reply form
    setShowReplies(true);       // show replies to immediately display the new reply (which is added optimistically in CommentForm on Success)
  };


  return (
    <div className={`py-3 ${depth > 0 ? "ml-6 border-l-2 pl-4" : ""}`}>
      <div className="flex gap-3">
        {/* USER AVATAR */}
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.user.image} />
          <AvatarFallback>{comment.user.name?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          {/* HEADER, display author, date, edit history */}
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/profile/${comment.user.id}`} className="font-medium hover:underline" >
              {comment.user.name}
            </Link>
            <span className="text-gray-500">·</span>
            <time className="text-gray-500 text-xs"> {formatTimeAgo(comment.createdAt)} </time>
            {comment.isEdited && isAuthor && (
              <>
                <span className="text-gray-500">·</span>
                <EditHistoryDialog type="comment" targetId={comment.id} />
              </>
            )}
          </div>

          {/* CONTENT, if editing, show form... else show content with mentions if available */}
          {isEditing ? (
            <CommentForm postId={postId} commentToEdit={comment} onSuccess={handleEditSuccess} onCancel={() => setIsEditing(false)} autoFocus />
          ) : (
            <p className="mt-1 text-gray-800 whitespace-pre-wrap wrap-break-word"> {renderWithTags(comment.content)} </p>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-4 mt-2">
            {/* Reaction button component */}
            <ReactionButton target="comment" targetId={comment.id} initialCount={comment.reactionCount} initialReaction={comment.myReaction} />
            {/* Reply button, only visible to logged-in users (we also close edit form when replying to avoid conflicts) */}
            {user && (
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setIsReplying((prev) => !prev); }} className="text-xs text-gray-500 h-7 px-2 cursor-pointer" >
                Reply
              </Button>
            )}
            {/* Show replies button, if comment has replies */}
            {comment.replyCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowReplies((prev) => !prev)} className="text-xs text-gray-500 h-7 px-2 cursor-pointer" >
                {showReplies ? "Hide" : "View"} {comment.replyCount}{" "}
                {comment.replyCount === 1 ? "reply" : "replies"}
              </Button>
            )}

            {/* Three dots button for (edit/delete -> only visible to author or admin) & (reports only for other users) */}
            {user && ( isAuthor || user.role === "admin" ? (             
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                {/* Edit button - menu item */}
                <DropdownMenuContent align="end">
                  {isAuthor && (
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {/* Delete button - menu item */}
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-red-600 cursor-pointer">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
              // Other users — Report only
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="cursor-pointer text-orange-600 focus:text-orange-600" >
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>)
            )}

            {/* REPORT DIALOG COMPONENT */}
            {user && !isAuthor && user.role !== "admin" && (
              <ReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} targetType="COMMENT" targetId={comment.id} />
            )}
            {/* DELETE DIALOG */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle> Delete comment? </AlertDialogTitle>
                  <AlertDialogDescription> This action cannot be undone. </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700" >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* REPLY FORM */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm postId={postId} parentId={comment.id} onSuccess={handleReplySuccess} onCancel={() => setIsReplying(false)} autoFocus />
            </div>
          )}

          {/* REPLIES LIST COMPONENT */}
          {showReplies && (<CommentReplies postId={postId} parentId={comment.id} depth={depth + 1} />)}
        </div>
      </div>
    </div>
  );
}