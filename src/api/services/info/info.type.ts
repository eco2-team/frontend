export type NewsArticle = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: 'naver' | 'newsdata';
  source_name: string;
  published_at: string;
  thumbnail_url: string | null;
  category: string | null;
  source_icon_url: string | null;
  video_url: string | null;
  keywords: string[] | null;
  ai_tag: string | null;
};

export type NewsMeta = {
  total_cached: number;
  cache_expires_in: number;
};

export type NewsListResponse = {
  articles: NewsArticle[];
  next_cursor: string | null;
  has_more: boolean;
  meta: NewsMeta;
};

export type NewsListRequest = {
  cursor?: string;
  limit?: number;
  category?: string;
};

export type Category = {
  id: string;
  name: string;
};

export type CategoryListResponse = {
  categories: Category[];
};
