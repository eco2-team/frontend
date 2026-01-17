import type { NewsArticle } from '@/api/services/info/info.type';

interface NewsCardProps {
  article: NewsArticle;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
};

export const NewsCard = ({ article }: NewsCardProps) => {
  const handleClick = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className='cursor-pointer rounded-2xl border border-stroke-default bg-white p-4 transition-all hover:border-brand-primary hover:shadow-sm active:scale-[0.99]'
      onClick={handleClick}
    >
      <div className='flex gap-3'>
        {article.thumbnail_url && (
          <div className='h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100'>
            <img
              src={article.thumbnail_url}
              alt=''
              className='h-full w-full object-cover'
              loading='lazy'
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className='flex min-w-0 flex-1 flex-col'>
          <h3 className='mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-text-primary'>
            {article.title}
          </h3>

          <p className='mb-2 line-clamp-2 text-xs leading-relaxed text-text-secondary'>
            {article.snippet}
          </p>

          <div className='mt-auto flex items-center gap-2 text-[11px] text-text-inactive'>
            {article.source_icon_url && (
              <img
                src={article.source_icon_url}
                alt={article.source_name}
                className='h-3.5 w-3.5 rounded-sm'
              />
            )}
            <span>{article.source_name}</span>
            <span>·</span>
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>
      </div>

      {article.keywords && article.keywords.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {article.keywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className='rounded-full bg-brand-secondary px-2 py-0.5 text-[10px] font-medium text-brand-primary'
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
