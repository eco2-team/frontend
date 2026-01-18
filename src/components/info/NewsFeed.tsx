import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import { InfoQueries } from '@/api/services/info/info.queries';
import { NewsCard } from './NewsCard';

interface NewsFeedProps {
  category?: string;
}

const PULL_THRESHOLD = 80;

export const NewsFeed = ({ category }: NewsFeedProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const touchStartY = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery(InfoQueries.getNewsInfinite({ category, limit: 10 }));

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await refetch();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  const articles = data?.pages.flatMap((page) => page.articles) ?? [];

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3 p-4'>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className='animate-pulse rounded-2xl border border-stroke-default bg-white p-4'
          >
            <div className='flex gap-3'>
              <div className='h-20 w-20 shrink-0 rounded-xl bg-gray-200' />
              <div className='flex flex-1 flex-col gap-2'>
                <div className='h-4 w-3/4 rounded bg-gray-200' />
                <div className='h-3 w-full rounded bg-gray-200' />
                <div className='h-3 w-1/2 rounded bg-gray-200' />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 p-8 text-text-secondary'>
        <p>뉴스를 불러오지 못했어요</p>
        <p className='text-sm'>잠시 후 다시 시도해주세요</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 p-8 text-text-secondary'>
        <p>아직 뉴스가 없어요</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='h-full overflow-y-auto'
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className='flex items-center justify-center overflow-hidden transition-all duration-200'
        style={{ height: pullDistance > 0 || isRefreshing ? pullDistance : 0 }}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-brand-primary border-t-transparent ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
            transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
          }}
        />
      </div>

      <div className='flex flex-col gap-3 p-4'>
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}

        <div ref={loadMoreRef} className='flex justify-center py-4'>
          {isFetchingNextPage && (
            <div className='h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent' />
          )}
        </div>
      </div>
    </div>
  );
};
