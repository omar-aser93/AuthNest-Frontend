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


// ---------- GET ALL POSTS FUNCTION ---------- 
export async function getAllPosts(q?: string, limit = 10, cursor?: string) {
  try {
    // generate query params with recieved (q & limit & cursor) for pagination
    const query = new URLSearchParams();
    if (q) query.append("search", q);
    query.append("limit", limit.toString()); 
    if (cursor) query.append("cursor", cursor);

    // API call to fetch all posts, with (limit & cursor) query params, and revalidate cache every 60 seconds (Public data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts?${query.toString()}`, { next: { revalidate: 60 } });  
    return await res.json();        // parse the res & return { posts, nextCursor }  
  } catch (err) {   
    if (err instanceof ApiError) return { posts: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { posts: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}   



// ---------- GET MY POSTS FUNCTION ----------
// Note: I'll create it to work with both (infinite scroll & Numbered pagination), as example if we wanted to use one or both with any other server-action
export async function getMyPosts(limit = 10, cursor?: string, page?: number) {
  try {
    // generate query params with recieved (limit & cursor/page) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    // Use cursor-based for infinite scroll, page-based for numbered
    if (cursor) { query.append("cursor", cursor) } else if (page) { query.append("page", page.toString()) }

    // API call to fetch my posts, with (limit & cursor/page) query params, No revalidate cache (it's private data), we update cache with (revalidatePath) at post create/update submission
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/me?${query.toString()}`);
    return await res.json();        // parse the res & return { posts, nextCursor, totalPages, currentPage }
  } catch (err) {
    if (err instanceof ApiError) return { posts: [], nextCursor: null, totalPages: 0, currentPage: 1, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { posts: [], nextCursor: null, totalPages: 0, currentPage: 1, error: `Unexpected error, please try again` };      // on other errors, return empty array & default pagination
  } 
} 



// ---------- GET SINGLE POST FUNCTION ----------
export async function getPost(postId: string) {
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/${postId}`);    // API call to fetch post by (id param) 
    return await res.json();             // parse the response & returns post object
  } catch {
    return null;                         // on error, return empty array
  }
}



// ---------- GET POSTS BY USER ID FUNCTION ----------
export async function getPostsByUserId(userId: string, limit = 10, cursor?: string) {
  try {
    // generate query params with recieved (limit & cursor) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);

    // send the data to backend (API call), with (id & limit & cursor), and revalidate cache every 60 seconds (Public data)
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/user/${userId}?${query.toString()}`, { next: { revalidate: 60 } });  
    return await res.json();        // parse the res & return { posts, nextCursor }  
  } catch (err) {    
     if (err instanceof ApiError) return { posts: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
     return { posts: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}



// ---------------- GET POSTS BY HASHTAG FUNCTION ----------------
export async function getPostsByHashtag(tag: string, limit = 10, cursor?: string) {
  try {
    // generate query params with recieved (limit & cursor) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());
    if (cursor) query.append("cursor", cursor);

    // send the data to backend (API call), with (tag & limit & cursor), and revalidate cache every 60 seconds  
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/hashtag/${tag}?${query.toString()}`, { next: { revalidate: 60 } });  
    return await res.json();                      // parse the res & return { posts, nextCursor }  
  } catch (err) {   
    if (err instanceof ApiError) return { posts: [], nextCursor: null, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { posts: [], nextCursor: null, error: `Unexpected error, please try again` };      // on other errors, return empty array & cursor
  }
}



// ----------------- GET TRENDING HASHTAGS FUNCTION -----------------
export async function getTrendingHashtags(limit = 20) {
  try {
    // generate query params with recieved (limit) for pagination
    const query = new URLSearchParams();
    query.append("limit", limit.toString());  

    // API call to fetch trending hashtags (normal fetch because it's a public fetch without auth), with (limit), and revalidate cache to get new trending hashtags every 300 seconds (5 minutes)
    const res = await fetch(`${BACKEND_ORIGIN}/posts/trending?${query.toString()}`, { next: { revalidate: 300 }} );
    // if request failed, return empty array & cursor 
    if (!res.ok) return [];  

    // parse the res & return array of hashtags
    const data = await res.json();                  
    return Array.isArray(data) ? data : [];
  } catch {
    return [];             // on error, return empty array
  }
}



// ----------------- SEARCH HASHTAGS FUNCTION -----------------
export async function searchHashtags(q: string, limit = 20, page = 1) {
  try {
    // generate query params with recieved (limit) for pagination
    const query = new URLSearchParams({ q, limit: limit.toString(), page: page.toString() });

    // send the data to backend (API call), with (limit), and revalidate cache to get new hashtags every 300 seconds (5 minutes)
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/search/hashtags?${query.toString()}`, { next: { revalidate: 300 }} );
    return await res.json();     // parse the res & return { hashtags, totalPages, currentPage }    
  } catch (err) {
    if (err instanceof ApiError) return { hashtags: [], totalPages: 0, currentPage: 1, error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { hashtags: [], totalPages: 0, currentPage: 1, error: `Unexpected error, please try again` };      // on other errors, return empty array & default pagination
  }
}


