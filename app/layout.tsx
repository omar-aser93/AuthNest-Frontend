import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@livekit/components-styles";
import { Toaster } from "@/components/ui/sonner";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import { CsrfProvider } from "@/components/csrfProvider";
import ProviderWrapper from "@/lib/authProvider/providerWrapper";
import { SocketProvider } from "@/lib/socket/socketProvider";
import { UnreadCountProvider } from "@/lib/socket/UnreadCountContext";
import { NotificationCountProvider } from "@/lib/socket/notificationCountContext";
import "./globals.css";

// Import Geist fonts
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"]});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"]});

// Metadata for the app
export const metadata: Metadata = {
  title: "Auth Nest App",
  description: "Starter Kit for next.js with separate backend auth system",
};

// Root Layout component, wrapping the entire app as it receives {children}
export default function RootLayout({ children }: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >        
        <CsrfProvider />                {/* CSRF Provider component to provide CSRF token when the app intialize */}
        <ProviderWrapper>               {/* AuthProvider Wrapper to provide Auth Context to Client components */}    
          <SocketProvider>              {/* SocketProvider Wrapper to provide Socket Context to Client components */}
            <UnreadCountProvider>       {/* UnreadCountProvider wrapper to provide Global chat badge across all pages */}
            <NotificationCountProvider> {/* NotificationCountProvider wrapper to provide Global notifications count badge across all pages */}
              <IncomingCallModal />     {/* Global Incoming Call Modal, listens to socket (LIVEKIT) events and shows up on incoming calls */}
              {children}
            </NotificationCountProvider> 
            </UnreadCountProvider>
          </SocketProvider>
        </ProviderWrapper>  
        <Toaster richColors closeButton />    {/* Shadcn Sonner Toaster for notifications */}     
      </body>
    </html>
  );
}
