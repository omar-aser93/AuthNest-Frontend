import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Route Handler (merge/link accounts), It receives the magic link redirect from backend, set cookies & redirect home
// Any time you need to set cookies from a redirect, use api Route Handler... Can't use Server-actions.
export async function GET(req: NextRequest) {

  const { searchParams } = req.nextUrl;                     // get URL search params
  const accessToken = searchParams.get("accessToken");      // get OAuth 'accessToken' from URL search params '?accessToken='
  const refreshToken = searchParams.get("refreshToken");    // get OAuth 'refreshToken' from URL search params '?refreshToken='

  // If tokens missing → invalid link, redirect to login
  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL("/login?error=link_failed", req.url));
  }

  // Success → set (access and refresh tokens) cookies with next/cookies
  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
  const cookieStore = await cookies();
  cookieStore.set("accessToken", accessToken, { ...cookieOpts, maxAge: 15 * 60 });
  cookieStore.set("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 });

  return NextResponse.redirect(new URL("/", req.url));    // redirect to home
}