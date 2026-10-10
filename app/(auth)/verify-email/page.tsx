import { verifyEmailAction } from "@/lib/actions/authActions";
import Image from "next/image";
import Link from "next/link";

// Page metadata
export const metadata = {
    title: "Verify Email - AuthNest",
    description: "Verify your email address.",
};


// ---------- VERIFY EMAIL Page ----------
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  
  const { token, email } = await searchParams;              // get token & email from URL search params
  
  // If token or email missing, show error immediately without calling the action
  if (!token || !email) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">Invalid verification link. Please request a new one.</p>
        <Link href="/"><Image src="/auth-illustration.png" alt="Auth Illustration" width={500} height={500} className="drop-shadow-2xl rounded-2xl" /></Link>
      </div>
    );
  }

  const result = await verifyEmailAction(token, email);     // call the verifyEmailAction server-action

  return (
    <div className="p-8 gap-4 flex flex-col items-center justify-center min-h-screen">
      {result.error && (
        <p className="text-red-500">{result.error}</p>
      )}
      {result.success && (
        <p className="text-green-600">
          Email verified successfully! Return to <Link href="/"> Home page</Link>.
        </p>
      )}
      <Link href="/"><Image src="/auth-illustration.png" alt="Auth Illustration" width={500} height={500} className="drop-shadow-2xl rounded-2xl" /></Link>
    </div>
  );
}
