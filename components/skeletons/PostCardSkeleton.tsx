import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for a post card, used as a placeholder while the actual post data is loading. 
export function PostCardSkeleton() {
  return (
    <div className="border rounded-xl shadow-md p-5 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg mb-4" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-20 w-full" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

// A list of post card skeletons, (multiple placeholders). The count prop determines how many skeletons to show (default is 3).
export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}