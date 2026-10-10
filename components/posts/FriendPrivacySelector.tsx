"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ChevronsUpDown, X, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getMyFriends } from "@/lib/queries/socialQueries";
import Image from "next/image";
import { Input } from "../ui/input";

// Typescript types & interfaces
type Friend = { id: string; name: string; image?: string };
interface Props {
  allowedIds: string[];
  blockedIds: string[];
  setAllowedIds: (ids: string[]) => void;
  setBlockedIds: (ids: string[]) => void;
  mode?: "custom" | "block-only";
}


// Component for (friends privacy allow/block) selector with infinite scroll and search
// mode prop can be used to switch between "CUSTOM" (allow + block) and "block-only" used with (PUBLIC & FRIENDS) privacies.
export default function FriendPrivacySelector({ allowedIds, blockedIds, setAllowedIds, setBlockedIds, mode = "custom" }: Props) {
  
  // ------------------ States & Refs ------------------
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef(debouncedSearch);
  const cursorRef = useRef(nextCursor);
  const requestIdRef = useRef(0);

  // useInView from react-intersection-observer, Sentinel for infinite scroll [trigger]
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "250px" });

  // Update cursor ref when nextCursor changes
  useEffect(() => { cursorRef.current = nextCursor; }, [nextCursor]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      searchRef.current = search;
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);


  // ------------- Load friends function --------------- 
  const loadFriends = useCallback(async (cursor?: string, reset = false) => {
    const currentRequestId = ++requestIdRef.current;   // Increment request ID
    const currentSearch = searchRef.current;           // Use latest search term from ref
    setLoading(true);                                  // Start loading
    setError(null);                                    // clear previous errors

    try {
      // call the get friends fetch function, passing limit, cursor (for infinite scroll) & search
      const res = await getMyFriends(20, cursor, currentSearch || undefined);
      if (currentRequestId !== requestIdRef.current) return;   // discard outdated requests
      // Handle response: if error, set error state; if success, append or reset friends list and update next cursor
      if (res.error) {
        setError(res.error);
        if (reset) setFriends([]);
      } else if (res.friends) {
        setFriends((prev) => (reset ? res.friends : [...prev, ...res.friends]));
        setNextCursor(res.nextCursor);
      }
    } catch {
      if (currentRequestId === requestIdRef.current) {
        setError("Failed to load friends");
        if (reset) setFriends([]);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setInitialLoaded(true);
      }
    }
  }, []);


  // Reset when popover opens or debounced search changes
  useEffect(() => {
    if (!open) return;
    requestIdRef.current++;
    setFriends([]);
    setNextCursor(null);
    setInitialLoaded(false);
    setError(null);
    loadFriends(undefined, true);
  }, [open, debouncedSearch, loadFriends]);

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && nextCursor && !loading && !error && initialLoaded) { loadFriends(nextCursor); }
  }, [inView, nextCursor, loading, error, initialLoaded, loadFriends]);


  // Toggle functions for allow/block status of friends
  const toggleAllowed = (id: string) => {
    if (allowedIds.includes(id)) {
      setAllowedIds(allowedIds.filter((i) => i !== id));
    } else {
      setAllowedIds([...allowedIds, id]);
      if (blockedIds.includes(id)) setBlockedIds(blockedIds.filter((i) => i !== id));
    }
  };
  const toggleBlocked = (id: string) => {
    if (blockedIds.includes(id)) {
      setBlockedIds(blockedIds.filter((i) => i !== id));
    } else {
      setBlockedIds([...blockedIds, id]);
     // In block‑only mode, `allowedIds` is irrelevant but we keep for custom mode
      if (mode !== "block-only" && allowedIds.includes(id)) setAllowedIds(allowedIds.filter((i) => i !== id));
    }
  };

  // Get the list of friends that are either allowed or blocked to show as badges (for "block‑only": only blocked users are shown)
  const selectedFriends = (mode === "block-only")
    ? friends.filter(f => blockedIds.includes(f.id))
    : friends.filter(f => allowedIds.includes(f.id) || blockedIds.includes(f.id));

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      {/* Badges for selected friends (with allow/block status) */}
      <div className="flex flex-wrap gap-2">
        {selectedFriends.map((f) => (
          <Badge key={f.id} variant={allowedIds.includes(f.id) ? "default" : "destructive"} className="gap-1" >
            {f.name} {allowedIds.includes(f.id) ? "(allow)" : "(block)"}
            <button onClick={() => allowedIds.includes(f.id) ? toggleAllowed(f.id) : toggleBlocked(f.id) } >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedFriends.length === 0 && ( 
          <span className="text-sm text-muted-foreground">
            {mode === "block-only" ? "Select any users you want to block/unblock" : "Select any users you want to allow/disallow"}
          </span> 
        )}
      </div>

      {/* Popover to select friends */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedFriends.length ? `${selectedFriends.length} user(s) selected` : "Select users..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[300px] p-0">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search friends..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {/* If not loaded yet, show Loading indicator */}
            {!initialLoaded && !error && ( <div className="flex justify-center py-4"> <Loader2 className="animate-spin h-5 w-5" /> </div> )}
            {/* If loaded but error, show error message */}
            {initialLoaded && error && (<p className="text-sm text-center text-red-500 py-4">{error}</p> )}
            {/* If loaded but no friends, show no friends message */}
            {initialLoaded && !error && friends.length === 0 && (<p className="text-sm text-center text-muted-foreground py-4"> No friends found </p>)}
            {/* If loaded and no error, show friends list */}
            {initialLoaded && !error &&
              friends.map((f) => {
                const allowed = allowedIds.includes(f.id);
                const blocked = blockedIds.includes(f.id);
                return (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted" >
                    {/* Friend info (avatar + name) */}
                    <div className="flex items-center gap-2">
                      <Image src={f.image || "/default-avatar.png"} alt={f.name} width={32} height={32} className="rounded-full object-cover" />
                      <span className="text-sm font-medium">{f.name}</span>
                    </div>
                    {/* allow/block buttons */}
                    <div className="flex gap-2">
                      {mode !== "block-only" && (
                        <Button size="sm" variant={allowed ? "default" : "outline"} className="h-7 px-2" onClick={() => toggleAllowed(f.id)}>
                          {allowed ? <Check className="h-3 w-3" /> : "Allow"}
                        </Button>
                      )}
                      <Button size="sm" variant={blocked ? "destructive" : "outline"} className="h-7 px-2" onClick={() => toggleBlocked(f.id)}>
                        {blocked ? <X className="h-3 w-3" /> : "Block"}
                      </Button>
                    </div>
                  </div>
                );
              })}

            {/* End of list message */}
            {!nextCursor && friends.length > 0 && !loading && (
              <div className="text-center text-xs text-muted-foreground py-2">
                You’ve reached the end
              </div>
            )}  

            {/* Infinite scroll sentinel + loader */}  
            {nextCursor && (
              <div ref={ref} className="flex justify-center py-2">
                {loading && <Loader2 className="animate-spin h-5 w-5" />}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}