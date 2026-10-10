"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getOrCreateDMAction, createGroupAction } from "@/lib/actions/chatActions";
import { searchUsersForMention } from "@/lib/queries/userQueries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Users, X, Check } from "lucide-react";

// Typescript interface for user search results
interface UserResult {
  id: string;
  name: string;
  image: string | null;  
}

// Main component for creating a new conversation (DM or group)
export default function NewConversationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();                            // Next.js router for navigation
  const [isPending, startTransition] = useTransition();  // useTransition for handling pending state during async server-action 
  // states for managing mode, query, search results, selected participants, group name, and searching status
  const [mode, setMode]             = useState<"dm" | "group">("dm");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<UserResult[]>([]);
  const [selected, setSelected]     = useState<UserResult[]>([]);
  const [groupName, setGroupName]   = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // ─── Search users as we type ────────────────────────────────────────────
  const handleSearch = async (value: string) => {
    setQuery(value);                                  // Update query state
    if (!value.trim()) { setResults([]); return; }    // If no query, clear results and return out
    setIsSearching(true);                             // Set is searching state to true while fetching results
    try {
      const data = await searchUsersForMention(value);         // Call search users fetcher function
      setResults(data?.users ?? []);                           // Update results state with fetched users or empty array if none
    } finally {
      setIsSearching(false);                                   // Set is searching state to false
    }
  };

  // ─── Toggle user selection (DM or group) ───────────────────────────────────────────────
  const toggleSelect = (u: UserResult) => {
    if (mode === "dm") {      
      startTransition(async () => {
        const res = await getOrCreateDMAction(u.id);         // Call getOrCreateDM server-action with selected user's ID
        if (res.error) { toast.error(res.error); return; }   // If there's an error, show toast and return out
        router.push(`/messages/${res.conversation.id}`);     // Navigate immediately to the conversation page (DM — only one person at a time)
        onClose();                                           // Close the dialog 
      });
      return;
    }
    // Group — multi-select (set selected users in state)
    setSelected(prev => prev.find(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u] );
  };

  // ─── Create group conversation with selected users ───────────────────────────────────────────────
  const handleCreateGroup = () => {
    // Validation: require group name and at least one participant
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    if (selected.length === 0) { toast.error("Add at least one participant"); return; }
    startTransition(async () => {
      // Call createGroup server-action, if there's an error, show toast, otherwise navigate to the new conversation page and close the dialog
      const res = await createGroupAction(groupName.trim(), selected.map(u => u.id));
      if (res.error) { toast.error(res.error); return; }
      router.push(`/messages/${res.conversation.id}`);
      onClose();
    });
  };

  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        {/* Header */}
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        {/* Mode toggle (DM or group) */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button onClick={() => { setMode("dm"); setSelected([]); }} className={`flex-1 py-1.5 cursor-pointer text-sm rounded-md transition-colors font-medium ${mode === "dm" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`} >
            Direct Message
          </button>
          <button onClick={() => { setMode("group"); setSelected([]); }} className={`flex-1 py-1.5 cursor-pointer text-sm rounded-md transition-colors font-medium ${mode === "group" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`} >
            <Users size={14} className="inline mr-1" /> Group Chat
          </button>
        </div>

        {/* Group name input */}
        {mode === "group" && (<Input placeholder="Group name..." value={groupName} onChange={e => setGroupName(e.target.value)} />)}

        {/* Selected users (group only) */}
        {mode === "group" && selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map(u => (
              <span key={u.id} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                {u.name}
                <button onClick={() => setSelected(prev => prev.filter(s => s.id !== u.id))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search people..." value={query} onChange={e => handleSearch(e.target.value)} />
        </div>

        {/* Results */}
        <div className="max-h-56 overflow-y-auto space-y-1">
          {/* show loading while searching */}
          {isSearching && (<p className="text-sm text-gray-400 text-center py-4">Searching...</p>)}
          {/* show no users found when searching is done & results are empty  */}
          {!isSearching && query && results.length === 0 && (<p className="text-sm text-gray-400 text-center py-4">No users found</p>)}
          {/* map through results and show each user to select from */}
          {results.map(u => {
            const isSelected = selected.some(s => s.id === u.id);
            return (
              <button key={u.id} onClick={() => toggleSelect(u)} disabled={isPending} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left" >
                {u.image ? (
                  <Image src={u.image} alt={u.name} width={36} height={36} className="rounded-full object-cover w-9 h-9 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>                  
                </div>
                {mode === "group" && isSelected && (<Check size={16} className="text-blue-500 shrink-0" />)}
              </button>
            );
          })}
        </div>

        {/* Create group - button */}
        {mode === "group" && (
          <Button onClick={handleCreateGroup} disabled={isPending || selected.length === 0 || !groupName.trim()} className="w-full cursor-pointer" >
            {isPending ? "Creating..." : `Create Group (${selected.length} people)`}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}