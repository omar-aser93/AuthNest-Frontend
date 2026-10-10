import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for a user card, used as a placeholder while the actual user data is loading.
export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

// A list of user card skeletons, (multiple placeholders). The count prop determines how many skeletons to show (default is 5).
export function UserCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}