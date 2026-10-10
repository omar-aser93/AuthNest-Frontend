"use client";

import { useEffect, useSyncExternalStore, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, GOOGLE_REDIRECT_URI, GITHUB_REDIRECT_URI } from "@/lib/utils";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { getMyProfile } from "@/lib/queries/userQueries";
import { useRouter } from "next/navigation";
import { getLastLoginMethod, setLastLoginMethod, subscribeLastLoginMethod } from "@/components/auth/lastLoginMethod-helper";

const getServerSnapshot = () => null;  // Server snapshot for useSyncExternalStore (SSR: no localStorage) -> LastLoginMethod badge


// ---------- SOCIAL BUTTONS COMPONENT (recieves callbackUrl & showLastUsed -> login page only) ----------
export function SocialButtons({ callbackUrl = "/", showLastUsed = false }: { callbackUrl?: string; showLastUsed?: boolean }) {

  const popupRef = useRef<Window | null>(null);      // Reference to popup window
  const { setUser } = useAuth();                     // get setUser from useAuth hook (authProvider)
  const router = useRouter();                        // Next.js useRouter for navigation
  
  // Read from localStorage as an external store — no effect, no cascading renders, no hydration mismatch
  const lastMethod = useSyncExternalStore(subscribeLastLoginMethod, getLastLoginMethod, getServerSnapshot);

  // Listen for message from popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security: only accept messages from our own origin
      if (event.origin !== window.location.origin) return;
      // check message type and provider, if not success or correct provider, return
      const { type, provider } = event.data ?? {};
      if (type !== "OAUTH_SUCCESS") return;
      if (provider !== "google" && provider !== "github") return;
      
      popupRef.current?.close();            // Close the popup
      const user = await getMyProfile();    // Fetch user now that cookies are set by the "app/api/callback/[provider]/route.ts"
      setUser(user);                        // Update the user in the context
      setLastLoginMethod(provider);         // Set last login method
      router.push(callbackUrl);             // Redirect to callback
    };
    
    window.addEventListener("message", handleMessage);                   // Add event listener
    return () => window.removeEventListener("message", handleMessage);   // Clean up on unmount
  }, [callbackUrl, setUser, router]);

  
  // Function to open popup
  const openPopup = (url: string) => {
    // Center the popup on screen
    const width  = 500;
    const height = 600;
    const left   = window.screenX + (window.outerWidth - width) / 2;
    const top    = window.screenY + (window.outerHeight - height) / 2;
    // Open the popup
    popupRef.current = window.open( url, "oauth_popup", `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no` );
  };

  // Google handler function, creates new URL search params and opens the popup to google auth
  const handleGoogle = () => {    
    const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID,redirect_uri: GOOGLE_REDIRECT_URI, response_type: "code", scope: "openid email profile", access_type: "offline" });
    openPopup(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  };

  // Github handler function, creates new URL search params and opens the popup to github auth
  const handleGithub = () => {    
    const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, redirect_uri: GITHUB_REDIRECT_URI, scope: "read:user user:email" });
    openPopup(`https://github.com/login/oauth/authorize?${params}`);
  };


  return (
    <div className="space-y-3 mt-4">
      {/* GOOGLE BUTTON */}  
      <div className="relative">
        <Button onClick={handleGoogle} type="button" variant="outline" className="w-full flex gap-4 items-center cursor-pointer" >
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
          Continue with Google
        </Button>
        {showLastUsed && lastMethod === "google" && <LastUsedBadge />}
      </div>
      {/* GITHUB BUTTON */}
      <div className="relative">
        <Button onClick={handleGithub} type="button" variant="outline" className="w-full flex gap-4 items-center cursor-pointer" >
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          Continue with GitHub
        </Button>
        {showLastUsed && lastMethod === "github" && <LastUsedBadge />}
      </div>
    </div>
  );
}


// Sub-component — to display the "Last used" badge
function LastUsedBadge() {
  return (
    <span className="absolute -top-2 -right-2 animate-in fade-in duration-300">
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        Last used
      </Badge>
    </span>
  );
}


