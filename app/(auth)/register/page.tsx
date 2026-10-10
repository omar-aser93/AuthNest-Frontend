import RegisterForm from "@/components/auth/registerForm";

// Page metadata
export const metadata = {
  title: "Register - AuthNest",
  description: "Sign up to access your dashboard and start using the platform.",
};


// Register page
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl: string }> }) {
  const callbackUrl = (await searchParams)?.callbackUrl || "/";   // get callback URL from URL search params
  return (   
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/20">
      <h1 className="text-3xl font-bold text-gray-700 mb-6 text-center">
        Create Account
      </h1>
      <p className="text-gray-600 text-center mb-8">Join AuthNest today</p>
      <RegisterForm callbackUrl={callbackUrl} />      {/* Registration form component, callbackUrl is passed as a prop */}
    </div>
  );
}
