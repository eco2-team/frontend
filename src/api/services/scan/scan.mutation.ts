import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { ScanService } from './scan.service';
import type { ScanClassifyRequest, ScanClassifyResponse } from './scan.type';

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
