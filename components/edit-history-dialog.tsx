"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/utils";
import { renderWithTags } from "@/components/renderWithTags-helper";
import { getPostEditHistory, getCommentEditHistory, getMessageEditHistory } from "@/lib/queries/editHistoryQueries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";


// Edit History Dialog Component, receives type (post/comment) and targetId as props to fetch the edit history
export default function EditHistoryDialog({ type, targetId }: { type: "post" | "comment" | "message"; targetId: string; }) {
  // State to store the edit history data & state to control the dialog open/close status
  const [edits, setEdits] = useState<{ id: string; editedAt: string; oldContent: string; newContent: string; editor: { id: string; name: string; image: string; }; }[]>([]);
  const [open, setOpen] = useState(false);
  // useTransition to manage loading state when async fetching edit history
  const [isPending, startTransition] = useTransition();

  // Function to load edit history when the dialog is opened
  const loadHistory = () => {
    if (edits.length > 0) return;   // data is already loaded as the modal was opened before, no need to fetch again (so return out of the function)
    startTransition(async () => {
      // Call the appropriate fetch function based on the type (post or comment) to fetch the edit history data
      const res = type === "post" ? await getPostEditHistory(targetId) : type === "comment" ? await getCommentEditHistory(targetId) : await getMessageEditHistory(targetId);
      if (!res?.error) {
        setEdits(res.edits);         // no error, set the edits state with the fetched data to display it in the modal
      } else {
        toast.error("Failed to load edit history. Please try again later.");  // display error message
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (isOpen) loadHistory(); }} >
      {/* Dialog trigger button, when clicked it calls loadHistory function to fetch the edit history data */}
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="flex items-center cursor-pointer gap-1 text-xs text-blue-500 hover:underline" >
          <History className="w-3 h-3" /> <p className="hidden md:block">Edited</p>
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby={undefined} className="max-w-lg">
        {/* Dialog Header */}
        <DialogHeader>
          <DialogTitle>Edit History</DialogTitle>
        </DialogHeader>
        {/* If loading, show a loading indicator. */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {isPending && edits.length === 0 && (
           <div className="flex items-center gap-2"> <Loader2 className="w-3 h-3 animate-spin" /> <p className="text-sm text-gray-500">Loading edit history… </p> </div>
          )}
          {/* If not loading and there are no edits, show a message indicating that there's no edit history available. */}
          {!isPending && edits.length === 0 && (
            <p className="text-sm text-gray-500"> No edit history available. </p>
          )}
          {/* Map through the edits and display each edit's details (editor info, old content, new content, edit time) */}
          {edits.map((edit) => (
            <div key={edit.id} className="border rounded-lg p-3 space-y-2 text-sm" >
              {/* Editor */}
              <div className="flex items-center gap-2">
                <div className="mt-2 w-10 h-10 relative"><Image src={edit.editor?.image || "/default-avatar.png"} alt={edit.editor?.name} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill className="rounded-full object-cover" /></div>
                <div>
                  <p className="font-medium">{edit.editor?.name}</p>
                  <p className="text-xs text-gray-500"> {formatTimeAgo(edit.editedAt)} </p>
                </div>
              </div>

              {/* Content Diff */}
              <div>
                <p className="text-xs text-gray-400">Previous</p>
                <p className="line-through text-red-500"> {renderWithTags(edit.oldContent)} </p>

                <p className="text-xs text-gray-400 mt-2">Updated</p>
                <p className="text-green-600"> {renderWithTags(edit.newContent)} </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
