import Image from "next/image";
import Link from "next/link";

// page metadata
export const metadata = {
    title: "404 Not Found - AuthNest",
    description: "The page you are looking for does not exist.",
}


// 404 Not Found Page Component
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-6 overflow-hidden">
      <Link href="/" >
        <Image src="/404.png" alt="404" width={500} height={750} className="cursor-pointer hover:opacity-90 " />
      </Link>
    </div>
  );
}
