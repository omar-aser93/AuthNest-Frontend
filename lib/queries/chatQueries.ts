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


// ------------ Get all conversations for the current user (used in chats & single conversation pages) ----------
export async function getConversations() {
  try {
    // API call to get conversations for the current user
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations`);
    return await res.json();   // return { conversations }
  } catch (err) {
    if (err instanceof ApiError) return { conversations: [], error: err.message };    // if it's an ApiError, it already has a user-friendly message, so return that
    return { conversations: [], error: "Unexpected error, please try again" };        // if network error, return empty conversations + error message
  }
}



// ------- Get a single conversation by id (used by the guard for [conversationId] server page) ----------
export async function getConversation(id: string) {
  try {
    // API call to get a single conversation by id
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}`);
    return await res.json();   // return { conversation }
  } catch (err) {
    if (err instanceof ApiError) return { conversation: null, error: err.message };   // if it's an ApiError, it already has a user-friendly message, so return that
    return { conversation: null, error: "Unexpected error, please try again" };       // if network error, return null conversation + error message
  }
}



// ------- Get Paginated messages — used by server page (initial load) and useChat() hook ----------
export async function getMessages(conversationId: string, cursor?: string) {
  try {
    const query = cursor ? `?cursor=${cursor}` : "";   // if cursor exists, add it to the query

    // API call to fetch messages by conversation id
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${conversationId}/messages${query}`);
    return await res.json();   // return { messages, nextCursor }
  } catch (err) {
    if (err instanceof ApiError) return { messages: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { messages: [], nextCursor: null, error: "Unexpected error, please try again" };      // if network error, return empty messages + null cursor + error message
  }
}

