"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDMAction } from "@/lib/actions/chatActions";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Button component used in users page, that allows current user to start a direct message (DM) conversation with another user.
export default function MessageButton({ targetUserId }: { targetUserId: string }) {

  const router = useRouter();                            // hook used For navigation (client-side routing) 
  const [isPending, startTransition] = useTransition();  // hook used to manage pending state during async action 

  // Function to handle button click
  const handleClick = () => {
    startTransition(async () => {
      const res = await getOrCreateDMAction(targetUserId);  // Calls the server-action to get or create a DM conversation with the target user
      if (res.error) { toast.error(res.error); return; }    // If there's an error, show a toast notification and exit
      router.push(`/messages/${res.conversation.id}`);      // If successful, navigate to the conversation page for the DM conversation
    });
  };

  return (
    // Button is disabled while the async action is pending & shows a loading spinner instead of message icon
    <Button variant="outline" onClick={handleClick} disabled={isPending} className="cursor-pointer">
      {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <MessageCircle size={16} className="mr-2" /> }
      Message
    </Button>
  );
}