'use client';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginType} from "@/lib/validator";
import { useState, useTransition, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/authActions";
import { getMyProfile } from "@/lib/queries/userQueries";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { SocialButtons } from "./socialButtons";
import { getLastLoginMethod, setLastLoginMethod, subscribeLastLoginMethod } from "@/components/auth/lastLoginMethod-helper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react";

const getServerSnapshot = () => null;  // Server snapshot for useSyncExternalStore (SSR: no localStorage) -> LastLoginMethod badge


// ------------------ LOGIN FORM ------------------
export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {

  // useTransition for async server-action, used to show loading state
  const [isPending, startTransition] = useTransition();
  // show/hide password toggles states
  const [showPassword, setShowPassword] = useState(false);
  //get setUser from AuthProviderClient to update user in the context while signing in
  const { setUser } = useAuth();
  // next useRouter() for navigation 
  const router = useRouter();

  // External-store read — no effect, no lint error, no hydration mismatch
  const lastMethod = useSyncExternalStore(subscribeLastLoginMethod, getLastLoginMethod, getServerSnapshot);

  // react-hook-form setup with Zod resolver & default values + callbackUrl
  const form = useForm<LoginType>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: false, callbackUrl } });

  // onSubmit handler, called when form is submitted
  const onSubmit = (values: LoginType) => {
    startTransition(async () => {
      const res = await loginAction(values);                   // call the server action
      // if request failed, display the error message (using Utility function) & return out of the function
      if (res?.error) { toast.error(getErrorMessage(res.error)); return; } 
      setLastLoginMethod("credentials");                // set last login method (using the helper we created)
      toast.success("Logged in successfully!");         // show success toast    
      const user = await getMyProfile();                // fetch the user now that cookie is set
      if (user) setUser(user);                          // update context → navbar updates instantly 
      router.push(values.callbackUrl || "/");           // redirect to callbackUrl or home
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:p-6 max-w-sm mx-auto sm:border rounded-2xl sm:shadow-xl" >
               
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
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground" tabIndex={-1} >
                    {showPassword ? ( <EyeOff size={16} className="cursor-pointer"/> ) : ( <Eye size={16} className="cursor-pointer"/> )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Remember Me & Forgot Password Link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <FormField control={form.control} name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked: boolean) => field.onChange(!!checked)} className="bg-cyan-100" />
                </FormControl>
                <FormLabel className="text-sm font-normal">Remember me</FormLabel>
              </FormItem> )}
          />
          <Link href="/forgot-password" className="text-sm text-blue-800">Forgot password?</Link>
        </div>

        {/* Login Button, disabled if isPending */}
        <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
          {isPending ? <><Loader2 className="h-5 w-5 text-blue-600 animate-spin m-2" /> Signing in... </>  : "Login" }          
        </Button>

        {/* Credentials "last used" hint — subtle, under the button */}
        {lastMethod === "credentials" && (
          <p className="text-xs text-muted-foreground text-center -mt-1 animate-in fade-in duration-300">
            Last time you signed in with email &amp; password.
          </p>
        )}

        {/* Register Link, with CallbackUrl */}
        <p className="text-sm text-center">
          Don’t have an account? <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline"> Register</Link>
        </p>
    
        {/* OR Divider & Social Buttons */}
        <div className="flex items-center my-2">
          <span className="grow border-t border-gray-400"></span>
          <span className="mx-2 text-xs text-muted-foreground">OR</span>
          <span className="grow border-t border-gray-400"></span>
        </div>
        <SocialButtons callbackUrl={callbackUrl} showLastUsed/>

      </form>
    </Form>
  );
}