import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for a comment, used as a placeholder while the actual comment data is loading.
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// A list of comment skeletons, (multiple placeholders). The count prop determines how many skeletons to show (default is 2).
export function CommentSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}