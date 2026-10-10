"use client";

import { useTransition, useEffect, useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { resendVerificationAction } from "@/lib/actions/authActions"; 
import { toast } from "sonner";
import { Button } from "../ui/button";

export default function VerificationWarningBar({ emailVerifyExpiry }: { emailVerifyExpiry: string }) {

  const [isPending, startTransition] = useTransition();    // useTransition for async server-action, used to show loading state
  const [isExpired, setIsExpired] = useState<boolean | null>(null);  // state to track if token is expired

  // Compute expiry status *after* render  
  useEffect(() => {    
    const checkExpiry = () => {
      const expiry = new Date(emailVerifyExpiry).getTime();  // convert expiry string to timestamp
      setIsExpired(Date.now() > expiry);         // compare current time with expiry time & set the state
    }
    checkExpiry();           // call the function 
  }, [emailVerifyExpiry]);

  // Handle Resend Verification Email
  const handleResend = () => {
    startTransition(async () => {
      const res = await resendVerificationAction();     // call server action to resend verification email
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Verification email resent. Check your inbox.");  // show success toast
    });
  };

  return (
    <div className="flex justify-center items-center gap-3 bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-xl shadow-sm">
      {/* ICON */}
      <MessageSquareWarning className="w-6 h-6 text-yellow-700" />
      {/* TEXT */}      
      <div className="text-sm text-yellow-800 leading-snug flex-1">          
        Verify your email to activate all features, receive updates, and protect your account.
      </div>   

      {/* Case 1 — Token Expired → Show Button */}
      {isExpired && (
      <Button onClick={handleResend} disabled={isPending} className="text-sm underline font-medium text-yellow-800 hover:text-yellow-900 bg-transparent px-2 py-0 h-auto" >
        {isPending ? "Sending..." : "Resend verification"}
      </Button>
      )}

      {/* Case 2 — Token Still Valid → Show Check Your Email */}
      {!isExpired && ( <span className="text-sm text-yellow-700 font-medium"> (Check your email) </span> )}
    </div>
  );
}
