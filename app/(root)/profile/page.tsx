import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import ProfileForm from "@/components/profile/profileForm";
import VerificationWarningBar from "@/components/profile/verificationWarningBar";
import ChangePasswordForm from "@/components/profile/changePasswordForm";
import DeleteAccountDialog from "@/components/profile/delete-account-dialog";

// Page metadata
export const metadata = {
    title: "Profile - AuthNest",
    description: "Update your profile information.",
};


// Profile Page 
export default async function ProfilePage() {

  const user = await getCurrentUser();    //  Get user profile from authProviderServer (cached server-action)

  return (
    <div className="min-h-screen mx-auto p-3 md:p-6 flex flex-col gap-6">

      {/* Email Verification Warning Bar */}
      {user && !user.isEmailVerified && (<VerificationWarningBar emailVerifyExpiry={user.emailVerifyExpiry} />)}

      {/* Header */}
      <h1 className="text-3xl font-semibold">My Profile</h1>

      <div className="flex flex-col md:flex-row items-stretch gap-6">
        {/* Profile Form component, pass user data for form default values */}
        {user && <ProfileForm user={user} />}

        {/* Password Change */}
        {user?.hasPassword && <ChangePasswordForm userId={user.id} />}
      </div>

      {/* If Oauth account, no password to change */} 
      {user && !user.hasPassword && (
        <div className="w-full p-6 border rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-2">Password</h2>
          <p className="text-sm text-muted-foreground"> This account was created with a social provider. There is no password to change. </p>
        </div>
      )}

      {/* Danger zone — delete account */}
      {user && <DeleteAccountDialog userId={user.id} />}
    </div>
  );
}