// -----------------------------------------------------------------------------
// OLDER VERSION (Server‑Side Auth in Root Layout)
// -----------------------------------------------------------------------------
// Fetches current user on the server using getCurrentUser(). Then user is passed as initialUser to AuthProviderClient.
// ✅ Pros:
//   - No flicker – user data is immediately available on first render & Avatar/buttons are correct from the start.
// ❌ Cons:
//   - Reading cookies / calling getMyProfile() forces the whole app to be dynamic. (All root layout nested pages).
//   - Even public pages (about, privacy, etc.) are server‑rendered on each request, So it isn't suitable for apps with many public pages.
//   - Higher server load, slower TTFB, no CDN caching for static pages.
//
// Use this only if your entire app is private (e.g., dashboard after login) or if you absolutely cannot tolerate any client‑side flicker.
// -----------------------------------------------------------------------------
// import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
// import { AuthProvider } from "@/lib/authProvider/AuthProviderClient";

// // Wrapper component (used in layout.tsx), to provide Auth Context to Client components
// export default async function ProviderWrapper({ children }: { children: React.ReactNode }) {
//   // fetch once using cached server-action (AuthProviderServer)
//   const user = await getCurrentUser();     
//   // pass initial user data to the client AuthProvider (AuthProviderClient)
//   return <AuthProvider initialUser={user}>{children}</AuthProvider>;  
// }



// -----------------------------------------------------------------------------
// NEW VERSION (Client‑Side Auth Only – Recommended for most apps)
// -----------------------------------------------------------------------------
// Always passes initialUser={null}. The AuthProviderClient runs getMyProfile() in a useEffect after hydration to fetch the actual user.
// ✅ Pros:
//   - Root layout becomes static – no cookies read, no async operations.
//   - Public pages (about, privacy, terms, 404, etc.) are prerendered as static HTML.
//   - Lower server load, instant TTFB, CDN cacheable pages.
//   - Dynamic pages (profile, posts, etc.) can still fetch user server‑side if needed.
// ❌ Cons:
//   - Brief flicker on initial page load: skeleton appears before avatar.
//   - One extra client‑side request for /users/me after hydration.
//
// This is the best choice for apps that have any public content or want optimal performance, The flicker is minimal and can be hidden with a skeleton component.
// -----------------------------------------------------------------------------
import { AuthProvider } from "@/lib/authProvider/AuthProviderClient";

// Wrapper component (used in layout.tsx), to provide Auth Context to Client components
export default async function ProviderWrapper({ children }: { children: React.ReactNode }) {
  // initial user is null, the client AuthProvider will run getMyProfile on mount to check if the user is actually unauthenticated or if it's just a refresh-token rotation case/
  return <AuthProvider initialUser={null}>{children}</AuthProvider>;  
}
