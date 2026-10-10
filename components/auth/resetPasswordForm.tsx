"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { resetPasswordSchema, ResetPasswordType  } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordAction } from "@/lib/actions/authActions";
import { useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";


// ------------------ RESET PASSWORD FORM ------------------
export default function ResetPasswordForm() {
  
  const router = useRouter();                              // next useRouter() for navigation
  const [isPending, startTransition] = useTransition();    // useTransition for async server-action, used to show loading state
  // show/hide password toggles states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
    
  const params = useSearchParams();               // useSearchParams hook to access URL query parameters
  const email = params.get("email") || ``;        // get email from query params
  const resetToken = params.get("token") || ``;   // get resetToken from query params

  // react-hook-form setup with Zod resolver & default values  
  const form = useForm<ResetPasswordType>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { email, resetToken , newPassword: "", confirmNewPassword: "" } });

  // onSubmit handler, called when form is submitted
  const onSubmit = (values: ResetPasswordType) => {
    startTransition(async () => {
      const res = await resetPasswordAction(values);         // call the server action
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; }  
      toast.success("Password updated successfully.");       // show success toast
      router.push("/login");                                 // redirect to login
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:p-6 max-w-sm mx-auto sm:border rounded-2xl sm:shadow-xl">

        {/* New Password Input */}
        <FormField control={form.control} name="newPassword"
          render={({ field }) => (
            <FormItem> 
              <FormLabel>New Password</FormLabel>
              <FormControl>
                 <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground" tabIndex={-1} >
                    {showPassword ? ( <EyeOff size={16} className="cursor-pointer" /> ) : ( <Eye size={16} className="cursor-pointer" /> )}
                  </button>
                </div>             
              </FormControl>
              <FormMessage />
            </FormItem>            
          )}
        />
        {/* Confirm New Password Input */}
        <FormField control={form.control} name="confirmNewPassword"
          render={({ field }) => (
            <FormItem> 
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground" tabIndex={-1} >
                    {showConfirm ? ( <EyeOff size={16} className="cursor-pointer" /> ) : ( <Eye size={16} className="cursor-pointer" /> )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>            
          )}
        />
          
        {/* Submit Button */}
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>{isPending ? "Updating..." : "Update Password"}</Button>
      </form>
    </Form>
  );
}
