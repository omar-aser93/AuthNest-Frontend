"use server";

import { BACKEND_ORIGIN } from "../utils";
import z from "zod";
import { createPostSchema } from "@/lib/validator";
import { apiFetch, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */


// ---------- CREATE POST Server-Action ----------
export async function createPostAction(formData: FormData) {
  // 1. validate data with Zod, because of img upload, we extract (title, content, ...) as formData instead of passing JSON directly
  const parsed = createPostSchema.safeParse(
    { title: formData.get("title"), content: formData.get("content"), privacy: formData.get("privacy"), taggedUsers: formData.getAll("taggedUsers[]"), allowed: formData.getAll("allowed[]"), blocked: formData.getAll("blocked[]") }
  );
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }

  // 2. send the data to backend (API call) - no (JSON.stringify), because we are sending (img) FormData, not JSON object
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts`, { method: "POST", body: formData });
    const data = await res.json();        // parse the response
    
    revalidatePath(`/posts/${data.id}`); // revalidate the new post page to reflect the new post data
    revalidatePath("/my-posts");         // revalidate cached data on my posts page after creating new post
    revalidatePath("/");                 // revalidate cached data on home page to reflect the new post in the feed
    
    return { success: true };            // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- UPDATE POST Server-Action ----------
export async function updatePostAction(formData: FormData, postId: string) {
  // 1. validate data with Zod, because of img upload, we extract (title, content, ...) as formData instead of passing JSON directly
  const parsed = createPostSchema.safeParse(
    { title: formData.get("title"), content: formData.get("content"), privacy: formData.get("privacy"), taggedUsers: formData.getAll("taggedUsers[]"), allowed: formData.getAll("allowed[]"), blocked: formData.getAll("blocked[]") }
  );
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }

  // 2. send the data to backend (API call) - no (JSON.stringify), because we are sending (img) FormData, not JSON object 
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/${postId}`, { method: "PUT", body: formData });
    const data = await res.json();        // parse the response
    
    revalidatePath(`/posts/${data.id}`); // revalidate the updated post page to reflect the updated post data
    revalidatePath("/my-posts");         // revalidate cached data on my posts page after updating the post
    revalidatePath("/");                 // revalidate cached data on home page to reflect the updated post in the feed

    return { success: true };        // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)  
  }
}



// ---------- DELETE POST Server-Action ----------
export async function deletePostAction(postId: string) {
  // 1. send the data to backend (API call)  
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/posts/${postId}`, { method: "DELETE" });  
    await res.json();                    // parse the response
    
    revalidatePath(`/posts/${postId}`);  // revalidate cached data on the post page after deleting the post
    revalidatePath("/my-posts");         // revalidate cached data on my posts page after deleting the post
    revalidatePath("/");                 // revalidate cached data on home page after deleting the post in case it's in the feed         

    return { success: true };        // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)  
  }
}

