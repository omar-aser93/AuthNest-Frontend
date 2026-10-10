import "../globals.css";
import Navbar from "@/components/navbars/navbar";
import Sidebar from "@/components/navbars/sidebar";
import GoToTopButton from "@/components/goToTopButton";

// ------------------ (ROOT) ROUTES GROUP LAYOUT, takes (children & modal -> parallel route slot) ------------------
export default function RootPagesLayout({ children, modal}: { children: React.ReactNode; modal: React.ReactNode }) {
  return (       
    <div className="min-h-screen w-full flex flex-col">
      <Navbar />            {/* Navbar at the top */}           
      <div className="flex w-full">        
        <Sidebar />                                               {/* Desktop Sidebar */}        
        <main className="flex-1 p-1 md:p-4">{children}</main>     {/* Pages content */}
      </div>
      <GoToTopButton />     {/* Go to top button */}
      {modal}               {/* post-image modal renders on top of everything */}
    </div>  
  );
}
