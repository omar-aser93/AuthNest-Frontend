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
};

export default nextConfig;
