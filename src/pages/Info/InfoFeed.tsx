import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewsFeed } from '@/components/info/NewsFeed';
import GoBack from '@/assets/icons/go_back.svg';

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'environment', label: '환경' },
  { id: 'energy', label: '에너지' },
  { id: 'ai', label: 'AI' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

const InfoFeed = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <main className='no-scrollbar max-w-app relative flex h-full flex-col overflow-hidden bg-white'>
      {/* Header */}
      <header className='flex items-center justify-between px-5 pt-4 pb-3'>
        <button
          onClick={handleGoBack}
          className='flex h-10 w-10 items-center justify-center'
        >
          <img src={GoBack} alt='뒤로가기' className='h-7 w-7' />
        </button>
        <h1 className='text-lg font-bold text-text-primary'>News</h1>
        <div className='h-10 w-10' />
      </header>

      {/* Category Tabs */}
      <nav
        ref={tabsRef}
        className='no-scrollbar flex justify-center gap-10 overflow-x-auto px-5 pb-3'
      >
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
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
      <div className='flex-1 overflow-y-auto bg-inactive'>
        <NewsFeed
          key={selectedCategory}
          category={selectedCategory === 'all' ? undefined : selectedCategory}
        />
      </div>
    </main>
  );
};

export default InfoFeed;
