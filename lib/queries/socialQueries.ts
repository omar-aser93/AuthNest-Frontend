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


// ---------- GET MY FRIENDS Function ----------
export async function getMyFriends(limit = 50, cursor?: string, q?: string) {
  try {
    // generate query params with recieved (limit, cursor, q) for pagination & search
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);
    if (q) query.append("q", q);

    // API call to fetch my friends, with (limit, cursor, q) query params, No revalidate cache (it's private data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends?${query}`);
    return await res.json();           // parse the res & return { friends, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { friends: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { friends: [], nextCursor: null, error: "Unexpected error, please try again" };      // on other errors, return empty array & cursor + error message
  }
}



// ---------- GET FRIEND REQUESTS FUNCTION ----------
export async function getFriendRequests( type: "received" | "sent" | "all" = "received", limit = 20, cursor?: string ) {
  try {
    // generate query params with recieved (type, limit, cursor) for pagination & filter
    const query = new URLSearchParams();
    query.append("type", type);
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);

    // API call to fetch friend requests, with (type, limit, cursor) query params, No revalidate cache (it's private data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/requests?${query}`);
    return await res.json();      // parse the res & return { requests, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { requests: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { requests: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}



// ---------- GET FRIEND SUGGESTIONS FUNCTION ----------
export async function getFriendSuggestions(limit = 10) {
  try {
    // generate query params with recieved (limit) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());

    // API call to fetch friend suggestions, with (limit) query params, No revalidate cache (it's private data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/suggestions?${query}`);
    return await res.json();        // parse the res & return { suggestions }
  } catch (err) {
    if (err instanceof ApiError) return { suggestions: [], error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { suggestions: [], error: `Unexpected error, please try again` };      // on other errors, return empty array
  }
}



// ---------- GET BLOCKED USERS FUNCTION ----------
export async function getBlockedUsers(limit = 20, cursor?: string) {
  try {
    // generate query params with recieved (limit & cursor) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);

    // API call to fetch blocked users, with (limit & cursor) query params, No revalidate cache (it's private data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/blocked?${query}`);
    return await res.json();        // parse the res & return { users, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { users: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { users: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}



// ---------- GET FRIENDSHIP STATUS Function ----------
export async function getFriendshipStatus(targetUserId: string) {
  try {
    // API call to get friendship status with targetUserId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/status/${targetUserId}`);
    return await res.json();                   // parse the res & return { status, friendshipId, direction }
  } catch {
    return { status: null };                   // on error, return null (treat as no friendship)
  }
}
