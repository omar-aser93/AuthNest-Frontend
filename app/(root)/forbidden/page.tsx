import Image from "next/image";

// page metadata
export const metadata = {
    title: "Forbidden 403 - AuthNest",
    description: "You are not allowed to access this page.",
}


// Access Denied page
export default function Page403() {
return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="text-center">
        <Image src="/403.png" alt="403" width={500} height={500} />
        <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>
        <p className="text-xl">You are not allowed to access this page.</p>        
      </div>
    </div>
  );
}
