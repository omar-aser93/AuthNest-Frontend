"use client";

import { useState, useTransition } from "react";
import { sendFriendRequestAction, cancelFriendRequestAction, acceptFriendRequestAction, declineFriendRequestAction, removeFriendAction, blockUserAction, unblockUserAction } from "@/lib/actions/socialActions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, UserPlus, UserCheck, Clock, X, Check, UserMinus, MoreVertical, Ban, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";


// FriendActionButton component to display appropriate friendship action buttons based on the friendship status between current user and the target user. 
export default function FriendActionButton({ targetUserId, initialStatus }: 
    { targetUserId: string; initialStatus: { status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED" | null; friendshipId?: string; direction?: "sent" | "received";} | null }) {
 
  const [status, setStatus] = useState(initialStatus);   // state to hold the current friendship status
  const [isPending, startTransition] = useTransition();  // useTransition for async server-actions, used to show loading state
  
  // Send friend request Handler
  const handleSendRequest = async () => {
    startTransition(async () => {
      const res = await sendFriendRequestAction(targetUserId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: "PENDING", friendshipId: res.friendship.id, direction: "sent" });
        toast.success("Friend request sent");
      }
    });
  };

  // Cancel friend request Handler
  const handleCancelRequest = async () => {
    if (!status?.friendshipId) return;
    startTransition(async () => {
      const res = await cancelFriendRequestAction(status.friendshipId!);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: null });
        toast.success("Request cancelled");
      }
    });
  };

  // Accept friend request Handler
  const handleAcceptRequest = async () => {
    if (!status?.friendshipId) return;
    startTransition(async () => {
      const res = await acceptFriendRequestAction(status.friendshipId!);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: "ACCEPTED", friendshipId: status.friendshipId });
        toast.success("Friend request accepted");
      }
    });
  };

  // Decline friend request Handler
  const handleDeclineRequest = async () => {
    if (!status?.friendshipId) return;    
    startTransition(async () => {
      const res = await declineFriendRequestAction(status.friendshipId!);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: null });
        toast.success("Request declined");
      }
    });
  };

  // Unfriend Handler
  const handleUnfriend = async () => {
    startTransition(async () => {
      const res = await removeFriendAction(targetUserId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: null });
        toast.success("Friend removed");
      }
    });
  };

  // Block user Handler
  const handleBlock = () => {
    startTransition(async () => {
      const res = await blockUserAction(targetUserId);
      if (res.error) {
        toast.error(res.error);
      } else {        
        setStatus({ status: "BLOCKED", friendshipId: res.friendship?.id, direction: "sent" });
        toast.success("User blocked");
      }
    });
  };

  // Unblock user Handler
  const handleUnblock = () => {
    if (!status?.friendshipId) return;
    startTransition(async () => {
      const res = await unblockUserAction(targetUserId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStatus({ status: null });
        toast.success("User unblocked");
      }
    });
  };


  /************** RENDER BASED ON CURRENT STATUS **************/
  // If no status or null status, show "Add Friend" button
  if (!status || status.status === null) {
    return (
      <Button onClick={handleSendRequest} disabled={isPending} size="sm" className="cursor-pointer">
        {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
        Add Friend
      </Button>
    );
  }

  // If status is PENDING, show appropriate button based on the request direction (sent or received)
  if (status.status === "PENDING") {
    if (status.direction === "sent") {
      return (
        // If request is sent by current user, show dropdown with a "Cancel Request | Block" buttons
        <div className="flex items-center">
          <Button variant="outline" size="sm" disabled={isPending} className="cursor-pointer">
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Clock className="mr-2 h-4 w-4" />}
            Request Sent
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCancelRequest} className="cursor-pointer">
                <X className="mr-2 h-4 w-4" /> Cancel Request
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock} className="text-red-600 cursor-pointer">
                <Ban className="mr-2 h-4 w-4" /> Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    } else if (status.direction === "received") {
      return (
        // If request is received by current user, show "Accept/Decline" buttons + dropdown with "Block" option
        <div className="flex items-center gap-2">
          <Button onClick={handleAcceptRequest} disabled={isPending} size="sm" className="cursor-pointer">
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
            Accept
          </Button>
          <Button variant="outline" onClick={handleDeclineRequest} disabled={isPending} size="sm" className="cursor-pointer">
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />}
            Decline
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBlock} className="text-red-600 cursor-pointer">
                <Ban className="mr-2 h-4 w-4" /> Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }

  // If status is ACCEPTED, show "Friends" dropdown with options "unfriend | block" buttons
  if (status.status === "ACCEPTED") {
    return (
      <div className="flex items-center">
        <Button variant="outline" size="sm" disabled={isPending} className="cursor-pointer">
          <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Friends
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2 h-6 w-6 cursor-pointer">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleUnfriend} className="cursor-pointer">
              <UserMinus className="mr-2 h-4 w-4" /> Unfriend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlock} className="text-red-600 cursor-pointer">
              <Ban className="mr-2 h-4 w-4" /> Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // If status is BLOCKED, show "Blocked" button with "unblock" dropdown option
  if (status.status === "BLOCKED") {
    if (status.direction !== "sent") {
      return ( <Button variant="outline" size="sm" disabled> <Ban className="mr-2 h-4 w-4" /> Unavailable </Button> );
    }
    return (
      <div className="flex items-center">
        <Button variant="outline" size="sm" disabled={isPending} className="cursor-pointer">
          <Shield className="mr-2 h-4 w-4 text-red-600" /> Blocked
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2 h-6 w-6 cursor-pointer">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleUnblock} className="cursor-pointer">
              <ShieldOff className="mr-2 h-4 w-4" /> Unblock
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Fallback - show disabled button with no actions available
  return (
    <Button variant="outline" disabled size="sm" className="cursor-pointer">
      <UserMinus className="mr-2 h-4 w-4" /> No Friendship Actions Available
    </Button>
  );
}