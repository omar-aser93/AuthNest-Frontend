import { getPost } from "@/lib/queries/postQueries";
import PostCard from "@/components/posts/post-card";
import { getCurrentUser } from "@/lib/authProvider/AuthProviderServer";

// Page Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;             // get post id from URL params
    const post = await getPost(id);           // fetch post by id 
    return {
      title: `${post.title || "Post"} - AuthNest`,
      description: post.content.slice(0, 120),
      openGraph: { title: `${post.title || "Post"} - AuthNest`, description: post.content.slice(0, 120), images: [post.image || "/Image-brand.png"], type: "article", authers: [post.author?.name || "Anonymous"], publishedTime: post.createdAt },
      twitter: { title: `${post.title || "Post"} - AuthNest`, description: post.content.slice(0, 120), images: [post.image || "/Image-brand.png"], card: "summary_large_image" },
    }
  } catch {
    return {
      title: "Single Post - AuthNest",
      description: "View a single post on the blog.",    
   }
  }
}


// Single Post Page
export default async function SinglePostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;                // get post id from URL params
  
  // promise all to fetch both in parallel (start both at same time instead of waiting one after another), Better performance.
  const [currentUser, post] = await Promise.all([
    getCurrentUser(),   // get current user (authProviderServer -> cached server-action)
    getPost(id)         // fetch post by id 
  ]);

  // Handle null post (not found or error)
  if (!post) {
    return (
      <div className="py-10 text-center text-gray-500">
        Post not found or has been deleted.
      </div>
    );
  }
  
  return (
    <div className="py-4 max-w-full mx-0 md:py-10 md:max-w-4xl md:mx-auto space-y-6">
      <h1 className="text-3xl font-semibold mb-6">Post: </h1>
      <PostCard post={post} currentUser={currentUser} />     {/* Post Card component, pass post as props */}
    </div>
  );
}