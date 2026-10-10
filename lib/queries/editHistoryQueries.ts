"use server";

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

   
// ---------- GET POST EDIT HISTORY  ----------
export async function getPostEditHistory(postId: string) {
  try {
    // API call to fetch post edit history
    const res = await apiFetch(`${BACKEND_ORIGIN}/edit-history/posts/${postId}/edits`);
    return await res.json();                         // parse the res & return { edits }
  } catch (err) {
    if (err instanceof ApiError) return { edits: [], error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { edits: [], error: "Unexpected error, please try again" };        // on other errors, return empty array + error message
  }
}



// ---------- GET COMMENT EDIT HISTORY ----------
export async function getCommentEditHistory(commentId: string) {
  try {
    // API call to fetch comment edit history
    const res = await apiFetch(`${BACKEND_ORIGIN}/edit-history/comments/${commentId}/edits`);
    return await res.json();                          // parse the res & return { edits }
  } catch (err) {
    if (err instanceof ApiError) return { edits: [], error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { edits: [], error: "Unexpected error, please try again" };        // on other errors, return empty array + error message
  }
}



// ---------- GET MESSAGE EDIT HISTORY ----------
export async function getMessageEditHistory(messageId: string) {
  try {
    // API call to fetch message edit history
    const res = await apiFetch(`${BACKEND_ORIGIN}/edit-history/messages/${messageId}/edits`);
    return await res.json();                         // parse the res & return { edits }
  } catch (err) {
    if (err instanceof ApiError) return { edits: [], error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { edits: [], error: "Unexpected error, please try again" };        // on other errors, return empty array + error message
  }
}