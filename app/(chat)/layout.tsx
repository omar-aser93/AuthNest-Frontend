import "../globals.css";
import Navbar from "@/components/navbars/navbar";

// ------------ (CHAT) ROUTES GROUP LAYOUT — full height, no (root) sidebar, no page padding ----------
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (     
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />                                        {/* Navbar at the top */}
      <div className="flex flex-1 overflow-hidden">
        {children}                                      {/* Pages content */}
      </div>
    </div>    
  );
}