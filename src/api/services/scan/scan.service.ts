import api from '@/api/axiosInstance';
import type {
  ScanCategoryResponse,
  ScanClassifyRequest,
  ScanClassifyResponse,
  ScanSubmitRequest,
  ScanSubmitResponse,
} from './scan.type';

const BASE_URL = '/api/v1/scan';

export class ScanService {
  /**
   * 스캔 작업 제출 (새 API)
   * POST /api/v1/scan → job_id, stream_url, result_url 반환
   */
  static async postScan(data: ScanSubmitRequest) {
    return api
      .post<ScanSubmitResponse>(BASE_URL, data, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => res.data);
  }

  /**
   * 스캔 결과 조회
   * GET /api/v1/scan/{job_id}/result
   */
  static async getScanResult(jobId: string) {
    return api
      .get<ScanClassifyResponse>(`${BASE_URL}/${jobId}/result`)
      .then((res) => res.data);
  }

  /**
   * @deprecated postScan + SSE로 대체됨
   */
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
