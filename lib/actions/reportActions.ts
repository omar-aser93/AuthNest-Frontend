"use server";

import { BACKEND_ORIGIN } from "../utils";
import { reportSchema, ReportInputType } from "../validator";
import { apiFetch, ApiError } from "../api";
import z from "zod";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) + (Auth GETs) as exception - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional-auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */
  

// ---------- CREATE REPORT Server-Action ----------
export async function createReportAction(input: ReportInputType) {
  // 1. validate
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: z.flattenError(parsed.error) };

  // 2. send to backend (strip empty description to keep payload clean)
  const payload = { ...parsed.data, description: parsed.data.description || undefined };
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/reports`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();                       // parse the response
    return { success: true, report: data.report };       // respond with success and the report
  } catch (err) {
    // 409 (already reported) and 429 (rate limit) arrive as ApiError with backend-provided message — pass through unchanged for the toast.
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Unexpected error, please try again" };
  }
}   