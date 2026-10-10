import Image from "next/image";
import Link from "next/link";
import ProfileButtons from "./profile-buttons";
import MobileSidebar from "./mobileSidebar";
import NotificationBell from "../notifications/NotificationBell";
import SearchInput from "../search/search-input";

// ------------------ NAVBAR COMPONENT ------------------
export default function Navbar() {
  
  return (
    <nav className="w-full flex items-center justify-between p-2 md:px-4 md:p-2 border-b bg-white gap-2 md:gap-8">   
      {/* Mobile Sidebar Button + Logo */}
      <div className="flex items-center gap-2">
        <MobileSidebar /> 
        <Link href="/">
          {/* Desktop logo (visible from md and up) */}
          <Image src="/auth-illustration.png" alt="Logo" width={130} height={43} className="hidden md:block"/>
          {/* Mobile logo (visible below md) */}
          <Image src="/auth-illustration-mobile.png" alt="Logo" width={80} height={20} className="block md:hidden" />
        </Link>
      </div>  

      <SearchInput />  {/* Search input component */}

      {/* Notifications + Profile Buttons */}   
      <div className="flex items-center gap-1"> 
        <NotificationBell />  
        <ProfileButtons />     
      </div> 
    </nav>
  );
}


