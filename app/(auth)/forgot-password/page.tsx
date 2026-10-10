import ForgotPasswordForm from "@/components/auth/forgotPasswordForm";

// Page metadata
export const metadata = {
  title: "Forgot Password - AuthNest",
  description: "Request a password reset code."
};


// Forgot Password page
export default function ForgotPasswordPage() {
  return (    
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h1 className="text-2xl text-gray-700 font-bold text-center mb-4">Forgot password</h1>
      <p className="text-gray-600 text-center mb-6">Enter your email to receive a reset code.</p>
      <ForgotPasswordForm />            {/* Forgot Password form component */}
    </div>    
  );
}
