import axios from 'axios';
import { clearOwnedCharacters } from '@/util/CharacterCache';

// 메인 axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // 쿠키 포함
});

// refresh 전용 axios instance
export const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response) return Promise.reject(error);

    const { status } = response;

    try {
      if (status === 401) {
        await refreshApi.post('/api/v1/auth/refresh');
        // 원래 요청 재시도
        return api(config);
      }

      if (status === 403) {
        // 접근 금지 → 로그아웃 처리
        await api.post('/api/v1/auth/logout');
        clearOwnedCharacters();
        window.location.replace('/#/login');
        return Promise.reject(error);
      }
    } catch (refreshError) {
      console.error('Auth refresh failed', refreshError);

      await api.post('/api/v1/auth/logout').catch(() => {});
      clearOwnedCharacters();
      window.location.replace('/#/login');
      return Promise.reject(refreshError);
    }

    return Promise.reject(error);
  },
);

export default api;
