import LoginForm from "@/components/auth/loginForm";

// Page metadata
export const metadata = {
  title: "Login - AuthNest",
  description: "Access the website and manage your account by logging in.",
};


// Login page 
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl: string }> }) {
  const callbackUrl = (await searchParams)?.callbackUrl || "/";   // get callback URL from URL search params
  return (    
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/20">
      <h1 className="text-3xl font-bold text-gray-700 mb-6 text-center">
        Welcome Back
      </h1>
      <p className="text-gray-600 text-center mb-8">Sign in to continue</p>
      <LoginForm callbackUrl={callbackUrl} />        {/* Login form component, callbackUrl is passed as a prop */}
    </div>    
  );
}
