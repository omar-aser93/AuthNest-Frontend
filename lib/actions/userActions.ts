"use server";

import { BACKEND_ORIGIN } from "../utils";
import { updateProfileSchema, changePasswordSchema, ChangePasswordType } from "../validator";
import z from "zod";
import { apiFetch, ApiError } from "../api";
import { revalidatePath } from "next/cache";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */
  

// ---------- UPDATE PROFILE Server-Action ----------
export async function updateProfileAction(formData: FormData, userId: string) {
  try {
    // Validate form data using Zod schema, because of img upload, we extract (name, bio, ...) as formData instead of passing JSON directly.
    const parsed = updateProfileSchema.safeParse({ name: formData.get("name"), bio: formData.get("bio") });
    if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }
    
    // Call update profile API endpoint
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/${userId}`, {
      method: "PUT",              // method 'PUT' for updating
      body: formData,             // no (JSON.stringify), because we are sending (img) FormData, not JSON object
    });

    const data = await res.json();                 // parse the response
    revalidatePath("/profile");                    // revalidate profile page cache after profile update
    return { success: true, user: data };          // return success with updated user data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}



// ---------- CHANGE PASSWORD Server-Action ----------
export async function changePasswordAction(formData: ChangePasswordType, userId: string) {
 try {
    // Validate form data using Zod schema, if invalid return error
    const parsed = changePasswordSchema.safeParse(formData);
    if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }
    
    // Call change password API endpoint
    const res = await apiFetch(`${BACKEND_ORIGIN}/users/${userId}/change-password`, { method: "POST", body: JSON.stringify(parsed.data) });

    await res.json();                                // parse the response
    return { success: true };                        // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  } 
}  



// ---------- DELETE MY ACCOUNT Server-Action ----------
export async function deleteMyAccountAction(userId: string) {
  try {
    await apiFetch(`${BACKEND_ORIGIN}/users/${userId}`, { method: "DELETE" });  // Call delete my account API endpoint
    return { success: true };             // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.)
  }
}