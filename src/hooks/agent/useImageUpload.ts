/**
 * Agent 이미지 업로드 훅
 * 기존 image.service.ts 재사용
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageService } from '@/api/services/image/image.service';

interface UseImageUploadReturn {
  selectedImage: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  error: Error | null;
  selectImage: (file: File | null) => void;
  uploadImage: () => Promise<string | null>;
  clearImage: () => void;
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // 미리보기 URL 생성 및 정리 (메모리 누수 방지)
  useEffect(() => {
    // 이전 URL 해제
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
    }

    // 새 URL 생성
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setPreviewUrl(url);
      prevUrlRef.current = url;
    } else {
      setPreviewUrl(null);
      prevUrlRef.current = null;
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, [selectedImage]);

  // 이미지 선택
  const selectImage = useCallback((file: File | null) => {
    setSelectedImage(file);
    setError(null);
  }, []);

  // 이미지 업로드 (2단계: Presigned URL → S3)
  const uploadImage = useCallback(async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setIsUploading(true);
    setError(null);

    try {
      // 1. Presigned URL 획득
      const uploadData = await ImageService.postUploadImage({
        channel: 'chat',
        fileMeta: {
          filename: selectedImage.name,
          content_type: selectedImage.type,
        },
      });

      // 2. S3에 직접 업로드
      await ImageService.putUploadImageUDN(uploadData.upload_url, selectedImage);

      // 3. CDN URL 반환
      return uploadData.cdn_url;
    } catch (err) {
      const uploadError =
        err instanceof Error ? err : new Error('Image upload failed');
      setError(uploadError);
      throw uploadError;
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage]);

  // 이미지 초기화
  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setError(null);
  }, []);

  return {
    selectedImage,
    previewUrl,
    isUploading,
    error,
    selectImage,
    uploadImage,
    clearImage,
  };
};
