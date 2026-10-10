"use server";

import { BACKEND_ORIGIN } from "../utils";
import { apiFetch, ApiError } from "../api";
import { revalidatePath } from "next/cache";
import { commentSchema } from "@/lib/validator";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */


// ---------- CREATE COMMENT Server-Action ----------
export async function createCommentAction(postId: string, content: string, parentId?: string, taggedUsers?: string[]) {
  try {
    // 1. validate comment data with zod (commentSchema)
    const parsed = commentSchema.safeParse({ content, parentId, taggedUsers });
    if (!parsed.success) return { error: "Invalid comment data" };

    // 2. API call to create a new comment for the postId
    const res = await apiFetch(`${BACKEND_ORIGIN}/comments/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId, taggedUsers }),
    });

    const data = await res.json();                     // parse the response
    revalidatePath(`/posts/${postId}`);                // revalidate the post page to reflect new comment
    revalidatePath("/");                               // revalidate the home page to reflect new comment
    return { success: true, comment: data };           // return success with created comment data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- UPDATE COMMENT Server-Action ----------
export async function updateCommentAction(commentId: string, content: string, taggedUsers?: string[]) {
  try {
    // 1. validate comment data with zod
    const parsed = commentSchema.safeParse({ content, taggedUsers });
    if (!parsed.success) return { error: "Invalid comment data" };

    // 2. API call to update the comment by commentId
    const res = await apiFetch(`${BACKEND_ORIGIN}/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ content, taggedUsers }),
    });

    const data = await res.json();                  // parse the response
    revalidatePath(`/posts/${data.postId}`);        // revalidate the post page to reflect updated comment
    revalidatePath("/");                            // revalidate the home page to reflect updated comment
    return { success: true, comment: data };        // return success with updated comment data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- DELETE COMMENT Server-Action ----------
export async function deleteCommentAction(commentId: string) {
  try {
    // API call to delete the comment by commentId
    const res = await apiFetch(`${BACKEND_ORIGIN}/comments/${commentId}`, { method: "DELETE" });

    const data = await res.json();                 // parse the response
    revalidatePath(`/posts/${data.postId}`);       // revalidate the post page to reflect deleted comment
    revalidatePath("/");                           // revalidate the home page to reflect deleted comment
    return { success: true };                      // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}