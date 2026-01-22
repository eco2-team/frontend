import { useEffect, useState } from 'react';
import { DEFAULT_CENTER } from '@/constants/MapConfig';
import type { Position } from '@/types/MapTypes';
import useKakaoLoaderOrigin from './useKakaoLoaderOrigin';

interface GeolocationError {
  code: number;
  message: string;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UseGeolocationReturn {
  center: Position;
  setCenter: (center: Position) => void;
  userLocation: Position | null;
  error: string | null;
  isLoading: boolean;
  permissionStatus: PermissionStatus;
}

/**
 * 사용자의 현재 위치를 가져오는 커스텀 훅
 * @returns {UseGeolocationReturn} position, error, isLoading, permissionStatus 상태
 */
export const useGeolocation = (): UseGeolocationReturn => {
  const [center, setCenter] = useState<Position>(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('prompt');

  useKakaoLoaderOrigin();

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다.');
      setPermissionStatus('unsupported');
      setIsLoading(false);
      return;
    }

    // 권한 상태 확인 (Permissions API 지원 시)
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({
            name: 'geolocation',
          });
          setPermissionStatus(result.state as PermissionStatus);

          // 권한 상태 변경 감지
          result.onchange = () => {
            setPermissionStatus(result.state as PermissionStatus);
          };
        } catch {
          // Permissions API 지원 안 하는 경우 무시
        }
      }
    };

    checkPermission();

    const handleSuccess = (pos: GeolocationPosition) => {
      const location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      setUserLocation(location);
      setCenter(location);
      setPermissionStatus('granted');
      setError(null);
      setIsLoading(false);
    };

    const handleError = (err: GeolocationError) => {
      let errorMsg = '위치 정보를 가져올 수 없습니다.';

      // 에러 타입별 상세 메시지
      switch (err.code) {
        case 1: // PERMISSION_DENIED
          errorMsg =
            '위치 권한이 거부되었습니다.\n브라우저 설정에서 위치 권한을 허용해주세요.';
          setPermissionStatus('denied');
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMsg = '위치 정보를 사용할 수 없습니다.';
          break;
        case 3: // TIMEOUT
          errorMsg = '위치 정보 요청 시간이 초과되었습니다.';
          break;
      }

      setError(errorMsg);
      setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, // 높은 정확도 사용
      timeout: 10000, // 10초 타임아웃
      maximumAge: 0, // 캐시된 위치 사용 안 함
    });
  }, []);

  return { center, setCenter, userLocation, error, isLoading, permissionStatus };
};
