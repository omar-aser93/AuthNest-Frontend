import { getMyPosts } from "@/lib/queries/postQueries";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
import { MyPostsInfiniteScroll } from "@/components/pagination/wrappers";
import { RefreshCcw } from "lucide-react";

// Page metadata
export const metadata = {
  title: "My Posts - AuthNest",
  description: "View and manage your posts on the blog.",
};


//  My Posts Page to display all your posts, we get the cursor from the URL query for (infinite scroll)
export default async function MyPostspage({ searchParams }: { searchParams: Promise<{ cursor?: string; page?: string }> }) {
  
  const cursor = (await searchParams).cursor;       // Get the cursor from the URL query (if any)
  
  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [data, user] = await Promise.all([
    getMyPosts(10, cursor),      // Fetch your posts, pass the limit & cursor
    getCurrentUser()             // Get current user data (auth-provider), we will need to pass it down to postCard component
  ]);
  
  // first, Check for server-action initial response errors (no cursor/page yet) 
  if (!cursor && !(await searchParams).page && data.error) {
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
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
      
      {/* HEADER */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold">Check your Posts</h1>
        <p className="text-gray-600 mt-3">Explore and manage your latest posts </p>
      </header>

      {/* POSTS */}
      <div className="space-y-6">
        {data.posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet.</p>
        ) : (
          // my-posts Infinite wrapper component, we pass (the initialPosts, nextCursor, currentUser and error) as props
          <MyPostsInfiniteScroll
            initialItems={data.posts}
            initialNextCursor={data.nextCursor}
            currentUser={user}
            initialError={cursor ? data.error : undefined}
          />
        )}
      </div>

    </div>
  );
}


// *** WITH NUMBERED PAGINATION only (offset-based pagination)
// import { getMyPosts } from "@/lib/queries/postQueries";
// import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
// import Pagination from "@/components/pagination/pagination";
// import PostCard from "@/components/posts/post-card";
// import { RefreshCcw } from "lucide-react";
// import { PostType } from "@/lib/validator";

// // Page metadata
// export const metadata = {
//   title: "My Posts - AuthNest",
//   description: "View and manage your posts on the blog.",
// };


// // My Posts Page to display all your posts, we get the page from the URL query for (numbered pagination)
// export default async function MyPostsPaginationPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  
//   const page = (await searchParams).page ? parseInt((await searchParams).page!) : 1;   // Get the page from the URL query, default to 1
//   const data = await getMyPosts(10, undefined, page);     // Fetch your posts , pass the limit & page, No cursor
//   const user = await getCurrentUser();                    // Get current user data, Will pass it to postCard component

//   // first, Check for server-action initial response errors 
//   if (page === 1 && data.error) {
//     return (
//       <div className="flex flex-col items-center gap-2 py-20 text-red-600">
//         <p>{data.error}</p>
//         <div className="text-sm text-gray-500 flex items-center gap-2">
//           <RefreshCcw className="w-4 h-4" /> Please refresh the page.
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">

//       {/* HEADER */}
//       <header className="text-center mb-10">
//         <h1 className="text-4xl font-bold">Check your Posts</h1>
//         <p className="text-gray-600 mt-3">Explore and manage your latest posts</p>
//         {/* Pagination info */}
//         {data.totalPages > 0 && (
//           <p className="text-sm text-gray-500 mt-2">
//             Page {data.currentPage} of {data.totalPages} • {data.totalCount || 0} total posts
//           </p>
//         )}
//       </header>

//       <div className="space-y-6">
//         {data.posts.length === 0 ? (
//           <p className="text-center text-gray-500">No posts yet.</p>
//         ) : (
//           <>            
//             {/* Map through the posts, pass the props to PostCard component */}
//             {data.posts.map((post: PostType) => (<PostCard key={post.id} post={post} currentUser={user} />))}
//             {/* The Pagination component */}
//             {data.totalPages > 1 && (
//               <div className="flex justify-center mt-8">
//                 <Pagination page={data.currentPage || 1} totalPages={data.totalPages || 1} urlParamName="page" />
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }



// *** WITH HYBRID PAGINATION (Wrapper component, combines [infinite scroll & numbered pagination])
// import { getMyPosts } from "@/lib/queries/postQueries";
// import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
// import HybridPostsView from "@/components/pagination/hybrid-posts-view";
// import { RefreshCcw } from "lucide-react";

// // Page metadata
// export const metadata = {
//   title: "My Posts - AuthNest",
//   description: "View and manage your posts on the blog.",
// };

// // My Posts Page (Hybrid Pagination)... infinite scroll(mobile) + numbered pagination(desktop)
// export default async function MyPostsPage({ searchParams }: { searchParams: Promise<{ cursor?: string; page?: string; }>;}) {
  
//   const cursor = (await searchParams).cursor;        // Get the cursor from the URL query
//   const page = (await searchParams).page;            // Get the page from the URL query    
//   const pageNumber = page ? parseInt(page) : 1;      // convert page number as integer, default it to 1
//   const limit = 10;                                  // Set limit to 10

//   // initial Fetch of your posts, pass the params (Priority: cursor > page) 
//   const data = await getMyPosts( limit, cursor, cursor ? undefined : pageNumber );
//   const user = await getCurrentUser();          // Get current user data, Will pass it to postCard component

//   // Initial load error 
//   if (!cursor && !page && data.error) {
//     return (
//       <div className="flex flex-col items-center gap-2 py-20 text-red-600">
//         <p>{data.error}</p>
//         <div className="text-sm text-gray-500 flex items-center gap-2">
//           <RefreshCcw className="w-4 h-4" /> Please refresh the page.
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
       
//       {/* HEADER */}
//       <header className="text-center mb-10">
//         <h1 className="text-4xl font-bold">Check your Posts</h1>
//         <p className="text-gray-600 mt-3"> Explore and manage your latest posts </p>
//         {/* Desktop pagination info - hidden on mobile */}
//         {!cursor && data.totalCount && (
//           <p className="text-sm text-gray-500 mt-2 hidden md:block">
//             Page {data.currentPage || 1} of {data.totalPages || 1} • {data.totalCount} total posts
//           </p>
//         )}
//       </header>
      
//       {/* POSTS, Hybrid Pagination Component */}
//       <div className="space-y-6">
//         {data.posts.length === 0 ? (
//           <p className="text-center text-gray-500">No posts yet.</p>
//         ) : (
//           <HybridPostsView posts={data.posts} nextCursor={data.nextCursor} currentPage={data.currentPage} totalPages={data.totalPages} currentUser={user} error={cursor ? data.error : undefined} />
//         )}
//       </div>
//     </div>
//   );
// }



// *** WITH HYBRID PAGINATION (via CSS ONLY (No Wrapper component), PROBLEMS: [While only 1 component is visible, both client components mount], [also URL pollution risk: ?page=2&cursor=abc123])
// import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";
// import { getMyPosts } from "@/lib/queries/postQueries";
// import { MyPostsInfiniteScroll } from "@/components/pagination/wrappers";
// import Pagination from "@/components/pagination/pagination";
// import PostCard from "@/components/posts/post-card";
// import { RefreshCcw } from "lucide-react";
// import { PostType } from "@/lib/validator";

// // Page metadata
// export const metadata = {
//   title: "My Posts - AuthNest",
//   description: "View and manage your posts on the blog.",
// };

// // My Posts Page (Hybrid Pagination)... infinite scroll(mobile) + numbered pagination(desktop)
// export default async function MyPostsPage({ searchParams }: { searchParams: Promise<{ cursor?: string; page?: string }>;}) {
  
//   const { cursor, page } = await searchParams;        // Get the cursor & page from the URL query

//   // Determine pagination inputs
//   const limit = 10;                                   
//   const pageNumber = page ? parseInt(page, 10) : 1;

//   // Fetch your posts, pass the params (Shared between infinite scroll & numbered pagination)
//   const data = await getMyPosts( limit, cursor, cursor ? undefined : pageNumber );
//   const user = await getCurrentUser();          // Get current user data, Will pass it to postCard component

//   // Initial load error 
//   if (!cursor && !page && data.error) {
//     return (
//      <div className="flex flex-col items-center gap-2 py-20 text-red-600">
//        <p>{data.error}</p>
//        <div className="text-sm text-gray-500 flex items-center gap-2">
//          <RefreshCcw className="w-4 h-4" /> Please refresh the page.
//        </div>
//      </div>
//     );
//   }

//   return (
//     <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
       
//       {/* HEADER */}
//       <header className="text-center mb-10">
//         <h1 className="text-4xl font-bold">Check your Posts</h1>
//         <p className="text-gray-600 mt-3"> Explore and manage your latest posts </p>
//         {/* PAGINATION INFO */}
//         {!cursor && data.totalPages > 0 && (
//           <p className="text-sm text-gray-500 mt-2">
//             Page {data.currentPage} of {data.totalPages} •{" "} {data.totalCount || 0} total posts
//           </p>
//         )}
//       </header>
    
//       {data.posts.length === 0 ? (
//         <p className="text-center text-gray-500">No posts yet.</p>
//       ) : (
//         <>
//           {/* 📱 MOBILE — Infinite Scroll */}
//           <div className="block md:hidden">             
//             <MyPostsInfiniteScroll
//               initialItems={data.posts}
//               initialNextCursor={data.nextCursor}
//               currentUser={user}
//               initialError={cursor ? data.error : undefined}
//             />
//           </div>

//           {/* 🖥 DESKTOP — Numbered Pagination */}
//           <div className="hidden md:block space-y-6">
//             {data.posts.map((post: PostType) => (
//               <PostCard key={post.id} post={post} currentUser={user} />
//             ))}

//             {data.totalPages > 1 && (
//               <div className="flex justify-center pt-6">
//                 <Pagination page={data.currentPage || 1} totalPages={data.totalPages || 1} />
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
