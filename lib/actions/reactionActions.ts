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
  

// ---------- REACT TO POST Server-Action ----------
export async function reactToPostAction(postId: string, type: string) {
  try {
    // API call to react to a post with given type
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/posts/${postId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });

    const data = await res.json();                       // parse the response    
    revalidatePath(`/posts/${postId}`);                  // revalidate the post page to reflect new reaction
    revalidatePath("/");                                 // revalidate the home page to reflect new reaction
    return { success: true, reaction: data.reaction };   // return success with created reaction data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ---------- REMOVE REACTION FROM POST Server-Action ----------
export async function removePostReactionAction(postId: string) {
  try {
    // API call to remove reaction from a post
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/posts/${postId}/reactions`, { method: "DELETE" });

    await res.json();                                // parse the response
    revalidatePath(`/posts/${postId}`);              // revalidate the post page to reflect removed reaction
    revalidatePath("/");                             // revalidate the home page to reflect removed reaction
    return { success: true };                        // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ---------- REACT TO COMMENT Server-Action ----------
export async function reactToCommentAction( commentId: string, type: string ) {
  try {
    // API call to react to a comment with given type
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/comments/${commentId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });

    const data = await res.json();                       // parse the response
    revalidatePath("/");                                 // revalidate the home page to reflect new reaction
    return { success: true, reaction: data.reaction };   // return success with created reaction data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}
 


// ---------- REMOVE COMMENT REACTION Server-Action ----------
export async function removeCommentReactionAction(commentId: string) {
  try {
    // API call to remove reaction from a comment
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/comments/${commentId}/reactions`, { method: "DELETE" });

    await res.json();                              // parse the response
    revalidatePath("/");                           // revalidate the home page to reflect removed reaction
    return { success: true };                      // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- REACT TO MESSAGE Server-Action ----------
export async function reactToMessageAction(messageId: string, type: string) {
  try {
    // API call to react to a message with given type
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });

    const data = await res.json();                     // parse the response

    // No revalidatePath — socket broadcasts message_reaction_updated to all clients in real time

    return { success: true, reaction: data.reaction, summary: data.summary };  // return success with created reaction + updated summary
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ---------- REMOVE MESSAGE REACTION Server-Action ----------
export async function removeMessageReactionAction(messageId: string) {
  try {
    // API call to remove reaction from a message
    const res = await apiFetch(`${BACKEND_ORIGIN}/reactions/messages/${messageId}/reactions`, { method: "DELETE" });
     
    const data = await res.json();                   // parse the response
    
    // No revalidatePath — socket broadcasts message_reaction_updated to all clients in real time

    return { success: true, summary: data.summary };      // return success + updated summary of reactions 
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}