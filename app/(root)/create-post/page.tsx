import CreatePostForm from "@/components/posts/createPostForm";

// Page metadata
export const metadata = {
    title: "Create Post - AuthNest",
    description: "Create a new post on the blog.",
};


// Create Post Page
export default function CreatePostPage() {
  return (
    <div className="py-10">
      <h1 className="text-3xl font-semibold mb-6">Create Post</h1>
      <CreatePostForm />            {/* Create/update Post - form component */}
    </div>
  );
}