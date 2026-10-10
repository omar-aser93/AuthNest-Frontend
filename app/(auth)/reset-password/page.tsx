import ResetPasswordForm from "@/components/auth/resetPasswordForm";

// Page metadata
export const metadata = {
  title: "Reset Password - AuthNest",
  description: "Set a new password for your account."
};


// Reset Password page
export default function ResetPasswordPage() {
  return (    
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h1 className="text-2xl text-gray-700 font-bold text-center mb-4">Reset password</h1>
      <p className="text-gray-600 text-center mb-6">Choose a new secure password.</p>
      <ResetPasswordForm />         {/* Reset Password form component */}
    </div>    
  );
}
