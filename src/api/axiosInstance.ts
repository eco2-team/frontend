import axios from 'axios';

// 🔍 DEBUG: API 로그 함수
const apiLog = (tag: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🌐 ${tag}:`, ...args);
};

// 메인 axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // 쿠키 포함
  timeout: 60000, // 🔍 DEBUG: 60초 타임아웃 (scan API가 오래 걸릴 수 있음)
});

// refresh 전용 axios instance
export const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// 🔍 DEBUG: 요청 인터셉터 추가
api.interceptors.request.use(
  (config) => {
    apiLog('REQUEST', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data ? JSON.stringify(config.data).substring(0, 500) : null,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    apiLog('REQUEST_ERROR', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    apiLog('RESPONSE_SUCCESS', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: JSON.stringify(response.data).substring(0, 1000),
    });
    return response;
  },
  async (error) => {
    apiLog('RESPONSE_ERROR', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : null,
    });

    const { response, config } = error;
    if (!response) {
      apiLog('RESPONSE_ERROR_NO_RESPONSE', 'response 객체 없음 - 네트워크 에러 또는 타임아웃');
      return Promise.reject(error);
    }

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
        window.location.replace('/#/login');
        return Promise.reject(error);
      }
    } catch (refreshError) {
      console.error('Auth refresh failed', refreshError);

      await api.post('/api/v1/auth/logout').catch(() => {});
      window.location.replace('/#/login');
      return Promise.reject(refreshError);
    }

    return Promise.reject(error);
  },
);

export default api;
