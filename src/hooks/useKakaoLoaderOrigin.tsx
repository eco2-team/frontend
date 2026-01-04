import { useKakaoLoader } from 'react-kakao-maps-sdk';

/**
 * Kakao Map SDK를 로드하는 커스텀 훅
 * - clusterer: 마커 클러스터링
 * - drawing: 지도에 도형 그리기
 * - services: 주소-좌표 변환, 장소 검색 등
 */
export const useKakaoLoaderOrigin = () => {
  useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY,
    libraries: ['clusterer', 'drawing', 'services'],
  });
};

export default useKakaoLoaderOrigin;
