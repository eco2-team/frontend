import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { NewsListRequest } from './info.type';
import { InfoService } from './info.service';

export class InfoQueries {
  static readonly keys = {
    root: ['info'] as const,
    news: () => [...this.keys.root, 'news'] as const,
    newsWithParams: (params: Omit<NewsListRequest, 'cursor'>) =>
      [...this.keys.news(), params] as const,
    categories: () => [...this.keys.root, 'categories'] as const,
  };

  static getNewsInfinite(params: Omit<NewsListRequest, 'cursor'> = {}) {
    return infiniteQueryOptions({
      queryKey: this.keys.newsWithParams(params),
      queryFn: async ({ pageParam }) => {
        return InfoService.getNews({
          ...params,
          cursor: pageParam ?? undefined,
        });
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.has_more ? lastPage.next_cursor : undefined,
    });
  }

  static getCategories() {
    return queryOptions({
      queryKey: this.keys.categories(),
      queryFn: () => InfoService.getCategories(),
      staleTime: 1000 * 60 * 30, // 30분
    });
  }
}
