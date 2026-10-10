"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./ui/button";

// Go to top button component
export default function GoToTopButton() {
  const [visible, setVisible] = useState(false);     // State to control button visibility
  // Effect to check scroll position
  useEffect(() => {
    const onScroll = () => { 
      const shouldShow = window.scrollY > window.innerHeight * 1.5;
      setVisible((prev) => (prev !== shouldShow ? shouldShow : prev));
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);     // Clean up on unmount
  }, []);

  return (
    <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Go to top"
            className={`hidden cursor-pointer md:flex fixed bottom-6 right-6 z-50 p-3 rounded-full bg-black text-white shadow-lg transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}
