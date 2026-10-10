"use client";
import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { getMyProfile } from "@/lib/queries/userQueries";

// Typescript Types  
type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  role: "user" | "admin";
  isEmailVerified: boolean;
  emailVerifyExpiry: string | null;
  savedPosts: { postId: string }[];
  hasPassword: boolean;
};
type AuthContextType = Readonly<{
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}>;

// Create The Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export function AuthProvider({ initialUser, children }: { initialUser: User | null; children: ReactNode; }) {
  const [user, setUser] = useState(initialUser);            // Global State to hold the authenticated user    
  const [isLoading, setIsLoading] = useState(!initialUser); // If server return null, we're loading until the safety net resolves
  const hasFetchedRef = useRef(false);                      // Ref used to ensure the fetch-with-retry sequence only ever STARTS once per mount
  useEffect(() => {
    if (initialUser) return;                   // if initialUser is already defined, return early
    if (hasFetchedRef.current) return;         // if we've already retried once, return early
    hasFetchedRef.current = true;              // mark the retried ref as true  
    /* retry helper: if the FIRST attempt fails (e.g. it lost a refresh race against another provider's concurrent apiFetch call on mount,
      or hit a transient network blip), try ONE more time after a short delay before committing to "logged out". */
    const fetchUserWithRetry = async (attempt = 0): Promise<User | null> => {
      try {
        const result = await getMyProfile();            // Call getMyProfile fetch function
        if (result) return result;                      // if result is not null, return it
         if (attempt === 0) {
          await new Promise(r => setTimeout(r, 400));   // brief backoff
          return fetchUserWithRetry(1);                 // try again
        }
        return null;
      } catch { return null }                            // if error, return null
    };
    // run the fetchUserWithRetry function to get the user
    fetchUserWithRetry().then(setUser).finally(() => setIsLoading(false));
  }, [initialUser]);

  // Provide the user, setUser function, and isLoading to the context
  return <AuthContext.Provider value={{ user, setUser, isLoading }}>{children}</AuthContext.Provider>;
}

// Custom hook to be able to use the AuthContext, Now any Client components can read useAuth() hook to get current user
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}