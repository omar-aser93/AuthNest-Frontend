"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordType } from "@/lib/validator";
import { forgotPasswordAction } from "@/lib/actions/authActions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


// ------------------ FORGOT PASSWORD FORM ------------------
export default function ForgotPasswordForm() {

  const router = useRouter();                                // next useRouter() for navigation 
  const [isPending, startTransition] = useTransition();      // useTransition for async server-action, used to show loading state

  // react-hook-form setup with Zod resolver & default values
  const form = useForm<ForgotPasswordType>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  
  // onSubmit handler, called when form is submitted
  const onSubmit = (values: ForgotPasswordType) => {
    startTransition(async () => {
      const res = await forgotPasswordAction(values);      // call the server action
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; } 
      toast.success("OTP sent. Check your email.");          // show success toast
      router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);     // redirect to OTP page & pass email as query param
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:p-6 max-w-sm mx-auto sm:border rounded-2xl sm:shadow-xl" >
        {/* Email Input */}
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        
        {/* Submit Button, disabled if isPending */}
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>{isPending ? "Sending..." : "Send code"}</Button>
      </form>
    </Form>
  );
}
