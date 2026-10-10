"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPostSchema, PostType } from "@/lib/validator";
import { createPostAction, updatePostAction } from "@/lib/actions/postActions";
import FriendPrivacySelector from "@/components/posts/FriendPrivacySelector";
import { useMentions } from "@/lib/hooks/useMentions";
import { formatMentionsForEditing, extractMentionDetails, formatMentionsForStorage } from "@/components/renderWithTags-helper";
import { useTransition, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";


// Create/Update Post Form, if {post} is received, it means we are updating the post, if null, we are creating a new post
export default function CreatePostForm({ post }: { post?: PostType | null }) {

  const isUpdate = Boolean(post);         // Variable to check if we are updating the post or creating a new one

  const [preview, setPreview] = useState<string | null>(post?.image || null );  // state for image preview
  // states for custom privacy allowed/blocked users ids
  const [allowedIds, setAllowedIds] = useState<string[]>(post?.allowed ?? []);
  const [blockedIds, setBlockedIds] = useState<string[]>(post?.blocked ?? []);
  const [isPending, startTransition] = useTransition();    // useTransition for async server-action, used to show loading state
  const router = useRouter();                              // next useRouter() hook, used for navigation

  // 'useMentions' a custom reusable hook to handle mention/tagging logic 
  const { mentionResults, taggedUsers, setTaggedUsers, handleMentionSearch, insertMention, resetMentions } = useMentions();

  // React Hook Form setup, with Zod resolver & default values (empty -> create, filled -> update)
  const form = useForm({ resolver: zodResolver(createPostSchema), defaultValues: { title: post?.originalPost ? "Shared post" : post?.title || "" , content: post ? formatMentionsForEditing(post.content) : "", image: null, privacy: post?.privacy || "PUBLIC" }});

  // Effect to autosave a draft of the post to localStorage on form changes
  const values = useWatch({ control: form.control });
  useEffect(() => {
    if (!values) return;
    localStorage.setItem("post-draft", JSON.stringify(values));
  }, [values]);

  // Effect to load a draft of the post from localStorage on page load
  useEffect(() => {
    const draft = localStorage.getItem("post-draft");
    if (draft && !post) form.reset(JSON.parse(draft));
  }, [form, post]);

  // Effect to extract mentioned user IDs/names from the content and sets it in the useMentions hook for backend processing on submit
  useEffect(() => {
    if (post) { const details = extractMentionDetails(post.content); setTaggedUsers(details); }
  }, [post, setTaggedUsers]);

  // variable to track privacy value of the form (to conditionally render the Custom Privacy Selector component)
  const privacyValue = useWatch({ control: form.control, name: "privacy" });

  // Submission handler
  const onSubmit = (values: { title: string; content: string; privacy: "PUBLIC" | "FRIENDS" | "ONLY_ME" | "CUSTOM"; image?: File | string | null; }) => {
    startTransition(async () => { 
      // Prepare FormData for submission (to handle file upload + other fields)
      const fd = new FormData();
      fd.append("title", values.title);
      fd.append("content", formatMentionsForStorage(values.content, taggedUsers) );
      taggedUsers.forEach((user) => { fd.append("taggedUsers[]", user.id) });
      fd.append("privacy", values.privacy);
      // Send allowed/blocked for CUSTOM mode, or only blocked for PUBLIC/FRIENDS 
      if (values.privacy === "CUSTOM") {
        allowedIds.forEach((id) => fd.append("allowed[]", id));
        blockedIds.forEach((id) => fd.append("blocked[]", id));
      } else if (values.privacy === "PUBLIC" || values.privacy === "FRIENDS") {  
          blockedIds.forEach(id => fd.append("blocked[]", id));
          if (blockedIds.length === 0) fd.append("blocked[]", "__clear__");
      }
      if (values.image instanceof File) fd.append("image", values.image);

      // If custom privacy and no allowed users, show error and return
      if (values.privacy === "CUSTOM" && allowedIds.length === 0) {
        toast.error("Please select at least one allowed user for custom privacy.");
        return;
      }
      
      // call server-action to create/update post, based on whether we received post or not
      let result;
      if (isUpdate && post) {
        result = await updatePostAction(fd, post.id);
      } else {
        result = await createPostAction(fd);
      }

      // if request failed, display the error message (using Utility function) & return out of the function
      if (result?.error) {toast.error(getErrorMessage(result.error)); return; }

      toast.success(isUpdate ? "Post updated!" : "Post created!");   // show success toast (update or create)
      resetMentions();                                               // reset mentions state in the form
      router.push("/my-posts");                                      // redirect to your posts page
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-3 md:p-6 w-full mx-auto border rounded-xl shadow bg-white">
        {/* Header, either "Update Post" or "Create New Post" */}
        <h2 className="text-xl font-semibold"> {isUpdate ? "Update Post" : "Create New Post"} </h2>

        {/* Title */}
        {!post?.originalPost && (
        <FormField name="title" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Post title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />)}

        {/* Content */}
        <FormField name="content" control={form.control}
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea rows={6} placeholder="Write something meaningful..." {...field}
                  onChange={(e) => { field.onChange(e); handleMentionSearch(e.target.value); }}
                />
              </FormControl>

              {/* Mention dropdown */}
              {mentionResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow">
                  {mentionResults.map((user) => (
                    <button key={user.id} type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                      onClick={() => insertMention(user, field.value, (val) => form.setValue("content", val)) }
                    >
                      <Image src={user.image || "/default-avatar.png"} className="h-6 w-6 rounded-full" alt="user avatar" width={24} height={24} />                      
                      <span>{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Privacy Selector */}
        <FormField name="privacy" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Privacy</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select privacy setting" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PUBLIC">🌐 Public (Everyone can see)</SelectItem>
                  <SelectItem value="FRIENDS">👥 Friends (Only your friends)</SelectItem>
                  <SelectItem value="ONLY_ME">🔒 Only Me (Private)</SelectItem>
                  <SelectItem value="CUSTOM">🎛️ Custom (Select specific people)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Privacy Selector component: if "CUSTOM" -> allow/block users... if "FRIENDS" & "PUBLIC" -> block users only , as the rest are allowed by default */}
        {privacyValue === "CUSTOM" && (
          <FriendPrivacySelector allowedIds={allowedIds} blockedIds={blockedIds} setAllowedIds={setAllowedIds} setBlockedIds={setBlockedIds} mode="custom" />
        )}
        {(privacyValue === "PUBLIC" || privacyValue === "FRIENDS") && (
          <FriendPrivacySelector allowedIds={[]} blockedIds={blockedIds} setAllowedIds={() => {}} setBlockedIds={setBlockedIds} mode="block-only" /> 
        )}


        {/* Image Upload */}
        <FormField name="image" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Image</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*"
                  onChange={(e) => { const file = e.target.files?.[0];
                    if (file) { field.onChange(file); setPreview(URL.createObjectURL(file)); }
                  }}
                />
              </FormControl>
              {/* Preview Image */}    
              {preview ? (
                <Image src={preview} alt="Preview" width={600} height={300} className="mt-3 rounded-lg object-cover w-full" />
                ) : <p className="text-sm text-gray-500 mt-2">No image selected.</p>
              }
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button, disabled if isPending, text changes based on whether we are updating or creating a post */}
        <Button disabled={isPending} className="w-full cursor-pointer">
          {isPending ? isUpdate ? "Updating..." : "Creating..." : isUpdate ? "Update Post" : "Create Post"}
        </Button>
      </form>
    </Form>
  );
}
