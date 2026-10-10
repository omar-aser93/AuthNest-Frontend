import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

// Page metadata
export const metadata = {
  title: "OAuth Status - AuthNest",
  description: "Check the status of your OAuth login.",
};


// An OAuth page, Only shows either "something went wrong" or "check your email" UI when (merging/linking) accounts
export default async function OAuthCallbackPage({ params, searchParams }: { params: Promise<{ provider: string }>; searchParams: Promise<{ pending?: string; error?: string }>;}) {
  
  const { provider } = await params;                    // get [provider] from URL params
  const { pending, error } = await searchParams;        // get URL search params

  // No query params = someone navigated here directly → redirect away
  if (!pending && !error) redirect("/");

  // Case 1: fallback error (if user navigated here directly), We show "something went wrong" UI
  if (error) {
    return (
      <div className="p-6 text-center text-red-500 max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p>OAuth login failed. Please try again.</p>
        <Link href="/login">
          <Button variant="outline" className="mt-4">Back to Login</Button>
        </Link>
      </div>
    );
  }

  // Case 2: Magic link sent → show "check your email" UI
  return (
    <div className="p-6 text-center max-w-md mx-auto space-y-4 mt-20">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-muted-foreground">
        We found an existing account with that email. We&apos;ve sent a link to connect your{" "}
        <span className="capitalize font-medium">{provider}</span> account.
      </p>
      <p className="text-sm text-muted-foreground">The link expires in 15 minutes.</p>
    </div>
  );
}