"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpSchema, OtpType } from "@/lib/validator";
import { forgotPasswordAction, verifyOtpAction } from "@/lib/actions/authActions";
import { useEffect, useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";


// ------------------ VERIFY OTP FORM ------------------
export default function VerifyOTPForm() {
 
  const router = useRouter();                            // next useRouter() for navigation
  const [isPending, startTransition] = useTransition();  // useTransition for async server-action, used to show loading state
  const [timer, setTimer] = useState(60);   // 60 seconds countdown

  const params = useSearchParams();              // useSearchParams hook to access URL query parameters
  const email = params.get("email") || ``;       // get email from query params

  // react-hook-form setup with Zod resolver & default values
  const form = useForm<OtpType>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "", email } });

  // onSubmit handler, called when form is submitted
  const onSubmit = (values: OtpType) => {   
    startTransition(async () => { 
      const res = await verifyOtpAction(values);      // call the server action     
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; } 
      toast.success("OTP verified.");                 // show success toast
      // redirect to reset-password & pass email & resetToken as query params
      router.push(`/reset-password?email=${encodeURIComponent(email!)}&token=${res.resetToken}`);
    });
  };

  // Start countdown on mount
  useEffect(() => {
    if (timer === 0) return;               // stop if timer reaches 0
    // decrement timer every 1 second
    const interval = setInterval(() => { setTimer((prev) => prev - 1) }, 1000);
    return () => clearInterval(interval);      // cleanup on unmount
  }, [timer]);

  // handleResend function to resend OTP when "Resend OTP" is clicked
  const handleResend = () => {
    startTransition(async () => {
      const res = await forgotPasswordAction({ email });    // call the server action
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; }
      toast.success("OTP resent to your email.");     // show success toast
      setTimer(60);                                   // restart countdown state
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:p-6 max-w-sm mx-auto sm:border rounded-2xl sm:shadow-xl">            
        {/* OTP Shadcn Input */}
        <FormField control={form.control} name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>                  
          )}                
        />    

        {/* Submit Button, disabled if isPending */}
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending}> {isPending ? "Verifying..." : "Verify OTP"} </Button>
              
        {/* --- RESEND CONTROLS --- */}
        <div className="text-center mt-4">
          {timer > 0 ? (
            <p className="text-sm text-muted-foreground"> Resend available in <span className="font-semibold">{timer}s</span> </p>
          ) : (
            <Button type="button" variant="outline" onClick={handleResend} className="cursor-pointer" disabled={isPending}> Resend OTP </Button>
          )}
        </div>

      </form>
    </Form>
  );
}
