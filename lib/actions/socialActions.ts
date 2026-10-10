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
  

// ---------- SEND FRIEND REQUEST Server-Action ----------
export async function sendFriendRequestAction(userId: string) {
  try {
    // API call to send friend request to userId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${userId}/request`, { method: "POST" });

    const data = await res.json();            // parse the response
    revalidatePath(`/user/${userId}`);        // revalidate the user page to reflect new friend request
    revalidatePath("/friends");               // revalidate the friend requests page to reflect new friend request
    return { success: true, friendship: data.friendship };  // return success with created friendship data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- ACCEPT FRIEND REQUEST Server-Action ----------
export async function acceptFriendRequestAction(requestId: string) {
  try {
    // API call to accept friend request by requestId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${requestId}/accept`, { method: "POST" });

    const data = await res.json();                   // parse the response
    revalidatePath(`/user/${data.friendship.requester.id}`);  // revalidate the requester user page to reflect new friend
    revalidatePath("/friends");                               // revalidate the friends page to reflect new friend
    return { success: true, friendship: data.friendship };    // return success with accepted friendship data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- DECLINE FRIEND REQUEST Server-Action ----------
export async function declineFriendRequestAction(requestId: string) {
  try {
    // API call to decline friend request by requestId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${requestId}/decline`, { method: "POST" } );

    const data = await res.json();                 // parse the response
    revalidatePath(`/user/${data.requesterId}`);       // revalidate the requester user page to reflect declined request
    revalidatePath("/friends");                        // revalidate the friends page to reflect declined request
    return { success: true };                          // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- CANCEL FRIEND REQUEST Server-Action ----------
export async function cancelFriendRequestAction(requestId: string) {
  try {
    // API call to cancel sent friend request by requestId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${requestId}/cancel`, { method: "POST" });

    const data = await res.json();                   // parse the response
    revalidatePath(`/user/${data.receiverId}`);          // revalidate the receiver user page to reflect cancelled request
    revalidatePath("/friends");                          // revalidate the friend requests page to reflect cancelled request
    return { success: true };                            // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- REMOVE FRIEND Server-Action ----------
export async function removeFriendAction(userId: string) {
  try {
    // API call to remove friend by userId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${userId}`, { method: "DELETE" });

    await res.json();                      // parse the response
    revalidatePath(`/user/${userId}`);     // revalidate the user page to reflect removed friend
    revalidatePath("/friends");            // revalidate the friends page to reflect removed friend
    return { success: true };              // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}


// ---------- BLOCK USER Server-Action ----------
export async function blockUserAction(targetUserId: string) {
  try {
    // API call to block user by targetUserId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${targetUserId}/block`, { method: "POST" });
    
    const data = await res.json();                  // parse the response
    revalidatePath(`/user/${targetUserId}`);      // revalidate the user page to reflect blocked user
    revalidatePath("/friends");                   // revalidate the friends page to reflect blocked user 
    return { success: true, friendship: data.friendship };   // return success with blocked friendship data
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- UNBLOCK USER Server-Action ----------
export async function unblockUserAction(targetUserId: string) {
  try {
    // API call to unblock user by targetUserId
    const res = await apiFetch(`${BACKEND_ORIGIN}/social/friends/${targetUserId}/unblock`, { method: "POST" });
    
    await res.json();                                  // parse the response
    revalidatePath(`/user/${targetUserId}`);           // revalidate the user page to reflect unblocked user
    revalidatePath("/friends");                        // revalidate the friends page to reflect unblocked user
    return { success: true };                          // return success 
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}



// ---------- REMOVE TAGGED FRIEND/USER Server-Action ----------
export async function removeTagAction(tagId: string) {
  try {
    // API call to remove tag by tagId
    const res = await apiFetch( `${BACKEND_ORIGIN}/social/tags/${tagId}`, { method: "DELETE" } );

    await res.json();                   // parse the response   
    revalidatePath("/posts");           // revalidate the posts page to reflect removed tag
    return { success: true };           // return success
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };  // if it's an ApiError, it already has a user-friendly message, so return that
    return { error: "Unexpected error, please try again" };      // on other errors, return generic error message
  }
}


