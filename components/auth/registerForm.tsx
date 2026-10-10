'use client';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterType } from "@/lib/validator";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerAction } from "@/lib/actions/authActions";
import { getMyProfile } from "@/lib/queries/userQueries";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { SocialButtons } from "./socialButtons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setLastLoginMethod } from "@/components/auth/lastLoginMethod-helper";


// ------------------ REGISTER FORM ------------------
export default function RegisterForm({ callbackUrl }: { callbackUrl: string }) {

  // useTransition for async server-action, used to show loading state
  const [isPending, startTransition] = useTransition();
  // show/hide password toggles states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  //get setUser from AuthProviderClient to update user in the context while signing in
  const { setUser } = useAuth();
  // next useRouter() for navigation 
  const router = useRouter();
  
  // react-hook-form setup with Zod resolver & default values + callbackUrl
  const form = useForm<RegisterType>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", confirmPassword: "", callbackUrl } });

  // onSubmit handler, called when form is submitted
  const onSubmit = (values: RegisterType) => {
    startTransition(async () => {
      const res = await registerAction(values);                 // call the server action
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; } 
      setLastLoginMethod("credentials");                // set last login method (using the helper we created)
      toast.success("Account created successfully! check your email for verification.");   // show success toast
      const user = await getMyProfile();                // fetch the user now that cookie is set 
      if (user) setUser(user);                          // update context → navbar updates instantly 
      router.push(values.callbackUrl || "/");           // redirect to callbackUrl or home
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:p-6 max-w-sm mx-auto sm:border rounded-2xl sm:shadow-xl" >
        
        {/* Name Input */}
        <FormField control={form.control} name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Email Input */}
        <FormField control={form.control} name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Password Input */}
        <FormField control={form.control} name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
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
        {/* Confirm Password Input */}
        <FormField control={form.control} name="confirmPassword"
          render={({ field }) => (
            <FormItem> 
              <FormLabel>Confirm Password</FormLabel>
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

        {/* Register Button, disabled if isPending */}    
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending} > 
          {isPending ? <><Loader2 className="h-5 w-5 text-blue-600 animate-spin m-2" /> Registering... </>  : "Register" } 
        </Button>

        {/* Login Link, with CallbackUrl */}
        <p className="text-sm text-center">
          Already have an account? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline"> Sign in</Link>
        </p>
      
        {/* OR Divider & Social Buttons */}
        <div className="flex items-center my-2">
          <span className="grow border-t border-gray-400"></span>
          <span className="mx-2 text-xs text-muted-foreground">OR</span>
          <span className="grow border-t border-gray-400"></span>
        </div>
        <SocialButtons callbackUrl={callbackUrl}/>

      </form>
    </Form>
  );
}


