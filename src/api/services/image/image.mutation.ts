import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { ImageService } from './image.service';
import type { ImageUpload, ImageUploadResponse } from './image.type';

export const useUploadImageMutation = (
  options?: Omit<
    UseMutationOptions<ImageUploadResponse, Error, ImageUpload, unknown>,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation<ImageUploadResponse, Error, ImageUpload, unknown>({
    mutationKey: ['image'],
    mutationFn: async ({ channel, fileMeta }) => {
      return ImageService.postUploadImage({ channel, fileMeta });
    },
    ...options,
  });
};
