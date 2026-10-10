import { BACKEND_ORIGIN } from "../utils";
import { apiFetch, ApiError } from "../api";

// -----------------------------------------------------------------------------
// QUERIES – central data-access layer (NO "use server") - designed to be called directly from (Components, pages, layouts, ...).
// -----------------------------------------------------------------------------
// - unlike fetching at server-actions that forces unnecessary POST request, disables HTTP caching & adds serialization overhead... This allowes `fetch` with caching options (`next: { revalidate }`) and are compatible with static generation, ISR, & streaming (Suspense).
/* - Queries Can be called from both Server and Client Components because apiFetch works on both sides.
   - Use "next: { revalidate }" & other caching options, only when calling from server contexts – it's ignored on the client -> we can use react-query or SWR libs to handle caching & (loading/error) states on the client */
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility, Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */


// ---------- GET MY PROFILE FUNCTION ----------
export async function getMyProfile() {
  try {    
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/me`);   // Call getMyProfile API endpoint
    return await res.json();          // respond with the user profile data
  } catch {    
    return null;                      // on error, return null (user not logged in)
  }
}



// ---------- GET A USER BY ID FUNCTION ----------
export async function getUserById(userId: string) {
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/${userId}`);   // Call get user by ID API endpoint
    return await res.json();               // respond with the user data
  } catch {
    return null;                           // on error, return null
  }
}   



// ---------- SEARCH USERS FUNCTION ----------
export async function searchUsers(q?: string, limit = 20, cursor?: string) {
  try {
    // generate query params with recieved (q & limit & cursor) for pagination
    const query = new URLSearchParams();
    if (q) query.append("q", q);
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);

    // send the data to backend (API call), with (q & limit & cursor), and revalidate cache every 60 seconds (Public data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/search-users?${query.toString()}`, { next: { revalidate: 60 } });  
    return await res.json();               // parse the res & return { users, nextCursor }  
  } catch (err) {
    if (err instanceof ApiError) return { users: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { users: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}



// ---------------- SEARCH USERS FOR MENTION - FUNCTION ----------------
export async function searchUsersForMention(q: string) {
  try {
    // Call search users API endpoint, no-cache (mentions must be realtime fetched)
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/search?q=${encodeURIComponent(q)}`, { method: "GET", cache: "no-store" });
    
    const data = await res.json();                   // parse the response    
    return { users: data };                          // return found users
  } catch (err) {
    if (err instanceof ApiError) return { users: [], error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { users: [], error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}