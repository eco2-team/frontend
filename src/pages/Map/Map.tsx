import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from '@/components/Toast/toast';
import type { ToggleType } from '@/api/services/map/map.type';
import { MapQueries } from '@/api/services/map/map.queries';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_ZOOM, MapView } from '@/components/map/MapView';
import { MapFloatingView } from '@/components/map/MapFloatingView';
import { MapBottomSheet } from '@/components/map/bottomSheet/MapBottomSheet';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { WasteTypeKey } from '@/types/MapTypes';

const Map = () => {
  const location = useLocation();
  const filter = (location.state as { filter?: WasteTypeKey } | null)?.filter;

  const kakaoMapRef = useRef<kakao.maps.Map>(null);

  const { userLocation, center, setCenter, error, isLoading } =
    useGeolocation();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [reSearch, setReSearch] = useState(false);
  const [radius, setRadius] = useState<number>();
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);
  const [toggle, setToggle] = useState<ToggleType>('all');
  const [selectedFilter, setSelectedFilter] = useState<WasteTypeKey[]>(
    filter ? [filter] : [],
  );

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
    handleSetSelectedId(null);
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
    setSelectedId(id);
    handleScrollToTop();

    const targetLocation = data?.find((item) => item.id === id);
    if (!id || !targetLocation) return;

    setSelectedId(id);

    const moveLatLng = new kakao.maps.LatLng(
      targetLocation.latitude,
      targetLocation.longitude,
    );
    kakaoMapRef.current?.panTo(moveLatLng);
  };

  const handleScrollToTop = () => {
    const scrollContainer = document.getElementById(
      'bottom-sheet-scroll-container',
    );
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSetToggle = (toggle: ToggleType) => {
    setToggle(toggle);
    handleScrollToTop();
  };

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const filteredBySource =
      toggle === 'all' ? data : data.filter((item) => item.source === toggle);

    const filteredByCategories =
      selectedFilter.length > 0
        ? filteredBySource.filter((item) =>
            item.pickup_categories?.some((category) =>
              selectedFilter.includes(category as WasteTypeKey),
            ),
          )
        : filteredBySource;

    return filteredByCategories.slice().sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return 0;
    });
  }, [data, selectedFilter, selectedId, toggle]);

  if (isLoading) toast.success('위치 정보를 불러오고 있습니다.');
  if (error) toast.error(error);

  return (
    <div className='relative h-full w-full overflow-y-hidden'>
      <MapView
        ref={kakaoMapRef}
        data={sortedData}
        selectedId={selectedId}
        setSelectedId={handleSetSelectedId}
        userLocation={userLocation}
        handleCenterChanged={handleCenterChanged}
        handleZoomChanged={handleZoomChanged}
      />
      <MapFloatingView
        toggle={toggle}
        setToggle={handleSetToggle}
        isMyLocation={
          userLocation?.lat === center?.lat && userLocation?.lng === center?.lng
        }
        reSearch={reSearch}
        refetchCenterLocation={handleRefetchCenterLocation}
        moveToMyLocation={handleMoveToMyLocation}
      />
      <MapBottomSheet
        data={sortedData}
        selectedId={selectedId}
        setSelectedId={handleSetSelectedId}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />
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
