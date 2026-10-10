import type { NextConfig } from "next";

const nextConfig: NextConfig = {   
   images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",   // GitHub avatars
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",       // Google profile pictures
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",              // Cloudinary uploaded images
      },
      { 
        protocol: "https", 
        hostname: "**.klipy.com"                     // Klipy CDN for GIFs
      },
      // UploadThing domains (Not used in this project, uncomment it if using UploadThing for file uploads)
      // { protocol: 'https', hostname: 'utfs.io', port: '' },           // upload-thing lib setup 
      // { protocol: 'https', hostname: '**.ufs.sh', port: '' },         // ✅ allow all UploadThing new subdomains    
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // PROXY: forward /api/v1/* from the browser to the real backend.
  // The browser never sees the backend URL — everything looks same-origin.
  // - Server-side apiFetch calls (server actions, proxy.ts) still hit
  //   BACKEND_ORIGIN directly; they don't go through this rewrite.
  // - BACKEND_ORIGIN is read from env at build time. On Vercel, set it in
  //   Project → Settings → Environment Variables (no NEXT_PUBLIC_ prefix).
  // ───────────────────────────────────────────────────────────────────────────
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
