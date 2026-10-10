import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Page metadata
export const metadata = {
  title: "About - AuthNest",
  description: "Learn more about AuthNest, our mission, and our team."
};


// About Page
export default function AboutPage() {
  return (
    <div className="min-h-screen max-w-5xl mx-auto p-6 flex flex-col gap-12">
      
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About AuthNest
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            AuthNest is a modern full-stack authentication and support platform, designed to simplify user management and provide seamless experiences for admins and users alike.
          </p>
          <Button className="bg-primary text-white hover:bg-primary/90"><Link href="/login">Get Started</Link></Button>
        </div>
        <div className="flex-1 relative w-full h-64 md:h-80">
          <Image src="/auth-illustration.png" alt="AuthNest illustration" fill className="object-contain" />
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="p-6 border rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
          <p className="text-muted-foreground">
            Built-in JWT authentication with CSRF protection and password management ensures your app is secure by default.
          </p>
        </div>
        <div className="p-6 border rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">Real-time Support Chat</h3>
          <p className="text-muted-foreground">
            Provide live support with real-time messaging, file uploads, typing indicators, and read/delivery tracking.
          </p>
        </div>
        <div className="p-6 border rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
          <p className="text-muted-foreground">
            Full-featured admin dashboard to manage users, view chats, and moderate content efficiently.
          </p>
        </div>
      </section>

      {/* Team Section */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-center">Meet the Team</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-4">
            <Image src="/default-avatar.png" alt="Omar" width={120} height={120} className="mx-auto rounded-full" />
            <h3 className="text-lg font-semibold mt-4">Omar Mohamed</h3>
            <p className="text-muted-foreground">Full-stack Developer</p>
          </div>
          <div className="p-4">
            <Image src="/default-avatar.png" alt="Jane" width={120} height={120} className="mx-auto rounded-full" />
            <h3 className="text-lg font-semibold mt-4">Jane Doe</h3>
            <p className="text-muted-foreground">UI/UX Designer</p>
          </div>
          <div className="p-4">
            <Image src="/default-avatar.png" alt="John" width={120} height={120} className="mx-auto rounded-full" />
            <h3 className="text-lg font-semibold mt-4">John Smith</h3>
            <p className="text-muted-foreground">Backend Engineer</p>
          </div>
        </div>
      </section>
    </div>
  );
}
