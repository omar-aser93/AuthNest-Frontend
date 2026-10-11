import { BACKEND_ORIGIN } from "./utils"; 

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 10_000;  // 10 seconds — abort if backend doesn't respond
const MAX_RETRIES = 2;              // Max retries for transient errors (NOT counting the 401 refresh retry, that's separate)
const BACKOFF_BASE_MS = 500;        // Backoff base in ms — actual wait = BASE * 2^attempt → 500ms, 1000ms
// Which HTTP status codes trigger a retry (besides 401 which has its own refresh logic), 5xx = transient server errors. 408 = request timeout. 429 = rate limit (with backoff).
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
// REFRESH LOCK: prevents concurrent 401 retries from racing, Only relevant on the client side; server requests are isolated per render
let clientRefreshPromise: Promise<Response> | null = null;


// ─────────────────────────────────────────────────────────────────────────────
//  apiFetch Wrapper (Backend is COOKIE-BASED AUTH) → This works in BOTH server and client contexts
//  -------------------------------------------------------
//  Server context (Server Components, Server Actions, queries):
//   ✅ Reads cookies via next/headers , manually forwards them in the Cookie header  
//   ✅ Supports next: { revalidate } / cache options for ISR/SSG/SSR
//   
//  Client context (server actions called from Client Components, used directly in Client Components):
//   ✅ Reads CSRF token from document.cookie 
//   ✅ credentials:"include" sends httpOnly cookies automatically
//   ✅ Refresh lock prevents concurrent 401 race conditions
//
//  Both contexts get:
//   ✅ Request timeout via AbortController (DEFAULT_TIMEOUT_MS)
//   ✅ Automatic retry with exponential backoff on 5xx / network errors
//   ✅ Auto-refresh (refresh-token logic) on 401 with one retry of the original request
//   ✅ Typed ApiError thrown on non-ok responses (after all retries exhausted)
//   ✅ CSRF token header (double-submit cookie pattern) - X-CSRF-Token header
//   ✅ FormData support (removes Content-Type so browser sets multipart boundary), otherwise defaults to JSON Content-Type
// ─────────────────────────────────────────────────────────────────────────────
export async function apiFetch(input: RequestInfo, init: RequestInit & { next?: { revalidate?: number; tags?: string[]; }; cache?: RequestCache;} = {}, retry = true) : Promise<Response> {
 
  // ----- 1. Get CSRF token (cookie) ----- 
  let csrfToken: string | undefined;         // variable to hold CSRF token 
  if (typeof window === "undefined") {    
    // Server Action → read from next/headers cookies, then set csrfToken variable  
    const { cookies } = await import("next/headers");    // 🟢 Dynamic import – only runs on server, never bundled for client
    const cookieStore = await cookies();    
    csrfToken = cookieStore.get("csrfToken")?.value;       
  } else {    
    // Client → read from document.cookie, then set csrfToken variable (csrfToken is NOT httpOnly, so JS can read it)
    csrfToken = document.cookie.split("; ").find((row) => row.startsWith("csrfToken="))?.split("=")[1];
  }
  

  /** ----- 2. Build headers safely -----
   *  - start with any headers the caller passes , then add CSRF header if available  
   *  - If FormData, Remove Content-Type, otherwise default to JSON Content-Type 
   */ 
  const isFormData = init.body instanceof FormData;    // Detect if user is sending FormData (image/file), or not (just normal JSON)
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>), ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) };
  if (isFormData) {
    // MUST remove Content-Type, because browser needs to set multipart/form-data boundary automatically 
    delete headers["Content-Type"];
  } else if (!headers["Content-Type"]) {
    // Default JSON header (safe for GET/POST/PUT/PATCH unless FormData), unless caller already set a Content-Type (e.g. text/plain, application/x-www-form-urlencoded, etc), then we won't override it
    headers["Content-Type"] = "application/json";
  }

  // Server-side: manually forward all cookies, (For client-side, we use -> credentials: "include", which is browser-only)
  if (typeof window === "undefined") {      
    const { cookies } = await import("next/headers");    // 🟢 Dynamic import – only runs on server, if we imported it on the top of the file (Browser gives err -> can't reade "next/headers")
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
    if (allCookies) headers["Cookie"] = allCookies;
  }


  // ----- 3. Make the request, (with timeout + retry on transient errors) -----
  const response = await fetchWithTimeoutAndRetry(input, { ...init, credentials: "include", headers });


  // ----- 4. return response & end the function here, if res is not 401, or if we already used the refresh retry ──
  if (response.status !== 401 || !retry) {    
    if (!response.ok) await throwApiError(response);   // throw typed error for all non-ok responses
    return response;
  }

  // Don't attempt refresh on auth routes (login/signup/etc those 401s are real auth failures, not expired tokens)
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("/auth/")) await throwApiError(response);  // return the real 401/403 auth Error to the caller


  // ----- 5. Attempt token refresh ---------
  // SERVER: no refresh attempt — throw immediately (AuthProviderClient.tsx's useEffect is responsible for repairing the session client-side after this throws.)
  if (typeof window === "undefined") { await throwApiError(response) }
  // CLIENT: attempt refresh
  const refreshed = await performRefresh();       // call the refresh token Helper function
  if (!refreshed.ok && refreshed.status !== 409) await throwApiError(response);  // refresh failed → throw original 401 as ApiError


  // ----- 6. Retry original request once after successful refresh -------
  return apiFetch(input, init, false);   // set retry=false prevents infinite loop (it's true by default in the function params)

}


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER FUNCTIONS & UTILITIES for fetchWithTimeoutAndRetry, performRefresh, backoff, throwApiError
// ─────────────────────────────────────────────────────────────────────────────

// Fetch with timeout + exponential backoff retry, Only retries on network failures and RETRYABLE_STATUSES (5xx, 408, 429), but 401/403/404 are NOT retried here — 401 goes through refresh logic above.
async function fetchWithTimeoutAndRetry( input: RequestInfo, init: RequestInit, attempt = 0 ): Promise<Response> {
  // Create a fresh AbortController per attempt (can't reuse an aborted controller)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  // Determine if the request is safe to retry
  const method = ((init as RequestInit).method ?? "GET").toUpperCase();
  const isSafeToRetry = method === "GET" || method === "HEAD";
  // attempt to fetch, if fails, retry after backoff, catching the server & network errors
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });  // fetch() throws on network errors
    clearTimeout(timeoutId);                                                      // Clear the timeout
    // Retry on transient server errors — but not beyond MAX_RETRIES
    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES && isSafeToRetry) {
      await backoff(attempt);
      return fetchWithTimeoutAndRetry(input, init, attempt + 1);
    }
    return response;              // Return the response (ok or not) to the caller — caller will handle non-ok responses
  } catch (err) {
    clearTimeout(timeoutId);      // Clear the timeout on error as well
    // Retry on network-level errors (fetch throws instead of returning a response), e.g. DNS failure, connection reset, internet dropped
    if (attempt < MAX_RETRIES && isSafeToRetry) {
      await backoff(attempt);
      return fetchWithTimeoutAndRetry(input, init, attempt + 1);
    }
    // Throw Timeout: Baesd on AbortError from our controller
    if (err instanceof DOMException && err.name === "AbortError") { throw new ApiError(408, `Request timed out after ${DEFAULT_TIMEOUT_MS}ms`); }
    // Throw Other network error (e.g. DNS failure, connection reset, internet dropped)
    throw new ApiError(0, `Network error: ${err instanceof Error ? err.message : "unknown"}`);
  }
}


//  Token refresh logic — CLIENT-Side refresh (with lock to prevent concurrent races)
//  SERVER-Side refresh is handled by the middleware (proxy.ts) for protected routes.
async function performRefresh(): Promise<Response> {
  // Refresh lock: if multiple requests 401 simultaneously, only ONE refresh call  
  if (!clientRefreshPromise) {
    clientRefreshPromise = (async (): Promise<Response> => {
      try {
        return await fetch(`${BACKEND_ORIGIN}/auth/refresh-token`, {
          method: "POST",
          credentials: "include", // browser sends httpOnly refreshToken cookie automatically
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
      } catch {
        // Network error during refresh, return 503 Service Unavailable with a JSON error message
        return new Response(JSON.stringify({ message: "Refresh request failed" }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
    })().finally(() => { clientRefreshPromise = null; });
  }

  return clientRefreshPromise;      // All concurrent requests awaiting the refresh will get the same promise, so only one actual refresh call is made
}


// ---- Exponential backoff delay: attempt 0 → 500ms, attempt 1 → 1000ms, attempt 2 → 2000ms ---
function backoff(attempt: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, BACKOFF_BASE_MS * 2 ** attempt));
}


// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────
//  TYPED API ERROR: Thrown by apiFetch when the response is not ok (after all retries exhausted).
//  caught in server-actions/queries: try { ... } catch (err) { if (err instanceof ApiError) return { error: err.message }; .... }
export class ApiError extends Error {
  // constructor (HTTP status code, e.g. 400, 403, 404,..), (error message from backend or fallback), (raw parsed response body, if available) 
  constructor( public status: number, message: string, public data?: unknown ) {
    super(message);
    this.name = "ApiError";
  }  
}

// Parse a non-ok response and throw a typed ApiError, Tries to extract { message } from the JSON body, falls back to statusText
async function throwApiError(response: Response): Promise<never> {
  // variable to hold the parsed response body, if available. If parsing fails, it will remain undefined.
  let data: unknown;
  let message = response.statusText || `HTTP ${response.status}`;
  try {
    data = await response.clone().json();   // It Uses response.clone() so the body stream stays readable by the caller if needed.
    // If the parsed data is an object with a "message" property, use that as the error message
    if (data && typeof data === "object" && "message" in data) { message = (data as { message: string }).message; }
  } catch { }
  throw new ApiError(response.status, message, data);   // Throw typed ApiError with status, message, and optional parsed data
}




/********* OLDER VERSION (If backend uses Authorization: 'Bearer <token>' instead of cookies), used if backend needs to support MOBILE Apps ************/
// import { BACKEND_ORIGIN } from "./utils";

// // ─────────────────────────────────────────────────────────────────────────────
// //  CONFIGURATIONS
// // ─────────────────────────────────────────────────────────────────────────────
// const DEFAULT_TIMEOUT_MS = 10_000;  // 10 seconds — abort if backend doesn't respond
// const MAX_RETRIES = 2;              // Max retries for transient errors (NOT counting the 401 refresh retry, that's separate)
// const BACKOFF_BASE_MS = 500;        // Backoff base in ms — actual wait = BASE * 2^attempt → 500ms, 1000ms
// // Which HTTP status codes trigger a retry (besides 401 which has its own refresh logic), 5xx = transient server errors. 408 = request timeout. 429 = rate limit (with backoff).
// const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
// // REFRESH LOCK: prevents concurrent 401 retries from racing, Only relevant on the client side; server requests are isolated per render
// let refreshPromise: Promise<Response> | null = null;
// // Variable to hold the current access token, Only relevant on the client side
// let inMemoryAccessToken: string | null = null;

// // ⚠️ CLIENT-ONLY functions — guarded against server-side calls to prevent cross-user, token pollution in serverless environments where module state is shared across requests on the same instance (e.g. Vercel, AWS Lambda).
// export function setAccessToken(token: string | null) {
//   if (typeof window === "undefined") return; // no-op on server — never mutate shared state
//   inMemoryAccessToken = token;
// }
// export function getAccessToken(): string | null {
//   if (typeof window === "undefined") return null; // server reads from cookie, not memory
//   return inMemoryAccessToken;
// }


// // ─────────────────────────────────────────────────────────────────────────────
// // apiFetch Wrapper (Backend is BEARER TOKEN AUTH) → This works in BOTH server and client contexts
// //
// //  Server context (Server Components, Server Actions, lib/queries/*):
// //   ✅ Reads accessToken from Next.js cookieStore (non-httpOnly, written at login)
// //   ✅ Manually forwards Cookie header for the httpOnly refreshToken cookie
// //   ✅ Supports next: { revalidate } / cache options for ISR/SSG/SSR
// //
// //  Client context ("use server" actions called from Client Components):
// //   ✅ Reads accessToken from in-memory store (set after login/refresh)
// //   ✅ credentials:"include" sends httpOnly refreshToken cookie automatically
// //   ✅ Refresh lock prevents concurrent 401 race conditions
// //   ✅ Stores new accessToken in memory after refresh so retry request has it
// //
// //  Both contexts:
// //   ✅ Request timeout via AbortController (DEFAULT_TIMEOUT_MS)
// //   ✅ Automatic retry with exponential backoff on 5xx / network errors
// //   ✅ Auto-refresh on 401 with one retry of the original request
// //   ✅ Typed ApiError thrown on non-ok responses (after all retries exhausted)
// //   ✅ FormData support — removes Content-Type so browser sets multipart boundary
// //   ✅ Caller-provided Content-Type is respected (not overridden)
// //   ✅ Body re-read safety — string/FormData bodies are safely reused on retry
// //   ❌ No CSRF protection — not needed, Bearer tokens in headers are not sent automatically by browsers so there is no CSRF attack vector
// // ─────────────────────────────────────────────────────────────────────────────
// export async function apiFetch( input: RequestInfo, init: RequestInit & { next?: { revalidate?: number; tags?: string[] }; cache?: RequestCache } = {}, retry = true ): Promise<Response> {

//   // ── 1. Read accessToken (different method per context) ──
//   let accessToken: string | undefined;
//   if (typeof window === "undefined") {
//     // Server: read from cookieStore — accessToken stored as non-httpOnly at login
//     const { cookies } = await import("next/headers");     // 🟢 Dynamic import 
//     const cookieStore = await cookies();
//     accessToken = cookieStore.get("accessToken")?.value;
//   } else {
//     // Client: read from in-memory store — set via setAccessToken() after login/refresh, Will be null after page refresh until AuthProvider useEffect runs silent refresh
//     accessToken = inMemoryAccessToken ?? undefined;
//   }

//   // ── 2. Build headers ──
//   const isFormData = init.body instanceof FormData;  // Detect if user is sending FormData (image/file), or not (just normal JSON)
//   const callerHeaders = init.headers as Record<string, string> | undefined;  // Optional caller-provided headers
//   const headers: Record<string, string> = {
//     ...callerHeaders,
//     // Attach Bearer token — backend reads auth from this header
//     ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
//     // No X-CSRF-Token — Bearer mode doesn't need CSRF protection
//   };
//   if (isFormData) {
//     // MUST omit Content-Type — browser sets multipart/form-data boundary automatically
//     delete headers["Content-Type"];
//   } else if (!headers["Content-Type"]) {
//     // default to JSON if caller didn't set Content-Type explicitly, Also this allows callers to send text/plain, application/x-www-form-urlencoded, etc.. if they want.
//     headers["Content-Type"] = "application/json";
//   }
 
//   // Server-side: manually forward all cookies so the httpOnly refreshToken reaches the backend on refresh calls, (credentials:"include" is browser-only)
//   if (typeof window === "undefined") {
//     const { cookies } = await import("next/headers");    // 🟢 Dynamic import
//     const cookieStore = await cookies();
//     const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
//     if (allCookies) headers["Cookie"] = allCookies;
//   }


//   // ── 3. Make the request (with timeout + retry on transient errors) ──
//   const response = await fetchWithTimeoutAndRetry(input, { ...init, credentials: "include", headers });


//   // ── 4. return response & end the function here, if res is not 401, or if we already used the refresh retry ──
//   if (response.status !== 401 || !retry) {
//     if (!response.ok) await throwApiError(response);   // throw typed error for all non-ok responses
//     return response;
//   }

//   // Don't attempt token refresh on auth routes — those 401s are real failures, (wrong password, invalid token format, etc.) not expired token 401s
//   const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
//   if (url.includes("/auth/")) await throwApiError(response);


//   // ── 5. Attempt token refresh ──
//   // SERVER: no refresh attempt — throw immediately (AuthProviderClient.tsx's useEffect is responsible for repairing the session client-side after this throws.)
//   if (typeof window === "undefined") { await throwApiError(response) }
//   // CLIENT: attempt refresh
//   const refreshed = await performRefresh();          // call the refresh token Helper function
//   if (!refreshed.ok && refreshed.status !== 409) await throwApiError(response);  // refresh failed → throw original 401 as ApiError

//   // ── 6. Retry original request once after successful refresh ──
//   // String bodies (JSON.stringify) and FormData are safe to reuse as they are not consumed by fetch, but ReadableStream / ArrayBuffer bodies WOULD fail here because they are consumed after the first fetch call. 
//   // But if you ever need to, you would need to clone the body before the first fetch call:
//   //  const req = new Request(input, init); // clone before first fetch... then pass req instead of input+init to fetchWithTimeoutAndRetry
//   return apiFetch(input, init, false);   // set retry=false prevents infinite loop (it's true by default in the function params)
// }



// // ─────────────────────────────────────────────────────────────────────────────
// //  HELPER FUNCTIONS & UTILITIES for fetchWithTimeoutAndRetry, performRefresh, backoff, throwApiError
// // ─────────────────────────────────────────────────────────────────────────────

// //  Fetch with timeout + exponential backoff retry, Only retries on network failures & RETRYABLE_STATUSES (5xx, 408, 429), Does NOT retry 401/403/404 — those go through refresh logic or throw immediately.
// async function fetchWithTimeoutAndRetry( input: RequestInfo, init: RequestInit, attempt = 0 ): Promise<Response> {
//   // Fresh AbortController per attempt — can't reuse an aborted one
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS); 
//   // Determine if the request is safe to retry
//   const method = ((init as RequestInit).method ?? "GET").toUpperCase();
//   const isSafeToRetry = method === "GET" || method === "HEAD"; 
//   // attempt to fetch, if fails, retry after backoff, catching the server & network errors
//   try {
//     const response = await fetch(input, { ...init, signal: controller.signal });
//     clearTimeout(timeoutId);       // Clear the timeout
//     // Retry on transient server errors — but not beyond MAX_RETRIES
//     if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES && isSafeToRetry) {
//       await backoff(attempt);
//       return fetchWithTimeoutAndRetry(input, init, attempt + 1);
//     }
//     return response;                // return the response 
//   } catch (err) {
//     clearTimeout(timeoutId);        // Clear the timeout
//     // Retry on transient network errors
//     if (attempt < MAX_RETRIES && isSafeToRetry) {
//       await backoff(attempt);
//       return fetchWithTimeoutAndRetry(input, init, attempt + 1);
//     }
//     // Throw timeout error, if it's an AbortError
//     if (err instanceof DOMException && err.name === "AbortError") { throw new ApiError(408, `Request timed out after ${DEFAULT_TIMEOUT_MS}ms`) }
//     // Throw any other errors (e.g. DNS failure, connection reset, internet dropped)
//     throw new ApiError(0, `Network error: ${err instanceof Error ? err.message : "unknown"}`);
//   }
// }


// // ─────────────────────────────────────────────────────────────────────────────
// //  Token refresh logic — CLIENT-Side refresh (with lock to prevent concurrent races)
// //
// //  KEY DIFFERENCE from cookie version:
// //  After a successful refresh, we must manually store the new accessToken, so the retry in step 6 picks it up in step 1, In cookie-based auth the browser does this automatically via Set-Cookie.
// // ─────────────────────────────────────────────────────────────────────────────
//    async function performRefresh(): Promise<Response> {
//    if (!refreshPromise) {
//     refreshPromise = (async (): Promise<Response> => {
//       // Try the refresh token request, Handle if it fails due to network error.
//       let refreshRes: Response;
//       try {
//         refreshRes = await fetch(`${BACKEND_ORIGIN}/auth/refresh-token`, {
//           method: "POST",
//           credentials: "include", // sends httpOnly refreshToken cookie automatically
//           headers: { "Content-Type": "application/json" },
//           cache: "no-store",
//         });
//       } catch {
//         // Network failed during refresh — return a synthetic 503 Response, so apiFetch sees !refreshed.ok and throws the original 401 via throwApiError
//         // (we can't throw here because other waiters on refreshPromise need a Response)
//         return new Response(JSON.stringify({ message: "Refresh request failed" }), {
//           status: 503,
//           headers: { "Content-Type": "application/json" },
//         });
//       }

//       if (refreshRes.ok) {
//         // Manually store new accessToken in memory, so the retry request in step 6 reads it in step 1 and sends the header.
//         // Without this, retry goes out with no token → gets 401 again → infinite loop.
//         const { accessToken: newAccessToken } = await refreshRes.json();
//         if (newAccessToken) setAccessToken(newAccessToken);
//         // refreshToken is set by browser automatically via Set-Cookie response header
//       }

//       return refreshRes;
//     })().finally(() => { refreshPromise = null; });
//   }

//   return refreshPromise;   // All concurrent requests awaiting the refresh will get the same promise, so only one actual refresh call is made
// }


// // ---- Exponential backoff delay: attempt 0 → 500ms, attempt 1 → 1000ms, attempt 2 → 2000ms ---
// function backoff(attempt: number): Promise<void> {
//   return new Promise(resolve => setTimeout(resolve, BACKOFF_BASE_MS * 2 ** attempt));
// }


// // ─────────────────────────────────────────────────────────────────────────────
// // ERROR HANDLING
// // ─────────────────────────────────────────────────────────────────────────────
// //  TYPED API ERROR: Thrown by apiFetch when the response is not ok (after all retries exhausted).
// //  caught in server-actions/queries: try { ... } catch (err) { if (err instanceof ApiError) return { error: err.message }; .... }
// export class ApiError extends Error {
//   // constructor (HTTP status code, e.g. 400, 403, 404,..), (error message from backend or fallback), (raw parsed response body, if available) 
//   constructor( public status: number, message: string, public data?: unknown ) {
//     super(message);
//     this.name = "ApiError";
//   }  
// }

// // Parse a non-ok response and throw a typed ApiError.
// async function throwApiError(response: Response): Promise<never> {
//   // variables to hold the parsed response body and error message
//   let data: unknown;
//   let message = response.statusText || `HTTP ${response.status}`;  
//   try {
//     data = await response.clone().json();   // It Uses response.clone() so the body stream stays readable by the caller if needed.
//     // If the response body is not JSON, we will just throw the statusText as the message. If it is JSON and has a "message" property, we use that instead.
//     if (data && typeof data === "object" && "message" in data) { message = (data as { message: string }).message; }
//   } catch { /* body wasn't JSON — keep statusText fallback */ }
//   throw new ApiError(response.status, message, data);
// }


// // ─────────────────────────────────────────────────────────────────────────────
// //  USAGE NOTES
// // ----------------------
// // 1. Change : authActions.ts — registerAction and loginAction
// // --- Current (cookie):
// // const cookieStore = await cookies();
// // cookieStore.set("accessToken", accessToken, { httpOnly: true, ... });
// // cookieStore.set("refreshToken", refreshToken, { httpOnly: true, ... });
// // return { success: true, callbackUrl: formData.callbackUrl || "/" };
// // --- Change to (Bearer):
// // const cookieStore = await cookies();
// // accessToken: httpOnly FALSE — must be JS-readable for Bearer header attachment
// // cookieStore.set("accessToken", accessToken, {
// //   httpOnly: false,  // ← only this changes
// //   secure: isProd, sameSite: "lax", path: "/", maxAge: 15 * 60,
// // });
// // refreshToken: stays httpOnly — backend will set this via Set-Cookie anyway, but since signup/login return it in body too, set it here for consistency
// // cookieStore.set("refreshToken", refreshToken, {
// //   httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
// // });
// // NEW: return accessToken so the client component can call setAccessToken()
// // return { success: true, callbackUrl: formData.callbackUrl || "/", accessToken };
// //
// // ---------------------------------------------------------------------
// // 2. Change : LoginForm.tsx / RegisterForm.tsx — Store token in memory after success
// // --- Current:
// // toast.success("Logged in successfully!");
// // const user = await getMyProfile();
// // --- Change to:
// // import { setAccessToken } from "@/lib/api"; // ← new import
// //
// // toast.success("Logged in successfully!");
// // if (res.accessToken) setAccessToken(res.accessToken); // ← NEW: store in memory for client-side apiFetch calls
// // const user = await getMyProfile();
// //
// // ---------------------------------------------------------------------
// // 3. Change : SocialButtons.tsx — OAuth popup flow needs the token too
// // --- Current (route.ts:) :
// // cookieStore.set("accessToken", accessToken, { ...cookieOpts, maxAge: 15 * 60 });
// // cookieStore.set("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 });
// // return sendPopupResponse(req, "success");
// // --- Change to:
// // cookieStore.set("accessToken", accessToken, { ...cookieOpts, httpOnly: false, maxAge: 15 * 60 }); // ← httpOnly: false
// // cookieStore.set("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 }); // unchanged
// // NEW: pass accessToken to the popup message so client can store it in memory
// // return sendPopupResponse(req, "success", accessToken);

// // sendPopupResponse helper function :
// // function sendPopupResponse(req: NextRequest, status: "success" | "error", accessToken?: string) {
// //   const html = `
// //     <html><body><script>
// //       window.opener?.postMessage(
// //         { type: "${status === "success" ? "OAUTH_SUCCESS" : "OAUTH_ERROR"}", accessToken: ${accessToken ? `"${accessToken}"` : "null"} },
// //         "${new URL(req.url).origin}"
// //       );
// //       window.close();
// //     </script></body></html>
// //   `;
// //  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
// // }

// // --- change : SocialButtons.tsx — read the token from the message:
// // import { setAccessToken } from "@/lib/api"; // ← new import

// // const handleMessage = async (event: MessageEvent) => {
// //   if (event.origin !== window.location.origin) return;
// //   if (event.data?.type !== "OAUTH_SUCCESS") return;
  
// //   popupRef.current?.close();
// //   if (event.data.accessToken) setAccessToken(event.data.accessToken); // ← NEW
// //   const user = await getMyProfile();
// //   setUser(user);
// //   router.push(callbackUrl);
// // };
// //
// // ---------------------------------------------------------------------
// // 4. Change : AuthProviderClient.tsx — Restore token on page refresh
// // --- Current:
// // useEffect(() => {
// //   if (initialUser) return;
// //   getMyProfile().then(setUser).catch(() => setUser(null)).finally(() => setIsLoading(false));
// // }, []);
// // --- Change to:
// // import { setAccessToken } from "@/lib/api"; // ← new import
// // import { BACKEND_ORIGIN } from "@/lib/utils"; // ← new import

// // useEffect(() => {
// //   if (initialUser) return;

//   // NEW: restore accessToken from memory loss on page refresh, via silent refresh
// //   fetch(`${BACKEND_ORIGIN}/auth/refresh-token`, {
// //     method: "POST",
// //     credentials: "include", // sends httpOnly refreshToken cookie automatically
// //     cache: "no-store",
// //   })
// //     .then(res => (res.ok ? res.json() : null))
// //     .then(data => {
// //       if (data?.accessToken) setAccessToken(data.accessToken); // ← restore memory
// //       return getMyProfile(); // now apiFetch can read the restored token
// //     })
// //     .then(setUser)
// //     .catch(() => setUser(null))
// //     .finally(() => setIsLoading(false));
// // }, []);
// //
// // ---------------------------------------------------------------------
// // 5. Change : logout function (profile-buttons.tsx) — Clear memory too
// // --- Current:
// // const handleLogout = async () => {    
// //   await logoutAction();               // logout server action
// //   window.location.href = "/";         // full reload → clears RSC cache + cookies
// // };
// // --- Change to:
// // import { setAccessToken } from "@/lib/api"; // ← new import

// // async function handleLogout() {
// //   await logoutAction();
// //   setAccessToken(null); // ← NEW: clear in-memory token
// //   window.location.href = "/";         // full reload → clears RSC cache + cookies
// // }
// // ─────────────────────────────────────────────────────────────────────────────

