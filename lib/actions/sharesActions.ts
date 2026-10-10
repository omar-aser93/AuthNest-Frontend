"use server";

import { BACKEND_ORIGIN } from "../utils";
import { apiFetch, ApiError } from "../api";
import { revalidatePath } from "next/cache";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */
  

// ---------- SHARE POST Server-Action ----------
export async function sharePostAction( postId: string, message?: string, privacy = "PUBLIC", blocked: string[] = [] ) {
  try {
    // API call to share a post with optional message
    const res = await apiFetch(`${BACKEND_ORIGIN}/shares/posts/${postId}/shares`, {
      method: "POST",
      body: JSON.stringify({ message, privacy, blocked }),
    });

    const data = await res.json();                  // parse the response
    revalidatePath("/");                            // revalidate cached data on the home page to reflect new share
    revalidatePath(`/posts/${postId}`);             // revalidate cached data on the post page to reflect new share
    revalidatePath(`/my-posts`);                    // revalidate cached data on my posts page to reflect new share
    return { success: true, share: data.share };    // return success with created share data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ---------- UNSHARE POST Server-Action ----------
export async function unsharePostAction(postId: string) {
  try {
    // API call to unshare a post
    const res = await apiFetch(`${BACKEND_ORIGIN}/shares/posts/${postId}`, { method: "DELETE" } );

    await res.json();                            // parse the response
    revalidatePath("/");                         // revalidate cached data on the home page to reflect unshare
    revalidatePath("/my-posts");                 // revalidate cached data on my posts page after unshare
    revalidatePath(`/posts/${postId}`);          // revalidate cached data on the post page after unshare
    return { success: true };                    // return success 
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}


