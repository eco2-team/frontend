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

const InfoFeed = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category');
  const selectedCategory: CategoryId = isValidCategory(categoryParam)
    ? categoryParam
    : 'all';

  const handleCategoryChange = (categoryId: CategoryId) => {
    setSearchParams(
      categoryId === 'all' ? {} : { category: categoryId },
      { replace: true }
    );
  };

  return (
    <main className='no-scrollbar max-w-app relative flex h-full flex-col overflow-hidden bg-white'>
      {/* Header */}
      <header className='px-5 pt-4 pb-3'>
        <h1 className='text-center text-lg font-bold text-text-primary'>News</h1>
      </header>

      {/* Category Tabs */}
      <nav className='no-scrollbar flex justify-center gap-10 overflow-x-auto px-5 pb-3'>
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

      {/* News Feed */}
      <div className='flex-1 overflow-hidden bg-inactive'>
        <NewsFeed
          key={selectedCategory}
          category={selectedCategory === 'all' ? undefined : selectedCategory}
        />
      </div>
    </main>
  );
};

export default InfoFeed;
