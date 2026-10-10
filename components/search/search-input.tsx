"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

const MIN_SEARCH_LENGTH = 2;         // Variable for Minimum characters required to trigger search, to avoid unnecessary searches for very short queries

export default function SearchInput() {
  
  const router = useRouter();                   // Next.js router for navigation (client-side)
  const pathname = usePathname();               // Get current pathname to determine if we are on the search page (client-side)
  const [query, setQuery] = useState("");       // State for search query
  const [isOpen, setIsOpen] = useState(false);  // State for mobile search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);   // Ref to store debounce timer ID
  const inputRef = useRef<HTMLInputElement>(null);   // Ref to the search input element

  // Focus input when mobile search opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }    
  }, [isOpen]);

  // Function to handle search input, with debouncing
  const handleSearch = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);   // Clear existing debounce timer if it exists
    // Set a new debounce timer to delay the search action until the user stops typing for 300ms
    debounceTimer.current = setTimeout(() => {
      const trimmed = value.trim();                 // Trim whitespace from the search query
      // If the trimmed query meets the minimum length requirement, navigate to the search page with the query as a URL parameter.
      if (trimmed.length >= MIN_SEARCH_LENGTH) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      } else if (pathname === "/search") {
        router.push("/search");   // clear search
      }
    }, 300);
  }, [router, pathname]);

  // Cleanup debounce timer when the component unmounts
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);      
    };
  }, []);

  // Handle input change event, update the query state and trigger the search handler
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  // Close mobile search button handler
  const closeSearch = () => {
    if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
    setIsOpen(false);
    setQuery("");
  };

  // Close search when escape key is pressed
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeSearch(); }
    };
    document.addEventListener("keydown", handleKeyDown);    // Add event listener
    return () => { document.removeEventListener("keydown", handleKeyDown); };   // Cleanup
  }, [isOpen]);


  return (
    <div className="relative flex items-center md:w-80">

      {/* 🔍 Mobile Search Icon */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        aria-expanded={isOpen}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* 🖥️ Desktop Search Input */}
      <div className="relative hidden w-full md:block">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          type="search"
          placeholder="Search posts, people, hashtags..."
          value={query}
          onChange={onChange}
          className="w-full pl-9"
        />
      </div>

      {/* 📱 Mobile Expanded Search */}
      {isOpen && (
        <div className="absolute left-[-130px] top-1/2 z-50 flex w-[calc(100vw-16px)] -translate-y-1/2 items-center gap-1 rounded-lg bg-white p-1 shadow-lg md:hidden">
            
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              ref={inputRef}
              type="search"
              placeholder="Search..."
              value={query}
              onChange={onChange}
              className="w-full pl-9"
            />
          </div>

          {/* Close button */}
          <Button variant="ghost" size="icon" onClick={closeSearch} aria-label="Close search" >
            <X className="h-5 w-5" />
          </Button>

        </div>
      )}

    </div>
  );
}