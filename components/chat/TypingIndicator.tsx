
// Component that Displays "User is typing..." indicator based on typingUsers set and participant info
export default function TypingIndicator({ typingUsers, participants, currentUserId }: 
  {typingUsers: Set<string>; participants: { userId: string; user: { id: string; name: string; image: string | null } }[]; currentUserId: string}) {

  // Filter out current user from typing display
  const typingIds = [...typingUsers].filter(id => id !== currentUserId);
  if (typingIds.length === 0) return null;

  // Resolve names from participant list
  const names = typingIds.map(id => participants.find(p => p.userId === id)?.user.name).filter(Boolean) as string[];

  // Format display text — max 2 names then "and X others"
  let text = "";
  if (names.length === 1) text = `${names[0]} is typing`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`;
  else text = `${names[0]}, ${names[1]} and ${names.length - 2} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 shrink-0">
      {/* Animated dots */}
      <div className="flex gap-0.5 items-end h-4">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
      {/* Display the text value we constructed above */}
      <span className="text-xs text-gray-400 italic">{text}</span>
    </div>
  );
}