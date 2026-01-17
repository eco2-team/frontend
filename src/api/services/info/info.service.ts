import api from '@/api/axiosInstance';
import type {
  NewsListRequest,
  NewsListResponse,
  CategoryListResponse,
} from '@/api/services/info/info.type';

const BASE_URL = '/api/v1/info';

export class InfoService {
  static async getNews(request: NewsListRequest = {}) {
    return api
      .get<NewsListResponse>(`${BASE_URL}/news`, { params: request })
      .then((res) => res.data);
  }

  static async getCategories() {
    return api
      .get<CategoryListResponse>(`${BASE_URL}/categories`)
      .then((res) => res.data);
  }
}
