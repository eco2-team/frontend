import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { ScanService } from './scan.service';
import type {
  ScanClassifyRequest,
  ScanClassifyResponse,
  ScanSubmitRequest,
  ScanSubmitResponse,
} from './scan.type';

/**
 * POST /api/v1/scan - 스캔 작업 제출
 * SSE 스트리밍을 위한 job_id, stream_url 반환
 */
export const useScanSubmitMutation = (
  options?: Omit<
    UseMutationOptions<ScanSubmitResponse, Error, ScanSubmitRequest, unknown>,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation<ScanSubmitResponse, Error, ScanSubmitRequest, unknown>({
    mutationKey: ['scan', 'submit'],
    mutationFn: async (data) => {
      return ScanService.postScan(data);
    },
    ...options,
  });
};

/**
 * @deprecated useScanSubmitMutation + SSE로 대체됨
 */
export const useScanClassifyMutation = (
  options?: Omit<
    UseMutationOptions<
      ScanClassifyResponse,
      Error,
      ScanClassifyRequest,
      unknown
    >,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation<ScanClassifyResponse, Error, ScanClassifyRequest, unknown>(
    {
      mutationKey: ['scan'],
      mutationFn: async ({ image_url }) => {
        return ScanService.postScanClassify({ image_url });
      },
      ...options,
    },
  );
};
