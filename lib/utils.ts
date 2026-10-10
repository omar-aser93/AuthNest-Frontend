import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Message } from "@/lib/hooks/useChat";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend origin URL, defaults to localhost if not set in env variables 
export const BACKEND_ORIGIN = typeof window === "undefined" ? (process.env.BACKEND_ORIGIN ? `${process.env.BACKEND_ORIGIN}/api/${process.env.API_VERSION ?? "v1"}` : "http://localhost:5000/api/v1") : "/api/v1";
// Frontend origin URL, defaults to localhost if not set in env variables
export const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "http://localhost:3000";

// Google/GitHub OAuth Variables
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
export const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
export const GOOGLE_REDIRECT_URI = `${FRONTEND_ORIGIN}/api/callback/google`;
export const GITHUB_REDIRECT_URI = `${FRONTEND_ORIGIN}/api/callback/github`;


// Utility to extract error message from server action responses
export function getErrorMessage(error: unknown): string {
  // Handle string errors, return the backend message directly
  if (typeof error === 'string') return error;

  // Handle flattened Zod errors
  if (typeof error === 'object' && error !== null && 'fieldErrors' in error) {
    // Cast error to flattened Zod error type
    const flattenedError = error as { formErrors: string[]; fieldErrors: Record<string, string[]>; };
    // if there are any formErrors (general form errors not tied to specific fields), return the first one
    if (flattenedError.formErrors?.length > 0) { return flattenedError.formErrors[0]; }
    // Otherwise, look for the first field error in the fieldErrors object and return it (if exists), or just return a default validation error message
    const firstFieldError = Object.values(flattenedError.fieldErrors || {}).find(errors => errors?.[0]);
    return firstFieldError?.[0] || "Validation failed";
  }

  // Handle arrays — could be strings (legacy) or Zod issue objects (from backend validate middleware)
  if (Array.isArray(error)) {
    const first = error[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'message' in first) {
      return (first as { message: string }).message;
    }
    return "An error occurred";
  }

  if (error instanceof Error) return error.message;                 // Handle Error objects
  return "An unexpected error occurred";                            // Default global fallback
}


// Utility to format time ago
export function formatTimeAgo(date: string | Date) {
  // check the type of date... if it is a string, convert it to a Date object, otherwise use it as is
  const d = typeof date === "string" ? new Date(date) : date;
  // Calculate time difference
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  // Define intervals
  const intervals: Record<string, number> = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  // Loop through intervals
  for (const key in intervals) {
    const value = Math.floor(seconds / intervals[key]);    // Calculate value
    if (value > 1) return `${value} ${key}s ago`;          // Return this formatted string if value is > 1
    if (value === 1) return `1 ${key} ago`;                // Return this formatted string if value is 1
  }

  return "Just now";         // Return "Just now" if no intervals match
}



// ─── Helper: group messages by date (for chat messages list) ───────────────────
export function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  // loop through messages and group them by date label (Today, Yesterday, etc.)
  for (const msg of messages) {
    const label = getDateLabel(new Date(msg.createdAt));
    const last  = groups[groups.length - 1];
    if (last && last.date === label) {
      last.messages.push(msg);
    } else {
      groups.push({ date: label, messages: [msg] });
    }
  }
  return groups;
}

// Gets date label for grouping messages (Today, Yesterday, etc.), used in the helper above
function getDateLabel(date: Date): string {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff  = Math.round((today.getTime() - d.getTime()) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diff > 365 ? "numeric" : undefined });
}




