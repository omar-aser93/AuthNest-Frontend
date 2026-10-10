"use client";

import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/authActions";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag, LogOut, User } from "lucide-react";


// ProfileButtons component to display login/register or user-profile buttons
export default function ProfileButtons() {
  
  // get current user & isLoading from AuthProviderClient (isLoading is optional, used when There is a flicker that hurts UX, ex: Login/Register buttons flash for a second before the avatar appears)  
  const { user, isLoading } = useAuth();              
  // state to control logout alert dialog (open/close)  
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false); 
    
  // Handle logout function 
  const handleLogout = async () => {    
    await logoutAction();               // logout server action
    window.location.href = "/";         // full reload → clears RSC cache + cookies
  };

  // ✅ Show a skeleton while hydrating — prevents login/register flash when user is getting fetched
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg">
        <Skeleton className="h-11 w-10 rounded-full" />
        <div className="flex-col text-left hidden md:flex gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-38" />
        </div>
      </div>
    );
  }

  // If USER not logged in, show Login/Register buttons
  if (!user) {
    return (
      <div className="flex gap-2 my-4">
        <Link href="/login">
          <Button className="cursor-pointer">Login</Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary" className="cursor-pointer hidden md:block"> Register </Button>
        </Link>
      </div>
    );
  }

  // Get first letter of user's name for AvatarFallback
  const firstLetter = user.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      {/* USER CARD + DROPDOWN */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
            <Avatar className="h-10 w-10">
              {user.image && <AvatarImage src={user.image} alt="User avatar" />}
              {!user.image && <AvatarFallback>{firstLetter}</AvatarFallback>}
            </Avatar>

            <div className="flex-col text-left hidden md:flex">
              <span className="font-medium">{user.name}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuTrigger>

        {/* DROPDOWN CONTENT */}
        <DropdownMenuContent className="w-48">
          {/* Profile Link - Menu Item */}
          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link href="/profile" className="flex items-center gap-2">
              <User size={16} /> Profile
            </Link>
          </DropdownMenuItem> 
          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link href="/reports" className="flex items-center gap-2">
              <Flag size={16} /> My Reports
            </Link>
          </DropdownMenuItem> 

          <DropdownMenuSeparator />             {/* Separator */}

          {/* Logout menu item - it trigger the CONFIRMATION DIALOG */}
          <DropdownMenuItem onClick={() => setLogoutDialogOpen(true)} className="text-red-600 focus:text-red-600 cursor-pointer" >
            <div className="flex items-center gap-2 w-full">
              <LogOut size={16} /> Logout
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          {/* Alert Dialog Text */}
          <AlertDialogHeader>
            <AlertDialogTitle>Logout?</AlertDialogTitle>
            <AlertDialogDescription> Are you sure you want to logout? You will need to login again to continue using your account. </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Alert Dialog Buttons */}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="cursor-pointer bg-red-600 hover:bg-red-700" >
              Logout 
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
