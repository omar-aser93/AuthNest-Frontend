"use client";

import { getAllPosts, getMyPosts, getPostsByUserId, getPostsByHashtag } from "@/lib/queries/postQueries";
import { getMyFriends, getBlockedUsers, getFriendRequests } from "@/lib/queries/socialQueries";
import { getMySavedPosts } from "@/lib/queries/savedPostsQueries";
import { searchUsers } from "@/lib/queries/userQueries";
import PostCard from "@/components/posts/post-card";
import FriendCard from "@/components/friends/FriendCard";
import InfiniteScroll from "./InfiniteScroll";
import { PostType } from "@/lib/validator";
import Image from "next/image";
import Link from "next/link";

// TypeScript type for Friend item 
type FriendItem = {
  id: string;
  name: string;
  image?: string;
  bio?: string;
  initialStatus: { status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED" | null; friendshipId?: string; direction?: "sent" | "received"; };
  mutualFriendsCount?: number;
};


/* Wrapper client-components used to pass the fetchMore function to the InfiniteScroll component, also used to format the data for the global scroll componant.
   - page.tsx are server-componets, so we can't pass the fetchMore function directly to the InfiniteScroll clienrt-component, so we use these wrappers (optional solution: use server-actions for fetching instead) */

// ---------- Home (infinite scroll) wrapper ----------
export function HomeInfinitePosts({ currentUser, showSavedAt = false, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string }; showSavedAt?: boolean }) {
  const fetchMore = async (cursor: string) => {
    const result = await getAllPosts(undefined, 10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="You've seen all posts! 🎉" renderItem={(post) => (<PostCard key={post.id} post={post} currentUser={currentUser} showSavedAt={showSavedAt} /> )} />  
}


// ---------- My Posts (infinite scroll) wrapper ----------
export function MyPostsInfiniteScroll({ currentUser, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getMyPosts(10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="You've seen all your posts! 🎉" renderItem={(post) => <PostCard key={post.id} post={post} currentUser={currentUser} />} />;
}


// ---------- Other Users Posts (infinite scroll) wrapper ----------
export function UserPostsInfiniteScroll({ userId, currentUser, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { userId: string; currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getPostsByUserId(userId, 10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="No more posts from this user." renderItem={(post) => <PostCard key={post.id} post={post} currentUser={currentUser} />} />;
}


// ---------- Hashtag Posts (infinite scroll) wrapper ----------
export function HashtagPostsInfiniteScroll({ tag, currentUser, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { tag: string; currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getPostsByHashtag(tag, 10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage={`No more posts with #${tag}`} renderItem={(post) => <PostCard key={post.id} post={post} currentUser={currentUser} />} />;
}


// ---------- Search Posts (infinite scroll) wrapper ----------
export function SearchPostsInfiniteScroll({ query, currentUser, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { query: string; currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getAllPosts(query, 10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage={`No more posts for "${query}"`} renderItem={(post) => <PostCard key={post.id} post={post} currentUser={currentUser} />} />;
}


// ---------- Saved Posts (infinite scroll) wrapper ----------
export function SavedPostsInfiniteScroll({ currentUser, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<PostType>>, "fetchMore" | "renderItem"> & { currentUser: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getMySavedPosts(10, cursor);
    return { items: result.posts, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="You've seen all saved posts! 🎉" renderItem={(post) => <PostCard key={post.id} post={post} currentUser={currentUser} showSavedAt={true} />} />
}


// ---------- Friends List (infinite scroll) wrapper ----------
export function FriendsInfiniteScroll({ ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<FriendItem>>, "fetchMore" | "renderItem"> & { currentUser?: { id: string; role: string; savedPosts?: { postId: string }[]; name: string; image?: string } }) {
  const fetchMore = async (cursor: string) => {
    const result = await getMyFriends(20, cursor);
    // Transform raw friends to include initial-Status
    const items = (result.friends || []).map((friend: { id: string; friendshipId?: string }) => ({
      ...friend,
      initialStatus: friend.friendshipId ? { status: "ACCEPTED", friendshipId: friend.friendshipId } : null,
    }));
    return { items, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="You've seen all your friends! 🎉" renderItem={(item) => <FriendCard key={item.id} user={item} initialStatus={item.initialStatus} />} />
}


// ---------- Blocked Users (infinite scroll) wrapper ----------
export function BlockedUsersInfiniteScroll({ ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<FriendItem>>, "fetchMore" | "renderItem">) {
  const fetchMore = async (cursor: string) => {
    const result = await getBlockedUsers(20, cursor);
    const items = (result.users || []).map((user: { id: string; friendshipId?: string }) => ({
      ...user,
      initialStatus: { status: "BLOCKED", friendshipId: user.friendshipId },
    }));
    return { items, nextCursor: result.nextCursor, error: result.error };
  };
  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage="No more blocked users." renderItem={(item) => <FriendCard key={item.id} user={item} initialStatus={item.initialStatus} />} />  
}


// ---------- Friend Requests (sent or received) infinite-scroll wrapper ----------
export function FriendRequestsInfiniteScroll({ type, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<FriendItem>>, "fetchMore" | "renderItem"> & { type: "received" | "sent" }) {
  const fetchMore = async (cursor: string) => {
    const result = await getFriendRequests(type, 20, cursor);
    const items = (result.requests || []).map((req: { id: string; requester: { id: string; name: string; image: string; bio: string; }; receiver: { id: string; name: string; image: string; bio: string; }}) => {
      const user = type === "received" ? req.requester : req.receiver;
      return {
        ...user,
        initialStatus: { status: "PENDING", friendshipId: req.id, direction: type },
      };
    });
    return { items, nextCursor: result.nextCursor, error: result.error };
  };

  return <InfiniteScroll {...props} fetchMore={fetchMore} endMessage={type === "received" ? "No more incoming requests." : "No more sent requests."} renderItem={(item) => <FriendCard key={item.id} user={item} initialStatus={item.initialStatus} />} />  
}


// ---------- Search Users (infinite scroll) wrapper ----------
export function SearchUsersInfiniteScroll({ query, ...props }: Omit<React.ComponentProps<typeof InfiniteScroll<{ id: string; name: string; image?: string; bio?: string}>>, "fetchMore" | "renderItem"> & { query: string }) {
  const fetchMore = async (cursor: string) => {
    const result = await searchUsers(query, 20, cursor);
    return { items: result.users, nextCursor: result.nextCursor, error: result.error };
  };
  return (
    <InfiniteScroll {...props} fetchMore={fetchMore} endMessage={`No more users for "${query}"`}
      renderItem={(user) => (
        <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition">
          <Image src={user.image || "/default-avatar.png"} alt={user.name} width={40} height={40} className="rounded-full object-cover" />
          <div>
            <Link href={`/user/${user.id}`} className="font-semibold hover:underline">{user.name}</Link>
            {user.bio && <p className="text-sm text-gray-500 line-clamp-2">{user.bio}</p>}
          </div>
        </div>
      )}
    />
  );
}