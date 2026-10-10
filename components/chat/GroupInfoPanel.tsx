"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateGroupAction, leaveGroupAction, removeParticipantAction } from "@/lib/actions/chatActions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, UserMinus, Pencil, Check, X } from "lucide-react";
import type { Conversation } from "@/lib/hooks/useChat";

// Group-info component, a right-side Shadcn sheet for group conversations, allowing users to see members, rename group, remove members, or leave group
export default function GroupInfoPanel({ conversation, currentUserId, onClose }: { conversation: Conversation; currentUserId: string; onClose: () => void }) {
  const router = useRouter();                                // router hook for navigation & refreshing data after actions
  const [isPending, startTransition] = useTransition();      // useTransition for async actions to show pending state  
  const [isEditingName, setIsEditingName] = useState(false); // state for group name inline edit
  const [groupName, setGroupName] = useState(conversation.name ?? "");  // state for group name input, initialized to current name

  // function to handle group name update
  const handleRename = () => {
    if (!groupName.trim()) return;       // if no group name, return out
    startTransition(async () => {
      const res = await updateGroupAction(conversation.id, groupName.trim());  // update Group (server-action)
      if (res.error) { toast.error(res.error); return; }     // if error, show toast and return
      toast.success("Group renamed");                        // if success, show success toast
      setIsEditingName(false);                               // set isEditingName to false
      router.refresh();                                      // refresh data to update group name in header and sidebar
    });
  };

  // function to handle leaving the group
  const handleLeave = () => {
    startTransition(async () => {
      const res = await leaveGroupAction(conversation.id);   // leave Group (server-action)
      if (res.error) { toast.error(res.error); return; }     // if error, show toast and return  
      toast.success("Left group");                           // if success, show success toast
      onClose();                                             // close the sheet
      router.push("/messages");                              // navigate back to main messages page 
    });
  };

  // function to handle removing a participant (only for other members, not self)
  const handleRemove = (targetUserId: string, name: string) => {
    startTransition(async () => {
      const res = await removeParticipantAction(conversation.id, targetUserId);  // remove participant (server-action)
      if (res.error) { toast.error(res.error); return; }       // if error, show toast and return
      toast.success(`Removed ${name}`);                        // if success, show success toast
      router.refresh();                                        // refresh data to update participants list in sheet and sidebar
    });
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        {/* The Sheet Header & title */}
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Group Info</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Group name with inline edit */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Group Name</p>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} className="flex-1 h-8 text-sm" autoFocus />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRename} disabled={isPending}>
                  <Check size={15} className="text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsEditingName(false); setGroupName(conversation.name ?? ""); }}>
                  <X size={15} className="text-gray-400" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{conversation.name ?? "Unnamed Group"}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingName(true)}>
                  <Pencil size={13} className="text-gray-400" />
                </Button>
              </div>
            )}
          </div>

          {/* Participants list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Members ({conversation.participants.length})
            </p>
            <div className="space-y-1">
              {conversation.participants.map(p => {
                const isSelf = p.userId === currentUserId;
                return (
                  <div key={p.userId} className="flex items-center gap-3 py-1.5">
                    {p.user.image ? (
                      <Image src={p.user.image} alt={p.user.name} width={32} height={32} className="rounded-full object-cover w-8 h-8 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">
                        {p.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {p.user.name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                    </span>
                    {/* Remove button — only shown for others, not self */}
                    {!isSelf && (
                      <Button variant="ghost" disabled={isPending} onClick={() => handleRemove(p.userId, p.user.name)} size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" title={`Remove ${p.user.name}`}>
                        <UserMinus size={14} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Leave group */}
        <div className="p-4 border-t shrink-0">
          <Button variant="destructive" className="w-full" disabled={isPending} onClick={handleLeave} >
            <LogOut size={16} className="mr-2" /> Leave Group
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}