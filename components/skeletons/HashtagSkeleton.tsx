import { Skeleton } from "@/components/ui/skeleton";

// A list of hashtag skeletons, (multiple placeholders). The count prop determines how many skeletons to show (default is 5).
export function HashtagSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="block p-3 border rounded-lg">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}