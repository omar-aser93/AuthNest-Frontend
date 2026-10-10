import Link from "next/link";

// Helper function to render text with (mentions @[name](id) / hashtags #word) as clickable links
export function renderWithTags(text: string) {

  if (!text) return text;                              // Handle empty or undefined text

  // Regular expression to match both (mentions & hashtags)
  const combinedRegex = /(@\[([^\]]+)\]\(([^)]+)\))|#([\p{L}\p{N}_]+)/gu;

  const parts = [];                     // Array to store the rendered parts
  let lastIndex = 0;                    // Index of the last processed character
  let match: RegExpExecArray | null;    // Match object

  // Loop through all tags in the text
  while ((match = combinedRegex.exec(text)) !== null) {
    const fullMatch = match[0];             // Get the full matched string (either mention or hashtag)
    const matchIndex = match.index;         // Get the index of the match in the original text
    // Add any text before the match as a normal string
    if (matchIndex > lastIndex) {  parts.push(text.slice(lastIndex, matchIndex)); }

    // Check if it's a mention or a hashtag and create the appropriate Link component
    if (match[1]) {
      // Mention: @[name](id)
      const name = match[2];
      const userId = match[3];
      // Add the mention as a Link component
      parts.push(
        <Link key={`mention-${userId}-${matchIndex}`} href={`/user/${userId}`} className="text-blue-600 font-medium hover:underline">
          @{name}{' '}
        </Link>
      );
    } else if (match[4]) {
      // Hashtag: #tag
      const tag = match[4];
      // Add the hashtag as a Link component
      parts.push(
        <Link key={`hashtag-${tag}-${matchIndex}`} href={`/hashtags/${encodeURIComponent(tag.toLowerCase())}`} className="text-indigo-600 font-medium hover:underline">
          #{tag}
        </Link>
      );
    }

    lastIndex = matchIndex + fullMatch.length;        // Update lastIndex to the end of the current match
  }

  // Add any remaining text after the last match as a normal string
  if (lastIndex < text.length) {  parts.push(text.slice(lastIndex)); }

  return parts;                                     // Return the array of rendered parts
}  
 

// Helper function for (textarea) to convert rendered mention format back to plain text for editing (e.g. "Hello @[John Doe](123)" → "Hello @John Doe")
// We originaly pass id within the mention format to keep track of tagged user IDs (multiple users with same name, IDs are different)
export function formatMentionsForEditing(text: string) {
  return text?.replace(/@\[(.*?)\]\((.*?)\)/g, "@$1");
}


// Function to Extract both name and id from @[name](id) – returns array of objects
export function extractMentionDetails(text: string): { id: string; name: string }[] {
  const regex = /@\[(.*?)\]\((.*?)\)/g;                 // Regular expression to match mentions
  const details: { id: string; name: string }[] = [];   // Array to store the extracted details
  let match: RegExpExecArray | null;                    // Match object
  // loop through the values and push them to the details array
  while ((match = regex.exec(text)) !== null) { details.push({ name: match[1], id: match[2] }); }
  return details;          // return the updated details array
}


// Helper to convert plain @name mentions back to @[name](id) using stored objects for the backend
export function formatMentionsForStorage(content: string, taggedUsers: { id: string; name: string }[]): string {
  let result = content;
  for (const { id, name } of taggedUsers) {
    const cleanName = name.trim();               // remove accidental leading/trailing spaces
    // Escape special regex chars in name
    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace every occurrence of @name (with word boundary) in the content
    const regex = new RegExp(`@${escapedName}\\b`, 'giu');
    result = result.replace(regex, `@[${cleanName}](${id})`);
  }
  return result;       // return the updated result
}
