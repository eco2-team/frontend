import { NewsFeed } from '@/components/info/NewsFeed';

const InfoFeed = () => {
  return (
    <main className='no-scrollbar max-w-app relative flex h-full flex-col overflow-y-auto bg-inactive'>
      <header className='sticky top-0 z-10 bg-white px-6 pt-7 pb-4 shadow-sm'>
        <h1 className='text-xl font-semibold text-text-primary'>
          환경 뉴스
        </h1>
        <p className='mt-1 text-sm text-text-secondary'>
          분리배출과 환경 관련 최신 소식
        </p>
      </header>

      <NewsFeed />
    </main>
  );
};

export default InfoFeed;
