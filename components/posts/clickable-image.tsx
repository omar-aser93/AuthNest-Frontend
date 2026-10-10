// components/posts/clickable-image.tsx
"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ClickableImage component, used in post cards to make the post image trigger the post modal (parallel route) 
export function ClickableImage({ src, alt, postId }: { src: string; alt: string; postId: string }) {
  const router = useRouter();      // next useRouter() hook, used for navigation
  return (
    <div onClick={() => router.push(`/posts/${postId}`)} className="cursor-pointer">
      <Image src={src} alt={alt} width={600} height={400} loading="lazy" className="rounded-lg object-cover w-full mb-4" />
    </div>
  );
}