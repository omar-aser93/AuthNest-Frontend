"use client";

import { useState, useTransition } from "react";
import { deleteMyAccountAction } from "@/lib/actions/userActions";
import { logoutAction } from "@/lib/actions/authActions";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";

// User must type this word to enable the delete button. Friction for a destructive action.
const CONFIRM_WORD = "DELETE";

export default function DeleteAccountDialog({ userId }: { userId: string }) {
  // Dialog states  
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset the confirmation input when the dialog closes
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmText("");
  };

  // Delete the user's account handler
  const handleDelete = () => {
    if (confirmText !== CONFIRM_WORD) return;   // Check if the user typed the correct word
    // Delete the user's account server-action call
    startTransition(async () => {
      const res = await deleteMyAccountAction(userId);
      // If there's an error, show a toast notification, if not, show a success message
      if (res?.error) {
        toast.error(getErrorMessage(res.error));
        return;
      }
      toast.success("Account deleted. Goodbye.");    
      // The account is gone — the session is dead anyway. Clear cookies + full reload.
      try { await logoutAction(); } catch { /* ignore — cookies still cleared locally */ }
      window.location.href = "/login";
    });
  };

  return (
    <div className="w-full p-6 border border-destructive/40 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2 text-destructive">Delete Account</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account along with all your posts, comments, messages, and other data.
        This action cannot be undone.
      </p>

      <Button type="button" variant="destructive" onClick={() => setOpen(true)} className="cursor-pointer" >
        Delete my account
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and every piece of content you&apos;ve created.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Type-to-confirm input */}
          <div className="py-2">
            <label htmlFor="delete-confirm" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{CONFIRM_WORD}</span> to confirm:
            </label>
            <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD} className="mt-2" autoComplete="off" autoFocus />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }} 
              disabled={isPending || confirmText !== CONFIRM_WORD}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Deleting…" : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}