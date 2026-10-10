"use client";

import { useState, useTransition } from "react";
import { BookmarkPlus, BookmarkMinus, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleSavedPostAction } from "@/lib/actions/savedPostsActions";
import { getErrorMessage } from "@/lib/utils";


// Component to save or remove a post from bookmarks
export default function SavePostButton({ postId, isSaved }: { postId: string; isSaved: boolean }) {

  const [pending, startTransition] = useTransition();   // useTransition for async server-action, to show loading  
  const [saved, setSaved] = useState(isSaved);
  
  // function to save or remove a post from bookmarks
  const toggleSave = () => {
    startTransition(async () => {
      const result = await toggleSavedPostAction(postId);        // toggle saved post server-action
      // if request failed, display the error message (using Utility function)
      if (result?.error) { toast.error(getErrorMessage(result.error)); return; }
      setSaved(s => !s);                   // flip the icon (optimistic UI)
      // show success toast based on whether post is saved or removed
      toast.success(saved ? "Removed from saved" : "Saved!");
    });
  };

  return (
    <button onClick={toggleSave} disabled={pending} className="p-2 cursor-pointer">
      {pending ? <Bookmark className="animate-bounce" /> : (saved ? ( <BookmarkMinus className="text-blue-600" /> ) : (<BookmarkPlus className="text-gray-600" /> ))}
    </button>
  );
}
