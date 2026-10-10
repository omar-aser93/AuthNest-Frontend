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


// ---------- GET MY NOTIFICATIONS ----------
export async function getMyNotifications( limit = 20, cursor?: string, unreadOnly = false ) {
  try {
    // generate query params with recieved (limit, cursor & unreadOnly) for pagination/filtering
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);
    if (unreadOnly) query.append("unread", "true");

    // API call to fetch my notifications, with (limit, cursor & unreadOnly) query params, No revalidate cache (it's private data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/notifications?${query}`);
    return await res.json();                           // parse the res & return { notifications, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { notifications: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { notifications: [], nextCursor: null, error: "Unexpected error, please try again" };      // if other errors, return empty messages + null cursor + error message
  }
}



// ---------- GET UNREAD NOTIFICATIONS COUNT FUNCTION ----------
export async function getUnreadNotificationsCount() {
  try {
    // API call to get unread notifications count
    const res = await apiFetch(`${BACKEND_ORIGIN}/notifications/unread-count`);     
    return await res.json();                 // parse the res & return { count }
  } catch (err) {
    if (err instanceof ApiError) return { count: 0, error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { count: 0, error: "Unexpected error, please try again" };        // on other errors, return 0 + error message
  }
}   