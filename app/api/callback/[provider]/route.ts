import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { BACKEND_ORIGIN } from "@/lib/utils";


// OAuth callback - API Route Handler to handle OAuth responses & redirects
// Any time you need to set cookies from a redirect, use api Route Handler... Can't use Server-actions.  
export async function GET( req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {

  const { provider } = await params;            // get [provider] from URL params
  const { searchParams } = req.nextUrl;         // get URL search params
  const code = searchParams.get("code");        // get OAuth 'code' from URL search params '?code='

  // Whitelist provider BEFORE any other logic — provider is used in an inline script below
  if (!["google", "github"].includes(provider)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Validate the OAuth code (redirect)
  if (!code) {
    return sendPopupResponse(req, provider, "error");
  }

  try {
    // Forward code to backend API Endpoint, if success → It will return accessToken and refreshToken
    const res = await fetch(`${BACKEND_ORIGIN}/auth/oauth/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();          // parse response data 

    // Magic link sent (merging/linking accounts) → redirect popup to status page, to show the pending message
    if (res.status === 202) {       
      return NextResponse.redirect(new URL(`/oauth-status/${provider}?pending=true`, req.url));
    }

    // Hard error → show "something went wrong" UI
    if (!res.ok) {
      console.error("OAuth error:", data?.message);
      return sendPopupResponse(req, provider, "error");
    }

    // Success → set (access and refresh tokens) cookies with next/cookies 
    const { accessToken, refreshToken } = data;
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

    // Send success message to parent window then popup will close
    return sendPopupResponse(req, provider, "success");

  } catch (err) {
    console.error("OAuth callback error:", err);        // log the error
    return sendPopupResponse(req, provider, "error");             // show Global error 
  }
}


// Helper: returns an HTML page that posts a message to the parent window then closes
function sendPopupResponse(req: NextRequest, provider: string, status: "success" | "error") {
  // Build the payload with JSON.stringify so nothing user-controlled can break out of the string context.
  // The .replace is belt-and-suspenders — JSON.stringify already escapes quotes but not `</script>`.
  const payload = JSON.stringify({
    type: status === "success" ? "OAUTH_SUCCESS" : "OAUTH_ERROR",
    provider,
  }).replace(/</g, "\\u003c");

  const origin = JSON.stringify(new URL(req.url).origin);
  const html = `
    <html>
      <body>
        <script>
          window.opener?.postMessage(${payload}, ${origin});
          window.close();
        </script>
      </body>
    </html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
