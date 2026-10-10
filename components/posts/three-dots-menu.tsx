"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { deletePostAction } from "@/lib/actions/postActions";
import { unsharePostAction } from "@/lib/actions/sharesActions";
import ReportDialog from "@/components/reports/reportDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Ellipsis } from 'lucide-react';


// Three-dots menu for the post card, receives postId as props (for update/delete actions)
export default function ThreeDotsMenu({ postId, isAuthorized, isShared=false, originalPostId=null, currentUser, onSuccess }: { postId: string; isAuthorized: boolean; isShared: boolean; originalPostId?: string | null; currentUser?: { id: string; role: string } | null;  onSuccess?: () => void;}) {

  const router = useRouter();                              // next useRouter() hook, used for navigation
  const [isPending, startTransition] = useTransition();    // useTransition for async server-action, used to show loading state
  const [isDialogOpen, setIsDialogOpen] = useState(false); // state to control alert dialog (open/close)
  const [isUnshareDialogOpen, setIsUnshareDialogOpen] = useState(false);  // state to control unshare alert dialog (open/close)
  const [isReportOpen, setIsReportOpen] = useState(false);  // state to control report dialog (open/close)

  // handle delete function
  const handleDelete = () => {
    startTransition(async () => {
      const res = await deletePostAction(postId);         // call server action to delete post, pass post ID
      if (res?.error) {toast.error(res.error); return; }  // if request failed, display the error message 
      toast.success("Post deleted");         // show success toast  
      setIsDialogOpen(false);                // close the alert dialog
      onSuccess?.();                         // close parallel route modal if it was open      
    });
  };

  // handle unshare (for shared posts) - deletes the shared post & the DB share record, and decrement the share count of the original post
  const handleUnshare = () => {
    // if originalPost Id is wrong, show error toast and return early  
    if (!originalPostId) { toast.error("This shared post cannot be unshared, the original post is missing."); return; }
    startTransition(async () => {
      const res = await unsharePostAction(originalPostId);  // call server action to unshare, pass original post ID
      if (res?.error) { toast.error(res.error); return; }   // if request failed, display the error message
      toast.success("Post unshared");      // show success toast
      setIsUnshareDialogOpen(false);       // close the alert dialog
      onSuccess?.();                       // close parallel route modal if it was open     
    });
  };

  return (
    <>
      {/* Three-dots menu */}
      <DropdownMenu>
        {/* Three-dots button, will trigger the dropdown menu */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="cursor-pointer"><Ellipsis className="h-5 w-5" /></Button>
        </DropdownMenuTrigger>
        {/* Dropdown menu content */}
        <DropdownMenuContent align="end">
          {/* View (menu item), will open a new tab to post page (different to clicking on post's date or image, it redirect -> opens the modal instead) */}
          <Link href={`/posts/${postId}`} target="_blank" className="w-full">
            <DropdownMenuItem className="cursor-pointer"> View </DropdownMenuItem>
          </Link>
          {/* If User is not the post author or admin, Show -> Report (menu item), will open report dialog */}
          {!isAuthorized && currentUser && (
            <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="cursor-pointer text-orange-600 focus:text-orange-600" >
              Report
            </DropdownMenuItem>
          )}
          {/* If User is the post author or admin, Show -> Edit (menu item), will redirect to edit page */}
          { isAuthorized && <>       
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/posts/${postId}/edit`)} > Edit </DropdownMenuItem>          
            {/* user authorized & post is shared, show -> Unshare & it trigger unshare alert dialog... Otherwise, show -> Delete & it trigger delete alert dialog  */}
            {isShared ? (
              <DropdownMenuItem onClick={() => setIsUnshareDialogOpen(true)} className="cursor-pointer text-orange-600 focus:text-orange-600"> Unshare </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)} className="cursor-pointer text-red-600 focus:text-red-600"> Delete </DropdownMenuItem>
            )}
          </>}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report dialog component */}
      {!isAuthorized && currentUser && ( <ReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} targetType="POST" targetId={postId} /> )}

      {/* Delete Alert dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          {/* Alert dialog Text */}
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription> This action cannot be undone. This will permanently delete your post.</AlertDialogDescription>
          </AlertDialogHeader>
          {/* Alert dialog Buttons */}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}> Cancel </AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unshare Alert dialog */}
      <AlertDialog open={isUnshareDialogOpen} onOpenChange={setIsUnshareDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unshare this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the shared post from your profile and decrease the share count on the original post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleUnshare} className="bg-orange-600 hover:bg-orange-700">
              {isPending ? "Unsharing..." : "Unshare"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
