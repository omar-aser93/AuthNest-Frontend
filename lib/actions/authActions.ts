"use server";

import { registerSchema, loginSchema, RegisterType, LoginType, forgotPasswordSchema, ForgotPasswordType, resetPasswordSchema, ResetPasswordType, otpSchema, OtpType } from "@/lib/validator";
import { cookies } from "next/headers";
import { BACKEND_ORIGIN } from "../utils";
import z from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";

// -----------------------------------------------------------------------------
// SERVER ACTIONS – Mutations only (POST, PUT, DELETE) + (Auth GETs) as exception - safe to call from both Server and Client Components
// -----------------------------------------------------------------------------
/* - We use (apiFetch) utility for [POST, PUT, DELETE, (protected/optional-auth) GET], Because we set CSRF in the backend + we also included httpOnly cookies/headers in this wrapper utility,
   - We can also use normal fetch() if we want, But we'll have to set headers/cookies manually, Note: don't set headers for (formData at img/file upload) -> not a JSON body
   - Also, If it's [Public GET (no auth cookies) & (no headers) & (no body => no csrf protection )], we can just use normal fetch(). */
  
  
// ---------- REGISTER Server-Action ----------
export async function registerAction(formData: RegisterType) {
  // 1. validate data with Zod
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }  

  // 2. extract data and send it (without confirmPassword) to backend (API call)    
  const { name, email, password } = parsed.data;   
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/auth/signup`, { method: "POST", body: JSON.stringify({ name, email, password }) });
    const data = await res.json();         // parse the response

    // 3. get the tokens, and set them in next.js cookies()
    const { accessToken, refreshToken } = data;
    // set accessToken as HttpOnly cookie via Next.js cookies() 
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,      // 15 minutes
    });
    // set refreshToken as HttpOnly cookie via Next.js cookies() 
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60     // 7 days
    });
    // indicate success to the client & pass callbackUrl to redirect to it or home
    return { success: true, callbackUrl: formData.callbackUrl || "/" }; 
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- LOGIN Server-Action ----------
export async function loginAction(formData: LoginType) {
  // 1. validate data with Zod
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }

  // 2. send the data to backend (API call)  
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/auth/login`, { method: "POST", body: JSON.stringify(parsed.data) });
    const data = await res.json();        // parse the response

    // 3. get the tokens, and set them in next.js cookies()
    const { accessToken, refreshToken } = data;
    // set accessToken as HttpOnly cookie via Next.js cookies() 
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,      // 15 minutes
    });
    // set refreshToken as HttpOnly cookie via Next.js cookies() 
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: parsed.data.remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60     // 7 or 30 days
    });
    // indicate success to the client & pass callbackUrl to redirect to it or home
    return { success: true, callbackUrl: formData.callbackUrl || "/" };          
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- LOGOUT Server-Action ----------
export async function logoutAction() {
  try {
    // Call logout API endpoint — backend will clear the DB stored refreshToken and clear cookie
    await apiFetch(`${BACKEND_ORIGIN}/auth/logout`, { method: "POST" });
  } catch {
    // Swallow — backend unreachable or token already invalid, we still want to clear the cookies on the client side, so we don't block logout for the user.
  }

  // Always runs & deletes the cookies, regardless of backend success or failure
  const cookieStore = await cookies();
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  // csrfToken intentionally left — reused for the next session 

  return { success: true };         // indicate success to the client
}



// ---------- VERIFY EMAIL Server-Action ----------
export async function verifyEmailAction(token: string, email: string) {
  try {
    // send the token & email as query params, Using plain fetch() —> public GET, no auth cookies, no CSRF, no body.
    const res = await fetch(`${BACKEND_ORIGIN}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
    const data = await res.json();       // parse the response    
    if (!res.ok) return { error: data?.message || "Invalid verification link" };  // if request failed, return error message
    return { success: true };            // indicate success to the client
  } catch {
    return { error: "Unexpected error, please try again" };      // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- RESEND VERIFICATION EMAIL Server-Action ----------
export async function resendVerificationAction() {
  try {
    // API call to resend verification email 
    await apiFetch(`${BACKEND_ORIGIN}/auth/resend-verification`, { method: "POST" });
    revalidatePath("/profile");       // revalidate profile page to reflect updated email verification status
    return { success: true };         // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- FORGOT PASSWORD Server-Action ----------
export async function forgotPasswordAction(formData: ForgotPasswordType) {
  // 1. validate data with Zod
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }

  // 2. send the data to backend (API call)
  try {
    await apiFetch(`${BACKEND_ORIGIN}/auth/forgot-password`, { method: "POST", body: JSON.stringify(parsed.data) });
    return { success: true };      // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ------------VERIFY OTP Server-Action ----------
export async function verifyOtpAction(formData: OtpType) {
  // 1. validate data with Zod
  const parsed = otpSchema.safeParse(formData);
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }
  
  // 2. send the data to backend (API call)  
  try {
    const res = await apiFetch(`${BACKEND_ORIGIN}/auth/verify-otp`, { method: "POST", body: JSON.stringify(parsed.data) });
    const data = await res.json();                           // parse the response
    return { success: true, resetToken: data.resetToken };   // indicate success & respond with resetToken 
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- RESET PASSWORD Server-Action ----------
export async function resetPasswordAction(formData: ResetPasswordType) {
  // 1. validate data with Zod
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) { return { error: z.flattenError(parsed.error) }; }

  // 2. extract data and send it (without confirmPassword) to backend (API call)    
  const { email, newPassword, resetToken } = parsed.data as ResetPasswordType;
  try {
    await apiFetch(`${BACKEND_ORIGIN}/auth/reset-password`, { method: "POST", body: JSON.stringify({ email, newPassword, resetToken }) });
    return { success: true };      // indicate success to the client
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };    // if it's an ApiError, it already has a user-friendly message we can show, so return that
    return { error: "Unexpected error, please try again" };        // return a generic error message for other types of errors (network issues, unexpected errors, etc.) 
  }
}



// ---------- LOAD CSRF TOKEN Server-Action ----------
// It's a GET request, But we kept it as server-action 'lib/actions' instaed of 'lib/queries' because it'll be used in 'Client Component' 
export async function loadCsrf(): Promise<string | null> {
  // 1. Get CSRF token from Next.js cookie store
  const cookieStore = await cookies();
  const csrf = cookieStore.get("csrfToken")?.value;
  if (csrf) return csrf;   // already exists from login/refresh — just return it

  // 2. No CSRF cookie yet (user arrived without logging in on this device/browser)
  // Then Fetch from backend and store in Next.js cookie store, using plain fetch() —> public GET, no auth needed for the CSRF endpoint.
  const res = await fetch(`${BACKEND_ORIGIN}/auth/csrf-token`, { method: "GET", cache: "no-store"});
  const data = await res.json();
  if (!data.csrfToken) return null;      // if backend didn't return a CSRF token, return null (something went wrong)

  // ✅ Store it in Next.js cookie store (this is what was missing before)
  cookieStore.set("csrfToken", data.csrfToken, {
    httpOnly: false,                                              // must be readable by JS for double-submit pattern
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,                                  // 30 days to match refresh token
  });

  return data.csrfToken;              // return the token
}
