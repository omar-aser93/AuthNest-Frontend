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


// ---------- GET POST COMMENTS Function ----------
export async function getPostComments(postId: string, limit = 10, cursor?: string, parentId?: string ) {
  try {
    // generate query params with recieved (limit & cursor) for pagination + (parentId for fetching replies of a comment)
    const query = new URLSearchParams();          
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);
    if (parentId) query.append("parentId", parentId);

    // API call to fetch post comments, with (limit & cursor) query params, and revalidate cache every 30 seconds (Public data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/comments/posts/${postId}/comments?${query}`, { next: { revalidate: 30 } } );
    return await res.json();      // parse the res & return { comments, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { comments: [], nextCursor: null, error: err.message };    // if it's an ApiError, it already has a user-friendly message, so return that
    return { comments: [], nextCursor: null, error: "unexpected error" };   // on other errors, return empty array & cursor + error message
  }
}
