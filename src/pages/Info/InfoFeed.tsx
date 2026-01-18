import { useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NewsFeed } from '@/components/info/NewsFeed';

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'environment', label: '환경' },
  { id: 'energy', label: '에너지' },
  { id: 'ai', label: 'AI' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

const isValidCategory = (value: string | null): value is CategoryId => {
  return CATEGORIES.some((c) => c.id === value);
};

const SWIPE_THRESHOLD = 50;
const EDGE_THRESHOLD = 30; // 화면 가장자리 감지 (브라우저 뒤로가기 제스처 영역)

const InfoFeed = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isEdgeSwipe = useRef<boolean>(false);

  const categoryParam = searchParams.get('category');
  const selectedCategory: CategoryId = isValidCategory(categoryParam)
    ? categoryParam
    : 'all';

  const currentIndex = CATEGORIES.findIndex((c) => c.id === selectedCategory);

  const handleCategoryChange = useCallback(
    (categoryId: CategoryId) => {
      setSearchParams(
        categoryId === 'all' ? {} : { category: categoryId },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleSwipe = useCallback(() => {
    // 화면 가장자리에서 시작한 스와이프는 무시 (브라우저 뒤로가기 제스처)
    if (isEdgeSwipe.current) return;

    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) < SWIPE_THRESHOLD) return;

    if (diff > 0 && currentIndex < CATEGORIES.length - 1) {
      // 왼쪽으로 스와이프 → 다음 카테고리
      handleCategoryChange(CATEGORIES[currentIndex + 1].id);
    } else if (diff < 0 && currentIndex > 0) {
      // 오른쪽으로 스와이프 → 이전 카테고리
      handleCategoryChange(CATEGORIES[currentIndex - 1].id);
    }
  }, [currentIndex, handleCategoryChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    touchStartX.current = startX;
    // 화면 왼쪽/오른쪽 가장자리에서 시작하면 브라우저 제스처로 판단
    isEdgeSwipe.current =
      startX < EDGE_THRESHOLD || startX > window.innerWidth - EDGE_THRESHOLD;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    handleSwipe();
  };

  return (
    <main className='no-scrollbar max-w-app relative flex h-full flex-col overflow-hidden bg-white'>
      {/* Header */}
      <header className='px-5 pt-4 pb-3'>
        <h1 className='text-center text-lg font-bold text-text-primary'>News</h1>
      </header>

      {/* Category Tabs */}
      <nav
        ref={tabsRef}
        className='no-scrollbar flex justify-center gap-10 overflow-x-auto px-5 pb-3'
      >
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`shrink-0 text-base transition-colors ${
              selectedCategory === category.id
                ? 'font-semibold text-brand-primary'
                : 'font-normal text-text-inactive hover:text-text-secondary'
            }`}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {/* News Feed with Swipe */}
      <div
        className='flex-1 overflow-y-auto bg-inactive'
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <NewsFeed
          key={selectedCategory}
          category={selectedCategory === 'all' ? undefined : selectedCategory}
        />
      </div>
    </main>
  );
};

export default InfoFeed;
