/* - proxy.ts replaces the old middleware.ts, it runs before page render to check auth status and redirects accordingly
   - It works only for authentication (user logged in or not), not for authorization (user has access to page or not) 
   - for authorization we created Utility in lib/guard.ts, it checks if owner-user-Only/Admin-Only allowed to access a page... we implement it in required pages*/

import { NextResponse } from "next/server";     // Next.js response helper for redirects, rewrites, etc.
import type { NextRequest } from "next/server"; // Type for incoming request object
import { BACKEND_ORIGIN } from "./lib/utils";   // Backend API origin URL


// public Pages that are accessible *only* when the user is NOT logged in
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-otp"];

// Static protected pages that require the user to be logged in
const PROTECTED_STATIC = ["/profile", "/create-post", "/my-posts", "/saved-posts", "/friends", "/messages", "/notifications", "/reports",];

// Dynamic protected pages that require the user to be logged in (RegEx)
const PROTECTED_DYNAMIC = [
  /^\/posts\/[^/]+\/edit$/,      // /posts/:id/edit
  /^\/messages\/[^/]+$/,         // /messages/:conversationId
];


const isProd = process.env.NODE_ENV === "production";             // check if we are in production
const sameSite = isProd ? ("none" as const) : ("lax" as const);   // "none" for prod, "lax" for dev
// Function to set session cookies
function setSessionCookies(res: NextResponse, d: { accessToken: string; refreshToken: string; csrfToken: string; refreshExpiryDays: number }) {
  res.cookies.set("accessToken", d.accessToken, { httpOnly: true, secure: isProd, sameSite, path: "/", maxAge: 15 * 60 });
  res.cookies.set("refreshToken", d.refreshToken, { httpOnly: true, secure: isProd, sameSite, path: "/", maxAge: d.refreshExpiryDays * 86400 });
  res.cookies.set("csrfToken", d.csrfToken, { httpOnly: false, secure: isProd, sameSite, path: "/", maxAge: 30 * 86400 });
}
// Function to Clear all session cookies
function clearSessionCookies(res: NextResponse) {["accessToken", "refreshToken", "csrfToken"].forEach((c) => res.cookies.delete(c))}


// ---------------- PROXY FUNCTION ----------------
export async function proxy(req: NextRequest) {

  const { pathname } = req.nextUrl;                             // current URL path
  const accessToken = req.cookies.get("accessToken")?.value;    // get accessToken
  const refreshToken = req.cookies.get("refreshToken")?.value;  // get refreshToken

  // Variable to Check if the current route is an auth page (login, register, ...)
  const isAuthPage = AUTH_PAGES.includes(pathname);
  // Variable to Check if the current route is a protected route
  const isProtectedRoute = PROTECTED_STATIC.includes(pathname) || PROTECTED_DYNAMIC.some(p => p.test(pathname));
  // Variable to Check if the current route is a prefetch
  const isPrefetch = req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch";

  // set the callback URL for the login page
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);

  // Verify/refresh the session when the access cookie is gone/expired but a refresh cookie remains.
  // Skipped for prefetches so parallel <Link> prefetches never race to rotate the same token.
  if (!accessToken && refreshToken && !isPrefetch && (isProtectedRoute || isAuthPage)) {
    let refreshRes: Response | null = null;
    try {
      refreshRes = await fetch(`${BACKEND_ORIGIN}/auth/refresh-token`, {
        method: "POST", headers: { Cookie: `refreshToken=${refreshToken}` }, cache: "no-store",
      });
    } catch { /* backend unreachable: fall through, don't log the user out */ }
    if (refreshRes?.ok) {
      const d = await refreshRes.json();
      if (isAuthPage) {
        // Session is alive → keep them out of the auth pages
        const res = NextResponse.redirect(new URL("/", req.url));
        setSessionCookies(res, d);
        return res;
      }
      // Rewrite the request cookies so this navigation's server components see the new token
      const headers = new Headers(req.headers);
      const map = new Map((headers.get("cookie") || "").split("; ").filter(Boolean).map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)] as [string, string]; }));
      map.set("accessToken", d.accessToken); map.set("refreshToken", d.refreshToken); map.set("csrfToken", d.csrfToken);
      headers.set("cookie", [...map].map(([k, v]) => `${k}=${v}`).join("; "));
      const res = NextResponse.next({ request: { headers } });
      setSessionCookies(res, d);
      return res;
    }
    if (refreshRes && (refreshRes.status === 401 || refreshRes.status === 403)) {
      // Session is really dead (password changed, banned, expired) → clear the stale cookies
      const res = isAuthPage ? NextResponse.next() : NextResponse.redirect(loginUrl);
      clearSessionCookies(res);
      return res;
    }
    // 409 = another request just rotated the token; the browser already has (or will get) the new cookies. (Keep the cookies and let the request through.)
    if (refreshRes?.status === 409) return NextResponse.next();
  }
  
  // ✅ Check if logged in, by The Tokens 
  const isLoggedIn = Boolean(accessToken || refreshToken);

  // ---------- Case 1: Logged-in user hitting auth pages ----------
  // e.g., logged in user tries to visit /login → redirect to home
  if (isLoggedIn && isAuthPage) return NextResponse.redirect(new URL("/", req.url)); 

  // ---------- Case 2: Non-logged-in user hitting protected (static || dynamic) pages ----------
  // e.g., anonymous user tries to access /profile → redirect to login
  if (!isLoggedIn && isProtectedRoute) return NextResponse.redirect(loginUrl);

  // ---------- Case 3: All other routes ----------
  // User is either allowed or route is public → continue normally
  return NextResponse.next();
}

// ---------------- MATCHER CONFIG ----------------
// Define which paths this proxy should run on. (the exact routes)
export const config = { 
  matcher: ["/login", "/register", "/forgot-password", "/reset-password", "/verify-otp", "/profile", "/saved-posts", "/create-post", "/my-posts", "/friends", "/messages", "/notifications", "/reports", "/posts/:id/edit", "/messages/:conversationId" ]
};
