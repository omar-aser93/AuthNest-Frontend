import { getPost } from "@/lib/queries/postQueries";
import PostModal from "@/components/posts/post-modal";

// parallel route page, when user clicks on a post image, it intercepts the route and renders a modal on top of everything
export default async function InterceptedPostPage({ params }: { params: Promise<{ id: string }> }) {
 
  const id = (await params).id;                // get post id from URL params 
  const post = await getPost(id);              // fetch the post by id  

  
  return <PostModal post={post} />;            // render the PostModal component, passing the fetched post as a prop
}