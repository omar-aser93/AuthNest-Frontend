import CreatePostForm from "@/components/posts/createPostForm";
import { getPost } from "@/lib/queries/postQueries";
import { requireOwnerOrAdmin } from "@/lib/guard";

// Page metadata
export const metadata = {
    title: "Edit Post - AuthNest",
    description: "Edit a post on the blog.",
};


// Edit Post Page
export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;       // Get post id from URL params
  const post = await getPost(id);     // Fetch post by id, used to pre-fill the form on update
  
  // Authrization Utility to redirect to Forbidden page if user is (not the post owner) or (not Admin)
  await requireOwnerOrAdmin(post?.authorId);
  
  return (
    <div className="py-10">
      <h1 className="text-3xl font-semibold mb-6">Edit Post</h1>
      <CreatePostForm post={post} key={post?.id} />    {/* Create/update Post (form component), we pass post as props */}
    </div>
  );
}