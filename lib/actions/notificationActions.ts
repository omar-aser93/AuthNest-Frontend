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


// ---------- MARK A NOTIFICATION AS READ Server-Action ----------
export async function markNotificationAsReadAction(notificationId: string) {
  try {
    // API call to mark the notification as read by notificationId
    const res = await apiFetch(`${BACKEND_ORIGIN}/notifications/${notificationId}/read`, { method: "PUT" });

    await res.json();                              // parse the response
    revalidatePath("/notifications");              // revalidate the notifications page to reflect updated notification
    return { success: true };                      // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Server error. Try again later." };   // on other errors, return generic error message
  }
}



// ---------- MARK ALL NOTIFICATIONS AS READ Server-Action----------
export async function markAllNotificationsAsReadAction() {
  try {
    // API call to mark all notifications as read
    const res = await apiFetch( `${BACKEND_ORIGIN}/notifications/read-all`, { method: "PUT" } );

    await res.json();                              // parse the response
    revalidatePath("/notifications");              // revalidate the notifications page to reflect updated notifications
    return { success: true };                      // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Server error. Try again later." };            // on other errors, return generic error message
  }
}



// ---------- DELETE NOTIFICATION Server-Action ----------
export async function deleteNotificationAction(notificationId: string) {
  try {
    // API call to delete the notification by notificationId
    const res = await apiFetch(`${BACKEND_ORIGIN}/notifications/${notificationId}`, { method: "DELETE" } );

    await res.json();                               // parse the response
    revalidatePath("/notifications");               // revalidate the notifications page to reflect deleted notification
    return { success: true };                       // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Server error. Try again later." };            // on other errors, return generic error message
  }
}






