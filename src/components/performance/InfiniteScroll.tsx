import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  children: React.ReactNode;
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  threshold = 0.5,
  children,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, loading]
  );

  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
      threshold,
    });

    observer.observe(observerTarget.current);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, threshold]);

  return (
    <>
      {children}

      <div ref={observerTarget} className="flex justify-center py-8">
        {loading && (
          <div className="flex items-center space-x-2 text-terminal-green font-mono">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading more...</span>
          </div>
        )}

        {!hasMore && !loading && (
          <div className="text-gray-500 font-mono text-sm">
            You've reached the end!
          </div>
        )}
      </div>
    </>
  );
}
