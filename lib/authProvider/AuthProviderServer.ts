import { cache } from "react";
import { getMyProfile } from "@/lib/queries/userQueries";

/**
 * Cached server-side function to fetch the current user once per render (improving performance, prevents unnecessary re-fetching).
 * Can be used directly in layouts, pages, metadata, guards, ... (any server side).
 */
export const getCurrentUser = cache(async () => {
  try {
    return await getMyProfile();                    // Call getMyProfile fetch function
  } catch {
    // Treat any unexpected failure here as "unknown for this render" — not a definitive logout. The client-side AuthProvider will resolve the real auth state shortly after hydration.
    return null;
  }  
});


/* Example of Why use cache instead of just using getMyProfile() function directly in server components:
  const user1 = await getMyProfile();   // getting the user in app/layout.tsx
  const user2 = await getMyProfile();   // getting the user in app/page.tsx
  const user3 = await getMyProfile();   // getting the user in app/navbar.tsx
  
  - without caching, getMyProfile() would be called 3 times per render, but with caching, it will only be called once and the result reused.
*/