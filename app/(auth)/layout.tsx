import Image from "next/image";
import "../globals.css";

// ------------------ (AUTH) ROUTES GROUP LAYOUT ------------------
export default function AuthLayout({ children}: { children: React.ReactNode;}) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-linear-to-br from-indigo-200 via-purple-200 to-pink-200">
      
      {/* Left illustration */}
      <div className="relative hidden lg:flex items-center justify-center p-10">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-br-3xl" />
        <div className="relative w-64 h-64 lg:w-90 lg:h-90">
          <Image src="/auth-illustration.png" alt="Auth Illustration" fill className="object-contain drop-shadow-2xl" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority loading="eager"/>
        </div>
      </div>

      {/* Right form section */}
      <div className="flex items-center justify-center p-4">        
          {children}        
      </div>
    </div>
  );
}
