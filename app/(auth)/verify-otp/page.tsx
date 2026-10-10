import VerifyOTPForm from "@/components/auth/verifyOTPForm";

// Page metadata
export const metadata = {
  title: "Verify OTP - AuthNest",
  description: "Enter the OTP sent to your email."
};


// Verify OTP page
export default function VerifyOtpPage() {
  return (    
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h1 className="text-2xl text-gray-700 font-bold text-center mb-4">Verify code</h1>
      <p className="text-gray-600 text-center mb-6">Enter the 6-digit code sent to your email.</p>
      <VerifyOTPForm />           {/* Verify OTP form component */}
    </div>    
  );
}
