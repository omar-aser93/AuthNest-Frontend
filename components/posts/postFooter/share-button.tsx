"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shareSchema, ShareInput } from "@/lib/validator";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Share2, Check, Copy } from "lucide-react";
import { sharePostAction, unsharePostAction } from "@/lib/actions/sharesActions";
import { getPostShares } from "@/lib/queries/sharesQueries";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { useMounted } from "@/lib/hooks/useMounted";
import { useState, useTransition } from "react";
import FriendPrivacySelector from "@/components/posts/FriendPrivacySelector";
import { toast } from "sonner";
import { FRONTEND_ORIGIN } from "@/lib/utils";

// SVG icons for (social media) external sharing
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  </svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.162 5.656c-.814.362-1.688.607-2.603.718a4.56 4.56 0 0 0 2-2.516 9.084 9.084 0 0 1-2.885 1.1 4.538 4.538 0 0 0-7.735 4.136A12.877 12.877 0 0 1 2.673 4.91a4.528 4.528 0 0 0 1.404 6.056 4.502 4.502 0 0 1-2.058-.569v.057a4.538 4.538 0 0 0 3.639 4.447 4.553 4.553 0 0 1-2.05.078 4.54 4.54 0 0 0 4.238 3.15A9.098 9.098 0 0 1 0 19.554a12.82 12.82 0 0 0 6.948 2.033c8.335 0 12.89-6.903 12.89-12.89 0-.196-.004-.393-.013-.588a9.197 9.197 0 0 0 2.252-2.347Z" />
  </svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.944 14.605l-1.05 3.74 3.843-1.011A10 10 0 1 0 12 2Zm.004 17.012a8.186 8.186 0 0 1-4.121-1.12l-.293-.172-2.279.598.609-2.17-.191-.302a8.194 8.194 0 1 1 6.275 3.166ZM17.7 14.8c-.256-.128-1.514-.747-1.748-.831-.234-.085-.404-.128-.574.128-.171.256-.66.83-.809.998-.149.17-.298.19-.554.064-.256-.128-1.078-.397-2.054-1.267-.76-.676-1.273-1.51-1.422-1.766-.149-.256-.016-.394.112-.522.115-.114.256-.298.384-.446.128-.149.171-.256.256-.426.085-.17.043-.319-.021-.446-.064-.128-.574-1.384-.785-1.898-.207-.5-.418-.43-.574-.438-.149-.008-.32-.01-.49-.01a.992.992 0 0 0-.726.341c-.256.256-.979.955-.979 2.326 0 1.371 1.003 2.697 1.145 2.887.128.17 1.976 3.018 4.794 4.225.671.29 1.193.464 1.6.593.672.213 1.284.183 1.767.111.539-.082 1.514-.618 1.727-1.215.213-.596.213-1.108.149-1.215-.064-.106-.234-.17-.49-.298Z" />
  </svg>
);


// Share Button component to share (internal [user's page feed] / external [social media] ), receives postId & share count & initial shared? as props
export default function ShareButton({ postId, shareCount, initialShared = false, authorId }: { postId: string; shareCount: number; initialShared?: boolean; authorId?: string; }) {
  
  const { user } = useAuth();                           // get current user from AuthProviderClient 
  const mounted = useMounted();                         // check if component is mounted hook
  const [open, setOpen] = useState(false);              // state to control the open/close status of the share dialog
  const [count, setCount] = useState(shareCount);       // state to track the share count
  const [shared, setShared] = useState(initialShared);  // state to track if user already shared the post (used for optimistic UI update)
  const [blockedIds, setBlockedIds] = useState<string[]>([]);  // state to track blocked user ids for sharing privacy
  const [isPending, startTransition] = useTransition();        // useTransition for async server-action, used to show loading state
  // States for shares list (users who shared this post)
  const [sharesList, setSharesList] = useState<{ user: { id: string; name: string; image: string | null } }[]>([]);
  const [sharesLoaded, setSharesLoaded] = useState(false);

  // React Hook Form setup with Zod validation for the share form (message + privacy) & default values
  const form = useForm<ShareInput>({ resolver: zodResolver(shareSchema), defaultValues: { message: "", privacy: "PUBLIC" } });

  // Watch privacy value to conditionally show the block selector
  const watchPrivacy = useWatch({ control: form.control, name: "privacy" });

  // onSubmit handler, called when form is submitted
  const onSubmit = (values: ShareInput) => {
    if (!user) {toast.error("Login required"); return;}     // if user is not logged in, display error toast and return
    if (user.id === authorId) {toast.error("You can't share your own post"); return; }  // if user is the author of the post, display error toast and return  
    startTransition(async () => {
      // Store previous state for optimistic update rollback in case of error
      const prevCount = count;
      const prevShared = shared;
      // Optimistic UI update
      setShared(true);
      setCount((c) => c + 1);
      setOpen(false);
      // Call the sharePostAction server action to share the post with message and privacy
      const res = await sharePostAction(postId, values.message, values.privacy, blockedIds);
      // If there's an error, rollback optimistic update and show error toast, otherwise show success toast
      if (res?.error) {
        setShared(prevShared);
        setCount(prevCount);
        toast.error(res.error);
      } else {
        toast.success("Post shared");
        form.reset();          // reset the form
        setBlockedIds([]);     // reset blocked ids state after successful share
      }
    });
  };
  
  // handleUnshare handler, called when user wants to unshare the post
  const handleUnshare = () => {
    startTransition(async () => {
      const prevCount = count;               // Store previous count for optimistic update rollback
      setShared(false);                      // Set shared state to false
      setCount((c) => Math.max(0, c - 1));   // Decrement count
      // Call the unsharePostAction server action to unshare the post
      const res = await unsharePostAction(postId);
      // If there's an error, rollback optimistic update and show error toast
      if (res?.error) {
        setShared(true);
        setCount(prevCount);
        toast.error(res.error);
      }
    });
  };

  // handleCopyLink handler, called when user wants to copy the post link to clipboard for sharing externally
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  //  Function to fetch shares list only once
  const loadShares = async () => {
    if (sharesLoaded) return;                     // If shares are already loaded, do nothing
    const res = await getPostShares(postId, 20);  // Call the getPostSharesAction fetcher function
    if (res.shares) {
      setSharesList(res.shares);       // Set the shares list
      setSharesLoaded(true);           // Mark shares as loaded to prevent future unnecessary fetches
    }
  };


  // Watch message input to use it for external share URLs
  const message = useWatch({ control: form.control, name: "message" });

  // Generate postUrl, used for external share URLs (social media)
  const postUrl = `${FRONTEND_ORIGIN}/posts/${postId}`;
  // External share URLs for Facebook, Twitter, WhatsApp, ...
  const externalShares = [
    { label: "Facebook", Icon: FacebookIcon, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}` },
    { label: "Twitter", Icon: TwitterIcon, url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(message || "Check this out!")}` },
    { label: "WhatsApp", Icon: WhatsAppIcon, url: `https://api.whatsapp.com/send?text=${encodeURIComponent((message || "Check this out!") + " " + postUrl)}` }
  ];

  return (
    <>
      {/* Main Share Button, conditionally render its text based on shared state, disabled if user is not logged in or server-action isPending */}
      <div className="flex items-center gap-2"> 
        <Button variant="ghost" size="sm" disabled={!mounted || !user || isPending} onClick={() => (shared ? handleUnshare() : setOpen(true))}
          className={`flex gap-2 cursor-pointer ${ shared ? "text-green-600 bg-green-50 hover:bg-green-100" : "" }`} >
          {shared ? (<Check className="w-4 h-4 text-green-600" />) : (<Share2 className="w-4 h-4" />)}
          {shared ? "Shared" : "Share"} 
        </Button>
        {/* Popover for viewing shares (only when count > 0) */}
        {count > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <span className="text-xs text-gray-500 cursor-pointer hover:underline" onClick={loadShares} >
                {count}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="text-sm font-medium mb-2">Shared by</div>
              {!sharesLoaded ? (
                <div className="text-xs text-gray-400">Loading...</div>
              ) : sharesList.length === 0 ? (
                <div className="text-xs text-gray-500">No shares yet</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sharesList.map((share) => (
                    <div key={share.user.id} className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={share.user.image || undefined} />
                        <AvatarFallback>{share.user.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{share.user.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Share this post</DialogTitle></DialogHeader>
          {/*Internal Share Form, Enables user to share the post to his own feed page */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Message */}
              <FormField name="message" control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Say something about this… (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Privacy Selector */}
              <FormField name="privacy" control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value} >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Who can see this?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PUBLIC">🌐 Public</SelectItem>
                        <SelectItem value="FRIENDS">👥 Friends</SelectItem>
                        <SelectItem value="ONLY_ME">🔒 Only Me</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Friend Privacy Selector Component, for blocking specific users when privacy is "PUBLIC"/"FRIENDS" */}
              {watchPrivacy !== "ONLY_ME" && (
                <FriendPrivacySelector
                  allowedIds={[]}
                  blockedIds={blockedIds}
                  setAllowedIds={() => {}}          
                  setBlockedIds={setBlockedIds}
                  mode="block-only"
                />
              )}

              {/* Action Buttons, Cancel + Share */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Sharing..." : "Share"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Divider + External Share (social media) */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm text-muted-foreground mb-2"> Or share externally </p>
            <div className="flex gap-2 items-center">
              {externalShares.map(({ label, Icon, url }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" title={`Share on ${label}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full border hover:bg-gray-100 transition" >
                  <Icon className="w-4 h-4" />
                  <span className="sr-only">{label}</span>
                </a>
              ))}
              {/* Copy Link to clipboard */}
              <Button type="button" variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={handleCopyLink} title="Copy link">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}