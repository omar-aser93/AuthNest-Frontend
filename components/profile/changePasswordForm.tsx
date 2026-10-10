"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, ChangePasswordType } from "@/lib/validator";
import { changePasswordAction } from "@/lib/actions/userActions";
import { logoutAction } from "@/lib/actions/authActions";
import { useState, useTransition } from "react";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";


// Change Password Form Component
export default function ChangePasswordForm({ userId }: { userId: string }) {
  
  const [isPending, startTransition] = useTransition();   // useTransition for async server-action, used to show loading state
  // show/hide password toggles states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // React Hook Form setup with Zod validation & default values
  const form = useForm<ChangePasswordType>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" } });

  // On form submit handler
  const onSubmit = (values: ChangePasswordType) => {
    startTransition(async () => {
      const res = await changePasswordAction(values, userId);    // call server-action to change password
      // if request failed, display the error message & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; }
      toast.success("Password updated! Logging you out...");       // show success toast
      form.reset();                                                // reset the form fields
      // after 1.2 seconds, logout & redirect to login (because password changed)
      setTimeout(async () => {
        await logoutAction();                    // logout server action
        window.location.href = "/login";         // redirect to login (full reload → clears RSC cache + cookies)
      }, 1200);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col space-y-4 w-full p-6 border rounded-xl shadow mx-auto">
        <h2 className="text-xl font-semibold">Change Password</h2>
        
        {/* Current Password Input */}
        <FormField name="currentPassword" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showOldPassword ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground" tabIndex={-1} >
                    {showOldPassword ? ( <EyeOff size={16} className="cursor-pointer" /> ) : ( <Eye size={16} className="cursor-pointer" /> )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* New Password Input */}
        <FormField name="newPassword" control={form.control}
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
        <FormField name="confirmNewPassword" control={form.control}
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
        <Button className="w-full mt-auto cursor-pointer" disabled={isPending}>{isPending ? "Updating..." : "Change Password"}</Button>
      </form>
    </Form>
  );
}
