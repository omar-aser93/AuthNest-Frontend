"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { commentSchema, CommentType } from "@/lib/validator";
import { createCommentAction, updateCommentAction } from "@/lib/actions/commentActions";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { useMentions } from "@/lib/hooks/useMentions";
import { formatMentionsForEditing, extractMentionDetails, formatMentionsForStorage } from "@/components/renderWithTags-helper";
import { useTransition, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


// Comment Form Component, used for both creating new comments/replies and editing existing ones
export default function CommentForm({ postId, parentId, commentToEdit, onSuccess, onCancel, autoFocus }: 
    { postId: string; parentId?: string; commentToEdit?: CommentType; onSuccess?: (comment: CommentType) => void; onCancel?: () => void; autoFocus?: boolean; }) {
  
  const isEditing = Boolean(commentToEdit);    // variable to check if we are editing an existing comment or creating a new one

  const { user } = useAuth();                             // get user from authProviderClient 
  const [isPending, startTransition] = useTransition();   // useTransition for async server-action, used to show loading state

  // 'useMentions' a custom reusable hook to handle mention/tagging logic 
  const { mentionResults, taggedUsers, setTaggedUsers, handleMentionSearch, insertMention, resetMentions } = useMentions();
  
  // Initialize react-hook-form with zod validation and default values 
  const form = useForm({ resolver: zodResolver(commentSchema), defaultValues: { content: commentToEdit ? formatMentionsForEditing(commentToEdit.content) : "", parentId: parentId || null } });

  // Set form to default values when commentToEdit changes (when user switches from editing one comment to another)
  useEffect(() => {
    if (commentToEdit) {
      const details = extractMentionDetails(commentToEdit.content);  // extract name and id from content
      setTaggedUsers(details);                                       // set tagged users
      // reset form with formatted content & parentId
      form.reset({ content: formatMentionsForEditing(commentToEdit.content), parentId: parentId || null });
    }
  }, [commentToEdit, parentId, form, setTaggedUsers]);

  // Form submission handler, calls either createCommentAction or updateCommentAction based on whether we are editing or creating
  const onSubmit = (values: { content: string; parentId?: string | null }) => {    
    if (!user) return toast.error("You must be logged in");    // prevent unauthenticated users from submitting
    // Convert plain mentions to stored format before sending
    const storedContent = formatMentionsForStorage(values.content, taggedUsers);
    // Start a transition for the server-action based on whether we are editing or creating
    startTransition(async () => {
      let res;
      if (isEditing) {
        res = await updateCommentAction(commentToEdit!.id, storedContent, taggedUsers.map((u) => u.id));
      } else {
        res = await createCommentAction(postId, storedContent, parentId, taggedUsers.map((u) => u.id));
      }
      // if error, show error toast. Otherwise, show success toast, reset form and mentions  
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isEditing ? "Comment updated" : "Comment added");
        form.reset();
        resetMentions();
        if (onSuccess) onSuccess(res.comment);   // if onSuccess prop is provided, call it with the newly created comment
        if (onCancel) onCancel();                // if onCancel prop is provided (in case of editing), call it to close the form
      }
    });
  };
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex gap-3">
          {/* User Avatar */}
          <Avatar className="w-8 h-8 mt-1">
            <AvatarImage src={user?.image ?? undefined} />
            <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            {/* Comment Textarea */}
            <FormField name="content" control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} autoFocus={autoFocus} className="min-h-20 resize-none"
                      placeholder={isEditing ? "Edit your comment..." : parentId ? "Write a reply..." : "Write a comment..."}
                      onChange={(e) => { field.onChange(e); handleMentionSearch(e.target.value); }}   
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Mention dropdown */}
            {mentionResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-md">
                {mentionResults.map((user) => (
                  <button key={user.id} type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                    onClick={() => insertMention(user, form.getValues("content"), (val) => form.setValue("content", val))}
                  >
                    <Image src={user.image || "/default-avatar.png"} className="h-5 w-5 rounded-full" alt="" width={20} height={20} />
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cancel & Submit Buttons */}
        <div className="flex justify-end gap-2">
          {onCancel && ( <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={onCancel}> Cancel </Button> )}
          <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer">
            {isPending ? (isEditing ? "Updating..." : "Posting...") : isEditing ? "Update" : parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}