import { BACKEND_ORIGIN } from "../utils";
import { apiFetch, ApiError } from "../api";
import type { MyReportsResponse } from "../validator";

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


// ---------- GET MY REPORTS FUNCTION - "My reports" page ----------
// Cache: no-store — status changes after admin review and the user should see updates.
export async function getMyReports(page = 1, limit = 20): Promise<MyReportsResponse> {
  try {
    // API call to fetch my reports
    const res = await apiFetch(
      `${BACKEND_ORIGIN}/reports/me?page=${page}&limit=${limit}`,
      { cache: "no-store" }
    );
    return await res.json();            // parse the res & return { reports, error }
  } catch (err) {
    if (err instanceof ApiError) return { reports: [], error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { reports: [], error: "Unexpected error, please try again" };      // on other errors, return empty array + error message
  }
}   