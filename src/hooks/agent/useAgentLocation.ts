/**
 * Agent 위치 정보 훅
 * useGeolocation 재사용 + Backend 스키마 변환
 */

import { useMemo } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Position } from '@/types/MapTypes';
import type { UserLocation } from '@/api/services/agent';

interface UseAgentLocationReturn {
  /** Frontend Position 형식 (lat, lng) */
  position: Position | null;
  /** Backend UserLocation 형식 (latitude, longitude) */
  userLocation: UserLocation | undefined;
  /** 권한 상태 */
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
}

/**
 * Frontend Position → Backend UserLocation 변환
 */
export const toBackendLocation = (
  pos: Position | null,
): UserLocation | undefined => {
  if (!pos) return undefined;
  return {
    latitude: pos.lat,
    longitude: pos.lng,
  };
};

/**
 * Agent용 위치 정보 훅
 * - useGeolocation 재사용
 * - Backend 스키마 자동 변환
 */
export const useAgentLocation = (): UseAgentLocationReturn => {
  const { userLocation, permissionStatus, isLoading, error } = useGeolocation();

  // Backend 형식으로 변환 (메모이제이션)
  const backendLocation = useMemo(
    () => toBackendLocation(userLocation),
    [userLocation],
  );

  return {
    position: userLocation,
    userLocation: backendLocation,
    permissionStatus,
    isLoading,
    error,
  };
};
