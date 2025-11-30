import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_ZOOM, MapView } from '@/components/map/MapView';
import { MapBottomSheet } from '@/components/map/MapBottomSheet';
import { MapFloatingView } from '@/components/map/MapFloatingView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MapQueries } from '@/api/services/map/map.queries';

const Map = () => {
  const kakaoMapRef = useRef<kakao.maps.Map>(null);

  const { userLocation, center, setCenter, error, isLoading } =
    useGeolocation();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [reSearch, setReSearch] = useState(false);
  const [radius, setRadius] = useState<number>();
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  const { data, refetch } = useQuery({
    ...MapQueries.getLocations({
      lat: center.lat,
      lon: center.lng,
      zoom: 16 - mapZoom,
      radius,
    }),
    enabled: false, // 자동 실행 방지
  });

  // 초기 데이터 로딩
  useEffect(() => {
    if (kakaoMapRef.current) {
      refetch();
    }
  }, [kakaoMapRef, refetch]);

  useEffect(() => {
    if (shouldRefetch) {
      refetch();
      setShouldRefetch(false);
    }
  }, [refetch, shouldRefetch]);

  const handleRefetchCenterLocation = () => {
    refetch();
  };

  const handleCenterChanged = (map: kakao.maps.Map) => {
    const centerLocation = map.getCenter();
    setCenter({
      lat: centerLocation.getLat(),
      lng: centerLocation.getLng(),
    });
    setReSearch(true);
  };

  const handleZoomChanged = useCallback((map: kakao.maps.Map) => {
    setMapZoom(map.getLevel());
    setReSearch(true);

    // 중심에서 화면 우상단까지의 거리로 radius 계산
    const bounds = map.getBounds();
    const center = map.getCenter();
    const ne = bounds.getNorthEast();

    const dist = calculateDistance(
      center.getLat(),
      center.getLng(),
      ne.getLat(),
      ne.getLng(),
    );

    setRadius(Math.round(dist));
  }, []);

  const handleMoveToMyLocation = () => {
    if (!userLocation) return;

    setCenter(userLocation);
    setShouldRefetch(true);

    const moveLatLng = new kakao.maps.LatLng(
      userLocation.lat,
      userLocation.lng,
    );
    kakaoMapRef.current?.panTo(moveLatLng);
  };

  const handleSetSelectedId = (id: number | null) => {
    const targetLocation = data?.find((item) => item.id === id);
    if (!id || !targetLocation) return;

    setSelectedId(id);

    const moveLatLng = new kakao.maps.LatLng(
      targetLocation.latitude,
      targetLocation.longitude,
    );
    kakaoMapRef.current?.panTo(moveLatLng);
  };

  return (
    <div className='relative h-full w-full overflow-y-hidden'>
      <MapView
        ref={kakaoMapRef}
        data={data ?? []}
        selectedId={selectedId}
        userLocation={userLocation}
        handleCenterChanged={handleCenterChanged}
        handleZoomChanged={handleZoomChanged}
      />
      <MapFloatingView
        isMyLocation={
          userLocation?.lat === center?.lat && userLocation?.lng === center?.lng
        }
        reSearch={reSearch}
        refetchCenterLocation={handleRefetchCenterLocation}
        moveToMyLocation={handleMoveToMyLocation}
      />
      <MapBottomSheet
        data={data ?? []}
        selectedId={selectedId}
        setSelectedId={handleSetSelectedId}
      />

      {/* 위치 로딩 중 표시 */}
      {isLoading && (
        <div className='absolute top-3 left-1/2 -translate-x-1/2 rounded bg-white/90 px-4 py-2 text-sm shadow-md'>
          📍 위치 정보 가져오는 중...
        </div>
      )}

      {/* 에러 메시지 표시 */}
      {error && (
        <div className='absolute top-3 left-1/2 -translate-x-1/2 rounded bg-white/90 px-4 py-2 text-sm text-red-500 shadow-md'>
          {error}
        </div>
      )}
    </div>
  );
};

export default Map;

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000; // 지구 반지름 (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
