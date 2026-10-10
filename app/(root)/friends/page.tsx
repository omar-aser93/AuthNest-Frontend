import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import FriendsList from "@/components/friends/FriendsList";
import FriendRequests from "@/components/friends/FriendRequests";
import SuggestionsList from "@/components/friends/SuggestionsLis";
import BlockedUsersList from "@/components/friends/BlockedUsersList";
import { UserCardSkeletonList } from "@/components/skeletons/UserCardSkeleton";
import { Suspense } from "react";

// Page metadata
export const metadata = {
    title: "Friends - AuthNest",
    description: "View and manage your friends on AuthNest.",
};


// Friends Page, featuring tabs for My Friends, Friend Requests, and Suggestions. (we get search params to pass to the components)
export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string; cursor?: string }> }) {
 
  // Extract query parameters for tab selection, request type, and pagination cursor
  const { tab = "friends", type = "received", cursor } = await searchParams;

  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>
      <Tabs value={tab} className="w-full">

        {/* Tab triggers for navigating between different friend-related sections & changing the URL query based on the selected tab */}
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="friends" asChild>
            <Link href="/friends?tab=friends">My Friends</Link>
          </TabsTrigger>
          <TabsTrigger value="requests" asChild>
            <Link href="/friends?tab=requests&type=received">Requests</Link>
          </TabsTrigger>
          <TabsTrigger value="suggestions" asChild>
            <Link href="/friends?tab=suggestions">Suggestions</Link>
          </TabsTrigger>
          <TabsTrigger value="blocked" asChild>
            <Link href="/friends?tab=blocked">Blocked</Link>
          </TabsTrigger>
        </TabsList>

        {/* Friends List component (wrapped in a Suspense fallback), we pass the cursor as a prop for the infinite scroll  */}
        <TabsContent value="friends">
          <Suspense fallback={<UserCardSkeletonList count={5} />}>
            <FriendsList cursor={cursor}/>
          </Suspense>
        </TabsContent> 
         
        {/* Friends Requests component (received/sent), we pass the cursor & type as a prop for the infinite scroll */}
        <TabsContent value="requests">
          <Suspense fallback={<UserCardSkeletonList count={3} />}>
            <div className="space-y-4">
              <div className="flex gap-2 border-b">
                <Link href="/friends?tab=requests&type=received" className={`px-4 py-2 ${type === 'received' ? 'border-b-2 border-blue-500 font-medium' : ''}`} >
                  Received
                </Link>
                <Link href="/friends?tab=requests&type=sent" className={`px-4 py-2 ${type === 'sent' ? 'border-b-2 border-blue-500 font-medium' : ''}`} >
                  Sent
                </Link>
              </div>
              {type === 'received' ? (<FriendRequests type="received" cursor={cursor} />) : (<FriendRequests type="sent" cursor={cursor} />)}
            </div>
          </Suspense>
        </TabsContent>

        {/* Suggestions List component (wrapped in a Suspense fallback) */}      
        <TabsContent value="suggestions">
          <Suspense fallback={<UserCardSkeletonList count={5} />}>
            <SuggestionsList />
          </Suspense>
        </TabsContent> 

        {/* Blocked Users List component (wrapped in a Suspense fallback), we pass the cursor as a prop for the infinite scroll  */}
        <TabsContent value="blocked">
          <Suspense fallback={<UserCardSkeletonList count={5} />}>
            <BlockedUsersList cursor={cursor} />
          </Suspense>
        </TabsContent> 
      </Tabs>
    </div>
  );
}