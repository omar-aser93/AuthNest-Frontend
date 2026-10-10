import { useState, useRef, useEffect } from "react";
import { searchUsersForMention } from "@/lib/queries/userQueries";

// Typescript Types for MentionUser
type MentionUser = {
  id: string;
  name: string;
  image?: string;
}

// Custom hook to handle user mentions & tagging in posts & comments
export function useMentions() {
  // State to hold mention search results, and state to hold tagged user IDs/names list  
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);  // ref for debouncing mention search input
  const requestIdRef = useRef(0);        // prevents race conditions (outdated responses) in async mention search
  
  // Function to handle mention search input, with debouncing
  const handleMentionSearch = (value: string) => {    
    if (debounceRef.current) clearTimeout(debounceRef.current);  // clear previous debounce timer

    // Extract the word starting with @ , e.g. "Hello @jo" → search "jo", if no match, clear results & return
    const match = value.match(/@([\p{L}0-9_]+)$/u);
    if (!match) { setMentionResults([]); return; }  

    const currentRequestId = ++requestIdRef.current;        // increment request ID

    // Start a new debounce timer for the mention search API call
    debounceRef.current = setTimeout(async () => {
      const res = await searchUsersForMention(match[1]);       // Call search users fetcher function     
      if (currentRequestId !== requestIdRef.current) return;   // if res is outdated (not the latest request), ignore it
      setMentionResults(res?.users?.length ? res.users : []);  // set mention results to state or clear it if no users found
    }, 300);   // 300ms debounce delay
  };

  // Cleanup function to clear the debounce timer on component unmount
  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }}, []);

  // Function to insert a plain @name mention into the content (post/comment/...) and store the user object in the state for backend processing
  const insertMention = ( user: MentionUser, currentValue: string, setValue: (val: string) => void ) => {
    // Replace the last mention with the new mention (e.g. "Hello @jo" → "Hello @john ") 
    const newValue = currentValue.replace(/@([\p{L}0-9_]+)$/u, `@${user.name} `); 
    setValue(newValue);        // update the content with the new mention
    // Add the user object to the taggedUsers state
    setTaggedUsers((prev) => prev.some((u) => u.id === user.id) ? prev : [...prev, { id: user.id, name: user.name }] ); 
    setMentionResults([]);     // clear mention results after inserting a mention
  };

  // Function to reset mentions (e.g. after successful post/comment submission)
  const resetMentions = () => {
    setTaggedUsers([]);
    setMentionResults([]);
  };

  // Return the mention-related state and functions for use in components
  return { mentionResults, taggedUsers, setTaggedUsers, handleMentionSearch, insertMention, resetMentions };
}
