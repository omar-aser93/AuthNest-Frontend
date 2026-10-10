/* - proxy.ts works only for authentication (user logged in or not), not for authorization (a user allowed to access a page or not) 
   - this utility is for authorization, it checks if owner-user-Only/Admin-Only allowed to access page.. we implement it in (ownership/role based) pages 
   - [example: edit post] -> without authentication, any logged in user can go to (/posts/123/edit) page, even if he is not the owner or admin */

import { redirect } from "next/navigation";
import { getCurrentUser } from "./authProvider/AuthProviderServer";
import { getConversation } from "./queries/chatQueries";


// function used when access requires a specific single/multiple roles (admin/editor/user...)
export async function requireRole(allowedRoles: Array<"admin" | "user" | "editor">) {
  const user = await getCurrentUser();    // get current user (authProviderServer -> cached server-action)
  if (!user) redirect("/login");          // No user -> Redirect to login
  // if current user role doesn't match the required roles we recieved, we redirect to a '403' forbidden (page we created)
  if (!allowedRoles.includes(user.role)) redirect("/forbidden");  
  return user;           // If role matches (authorized), we return the user
}


// function used when access requires ownership of a resource (current user id === recieved id), example: [post_author & logged user] are the same  
export async function requireOwner(resourceUserId: string) {  
  const user = await getCurrentUser();    // get current user (authProviderServer -> cached server-action)
  if (!user) redirect("/login");          // No user -> Redirect to login
  // if current user id doesn't match the id we recieved, we redirect to a '403' forbidden (page we created)
  if (user.id !== resourceUserId) redirect("/forbidden");  
  return user;            // If owner matches (authorized), we return the user
}


// (Most common) function used when access requires both (ownership or role is Admin) - most real-world apps need this!
export async function requireOwnerOrAdmin(resourceUserId: string) {
  const user = await getCurrentUser();    // get current user (authProviderServer -> cached server-action)
  if (!user) redirect("/login");          // No user -> Redirect to login
  // if current user neither admin nor the owner of the resource, we redirect to a '403' forbidden (page we created)
  if (user.id !== resourceUserId && user.role !== "admin") { redirect("/forbidden"); }
  return user;
}


// function used when access requires being a participant in a chat (current user id === conversation participant id), example: [conversation_participant & logged user] are the same
export async function requireParticipant(conversationId: string) {
  const user = await getCurrentUser();     // get current user (authProviderServer -> cached server-action)
  if (!user) redirect("/login");           // No user -> Redirect to login
  // if current user is not a participant in the conversation, we redirect to '/messages' or '403' forbidden (page we created)
  const { conversation } = await getConversation(conversationId);
  if (!conversation) redirect("/messages");  // or redirect("/forbidden") 
  return { user, conversation };
}
