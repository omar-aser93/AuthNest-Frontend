"use client";

import { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// TypeScript interface for InfiniteScroll received props
interface InfiniteScrollProps<T> {
  initialItems: T[];
  initialNextCursor: string | null;
  fetchMore: (cursor: string) => Promise<{ items: T[]; nextCursor: string | null; error?: string }>;
  renderItem: (item: T) => React.ReactNode;
  initialError?: string;
  loadingMessage?: string;
  endMessage?: string;
  errorRetryMessage?: string;  
}

// InfiniteScroll component to handle infinite scrolling, receives initialItems, initialNextCursor, fetchMore, renderItem, initialError, loadingMessage, endMessage and errorRetryMessage as props
export default function InfiniteScroll<T>({
  initialItems,
  initialNextCursor,
  fetchMore,
  renderItem,
  initialError,
  loadingMessage = "",
  endMessage = "You've seen all! 🎉",
  errorRetryMessage = "Failed to load. Click to retry.",  
}: InfiniteScrollProps<T>) {
  // States for items, nextCursor, loading and error
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  // useInView from react-intersection-observer, Sentinel for infinite scroll [trigger]
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "250px" });

  // Callback function to load more items when the sentinel is in view
  const loadMore = useCallback(async () => {
    if (loading || !nextCursor) return;      // Prevent multiple simultaneous loads or loading items when there's no next cursor
    setLoading(true);                        // Set loading state to true
    setError(null);                          // Clear previous errors
    try {
      const res = await fetchMore(nextCursor);   // Call the fetchMore function (received as a prop) with the current nextCursor
      // If error in response, set error state, else append new items to the list and update nextCursor
      if (res.error) {
        setError(res.error);
      } else if (res.items) {
        setItems((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor);
      }
    } catch {
      setError("Unexpected error");           // Handle any unexpected generic errors during fetch
    } finally {
      setLoading(false);                      // Set loading state back to false after fetch is complete (whether successful or failed)
    }
  }, [nextCursor, loading, fetchMore]);

  // Effect to trigger loadMore() when scrolled into view
  useEffect(() => {
    if (inView && nextCursor && !loading && !error) { loadMore() }
  }, [inView, nextCursor, loading, error, loadMore]);

  return (
    <div className="space-y-5">
      {/* Map over items array & pass them to received renderItem function to render individual components */} 
      {items.map((item) => renderItem(item))}

      {/* Sentinel for infinite scroll [trigger] */}
      {nextCursor && !error && <div ref={ref} className="h-6" />}

      {/* Loading indicator (shown briefly during navigation) */}
      {nextCursor && loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin h-6 w-6 text-gray-500" /> {loadingMessage}
        </div>
      )}

      {/* Pagination Fetch ERROR + RETRY */}
      {error && nextCursor && (
        <Button variant="ghost" onClick={loadMore} disabled={loading} className="mx-auto flex items-center gap-2 text-sm text-red-500 py-4 hover:underline" >
          <RefreshCcw className="w-4 h-4" /> {errorRetryMessage}
        </Button>
      )}

      {/* The End of the list */}
      {!nextCursor && items.length > 0 && !error && (
        <p className="text-center text-gray-400 py-4">{endMessage}</p>
      )}
    </div>
  );
}