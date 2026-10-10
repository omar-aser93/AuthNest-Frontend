import { getUserById } from "@/lib/queries/userQueries";
import { getPostsByUserId } from "@/lib/queries/postQueries";
import { UserPostsInfiniteScroll } from "@/components/pagination/wrappers";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import { getFriendshipStatus } from "@/lib/queries/socialQueries";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { RefreshCcw } from "lucide-react";
import FriendActionButton from "@/components/friends/FriendActionButton";
import MessageButton from "@/components/chat/MessageButton";
import UserReportButton from "@/components/reports/userReportButton";

// Page Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = (await params).id;                // get user id from URL params
    const user = await getUserById(userId);          // fetch user data by ID
    return {
      title: `${user.name} - AuthNest`,
      description: `User Page for ${user.name} on AuthNest.`,
      openGraph: { title: `${user.name} - AuthNest`, description: `User Page for ${user.name} on AuthNest.`, images: [user.image || "/Image-brand.png"], type: "profile", authors: [user.name], publishedTime: user.createdAt },
      twitter: { title: `${user.name} - AuthNest`, description: `User Page for ${user.name} on AuthNest.`, images: [user.image || "/Image-brand.png"], card: "summary_large_image" },
    };
  } catch {
    return {
      title: "User Page - AuthNest",
      description: "View a user's profile on AuthNest.",
    };
  }
}


// Single User Page, to display user details and their posts, we get (id) from URL params and (cursor) from the URL query for (infinite scroll)
export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ cursor?: string }> }) {
  
  const userId = (await params).id;               // get user id from URL params
  const cursor = (await searchParams).cursor;     // Get the cursor from the URL query (if any)

  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [user, currentUser] = await Promise.all([
    getUserById(userId),               // fetch user data by ID  
    getCurrentUser(),                  // get current user (authProviderServer -> cached server-action)
  ]);
 
  if (!user) notFound();                          // If no user found, return 404 page   
  // if the page user is the current logged-in user, redirect to (/my-posts) page instead.
  if (user.id === currentUser?.id) redirect("/my-posts"); 

  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [friendshipStatus, posts] = await Promise.all([
    getFriendshipStatus(userId),             // fetch initial friendship status for the FriendActionButton
    getPostsByUserId(userId, 10, cursor),    // fetch posts by user ID, with a limit 10
  ]) 
 
  // Check for server-action initial response errors (no cursor yet) 
  if (!cursor && posts.error) {
    return ( 
      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
        <p>{posts.error}</p>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">

      {/* HEADER */}     
      <header className="relative overflow-hidden rounded-xl border bg-white shadow-sm">        
        <div className="h-32 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />       
        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-16 mb-4">
            <Image src={user.image || "/default-avatar.png"} alt={user.name} width={128} height={128} className="h-32 w-32 rounded-full border-4 border-white object-cover" />
          </div>
          {/* Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{user.name}</h1>              
              {user.bio && (<p className="mt-1 text-gray-600 max-w-xl"> {user.bio} </p>)}
              <p className="mt-2 text-sm text-gray-500"> Member since {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long"})} </p>
            </div>            
            {/* Message (chat) Button + Friend Request Button */}
            <div className="flex items-center gap-2">
              <MessageButton targetUserId={userId} />
              <FriendActionButton targetUserId={userId} initialStatus={friendshipStatus} />
              <UserReportButton userId={userId} />
            </div>
          </div>
        </div>
      </header>              

      {/* USER POSTS */}
      <div className="space-y-6">
        {posts.posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet.</p>
        ) : (
          // user-posts Infinite wrapper component, we pass (the initialPosts, initialNextCursor, fetchMore, ...) as props
          <UserPostsInfiniteScroll
            userId={userId}
            initialItems={posts.posts}
            initialNextCursor={posts.nextCursor}
            currentUser={currentUser}
            initialError={cursor ? posts.error : undefined}
          />
        )}
      </div>
      
    </div>    
  );
}