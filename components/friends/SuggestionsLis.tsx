import { getFriendSuggestions } from "@/lib/queries/socialQueries";
import FriendCard from "@/components/friends/FriendCard";
import { RefreshCcw } from "lucide-react";

// SuggestionsList component to show friend suggestions, no pagination needed as it's a small list
export default async function SuggestionsList() {

  // Fetch friend suggestions, pass the limit
  const data = await getFriendSuggestions(20);
  // If there's an error, show an error message
  if (data.error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{data.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Map over the friends suggestions and pass them to the FriendCard component */}
      {data.suggestions.map((suggestion: { id: string; name: string; image: string; bio: string; mutualFriendsCount: number;}) => (
        <FriendCard key={suggestion.id} user={suggestion} initialStatus={{ status: null }} mutualCount={suggestion.mutualFriendsCount} />
      ))}
    </div>
  );
}