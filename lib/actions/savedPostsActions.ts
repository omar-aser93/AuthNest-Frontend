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
  

// ----------- SAVE POST server-action ----------------
export async function savePostAction(postId: string) {
  try {
    // Call savePost API endpoint, receives postId
    const res = await apiFetch(`${BACKEND_ORIGIN}/saved-posts/${postId}`, { method: "POST" });

    await res.json();                                  // parse the response
    revalidatePath("/saved-posts");                    // revalidate saved-posts page cache after saving
    return { success: true };                          // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ------------ REMOVE SAVED POST server-action ---------------
export async function removeSavedPostAction(postId: string) {
  try {
    // Call removeSavedPost API endpoint, receives postId
    const res = await apiFetch(`${BACKEND_ORIGIN}/saved-posts/${postId}`, { method: "DELETE" });

    await res.json();                                  // parse the response
    revalidatePath("/saved-posts");                    // revalidate saved-posts page cache after removing
    return { success: true };                          // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}




// ------------ TOGGLE SAVED POST (bookmark on / bookmark off) server-action -----------
export async function toggleSavedPostAction(postId: string) {
  try {
    // Call toggleSavedPost API endpoint, receives postId
    const res = await apiFetch(`${BACKEND_ORIGIN}/saved-posts/${postId}/toggle`, { method: "POST" });

    const data = await res.json();                  // parse the response
    revalidatePath("/saved-posts");                 // revalidate saved-posts page cache
    return { success: data.saved };                 // returns true or false
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}   

