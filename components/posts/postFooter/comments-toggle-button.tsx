"use client";
import { MessageCircle } from "lucide-react";
import { Button } from "../../ui/button";

// Button to toggle comments visibility, shows comment count and changes style when open
export default function CommentsToggleButton({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void; }) {
  return (
    <Button type="button" variant="ghost" onClick={onToggle} className={`flex items-center cursor-pointer gap-1 ${ open ? "text-blue-600" : "text-gray-600" }`} >
      <MessageCircle className="w-4 h-4" />
      {count}
    </Button>
  );
}
