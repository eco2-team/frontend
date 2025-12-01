import api from '@/api/axiosInstance';
import type {
  ScanCategoryResponse,
  ScanClassifyRequest,
  ScanClassifyResponse,
} from './scan.type';

const BASE_URL = '/api/v1/scan';

export class ScanService {
  static async postScanClassify(data: ScanClassifyRequest) {
    return api
      .post<ScanClassifyResponse>(`${BASE_URL}/classify`, data, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => res.data);
  }

  static async getScanTaskById(taskId: string) {
    return api
      .get<ScanClassifyResponse>(`${BASE_URL}/tasks/${taskId}`)
      .then((res) => res.data);
  }

  static async getScanCategories() {
    return api
      .get<ScanCategoryResponse>(`${BASE_URL}/categories`)
      .then((res) => res.data);
  }

  static async getMetrics() {
    return api.get(`${BASE_URL}/metrics`).then((res) => res.data);
  }
}
