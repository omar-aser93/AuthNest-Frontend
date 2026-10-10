"use server";

import { BACKEND_ORIGIN } from "../utils";
import { apiFetch, ApiError } from "../api";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */
  

// ------------ Get or create a 1-on-1 DM with a target user -------------
export async function getOrCreateDMAction(targetUserId: string) {
  try {
    // API call to get or create a DM with the target user
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/dm`, {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });

    const data = await res.json();                // parse the JSON response            
    return { conversation: data.conversation, created: data.created };  // return the conversation & whether it was created or already existed
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ----------- Create a new group conversation -------------
export async function createGroupAction(name: string, participantIds: string[]) {
  try {
    // API call to create a new group conversation with the specified name and participant IDs
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/group`, {
      method: "POST",
      body: JSON.stringify({ name, participantIds }),
    });

    const data = await res.json();                 // parse the JSON response
    return { conversation: data.conversation };    // return the created conversation
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ------------ Rename a group conversation -----------------
export async function updateGroupAction(id: string, name: string) {
  try {
    // API call to rename a group conversation
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });

    const data = await res.json();                    // parse the response
    return { conversation: data.conversation };       // return the updated conversation
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ------------- Add participants to a group --------------
export async function addParticipantsAction(id: string, userIds: string[]) {
  try {
    // API call to add participants to a group conversation by conversation id & array of user ids to add
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}/participants`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    });

    const data = await res.json();                   // parse the response
    return { conversation: data.conversation };      // return the updated conversation with new participants included
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// -------------- Leave a group (omit targetUserId to leave yourself) ------------
export async function leaveGroupAction(id: string) {
  try {
    // API call to leave a group conversation by conversation id 
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}/participants`, { method: "DELETE" });
    await res.json();                                // parse the response 
    return { success: true };                        // return success true if left successfully
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ----------- Remove another participant from a group (admin only) -------------
export async function removeParticipantAction(id: string, targetUserId: string) {
  try {
    // API call to remove a participant from a group conversation by conversation id & target user id
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}/participants`, {
      method: "DELETE",
      body: JSON.stringify({ targetUserId }),
    });

    await res.json();                               // parse the response
    return { success: true };                       // return success true if removed successfully
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ----------- Send a GIF to a conversation ------------
export async function sendGifAction(conversationId: string, payload: {url: string;}) {
  try {
    // API call to send a GIF
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${conversationId}/gif`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await res.json();                  // parse the response
    return { success: true };          // return success true if sent successfully
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ----------- Delete a conversation [1-on-1 DM] - (soft delete for current user) ------------
export async function deleteConversationAction(id: string) {
  try {
    // API call to delete a conversation
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/conversations/${id}`, { method: "DELETE" });
    await res.json();                               // parse the response
    return { success: true };                       // return success true if deleted successfully
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ------------ Hard delete a message — removes record + Cloudinary files (should be used by admin only) ---------
// The Soft delete (setting content to null), is handled by socket in useChat.softDeleteMessage()
export async function hardDeleteMessageAction(messageId: string) {
  try {
    // API call to hard delete a message by message id
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/messages/${messageId}`, { method: "DELETE" });
    
    await res.json();                                // parse the response 
    return { success: true };                        // return success true if deleted successfully
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}
 


// ---------- Generate a call token for LiveKit video/audio calls (server-action) -----------
export async function getCallTokenAction(conversationId: string) {
  try {
    // API call to generate a call token for LiveKit by conversation id
    const res = await apiFetch(`${BACKEND_ORIGIN}/chat/token`, {
      method: "POST",
      body: JSON.stringify({ conversationId }),
    });

    const data = await res.json();                  // parse the response
    return { token: data.token, url: data.url };    // return the token and LiveKit server URL if successful
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



