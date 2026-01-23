import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from '@/components/Toast/toast';
import type { LocationListResponse, SuggestEntry, ToggleType } from '@/api/services/map/map.type';
import { MapQueries } from '@/api/services/map/map.queries';
import { MapService } from '@/api/services/map/map.service';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_ZOOM, MapView } from '@/components/map/MapView';
import { MapFloatingView } from '@/components/map/MapFloatingView';
import { MapBottomSheet } from '@/components/map/bottomSheet/MapBottomSheet';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { MapDetailSheet } from '@/components/map/MapDetailSheet';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { WasteTypeKey } from '@/types/MapTypes';
import SpinnerIng from '@/assets/icons/spinner_ing.svg';

const Map = () => {
  const location = useLocation();
  const filter = (location.state as { filter?: WasteTypeKey } | null)?.filter;

  const kakaoMapRef = useRef<kakao.maps.Map>(null);

  const { userLocation, center, setCenter, error, isLoading, permissionStatus } =
    useGeolocation();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [reSearch, setReSearch] = useState(false);
  const [radius, setRadius] = useState<number>();
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);
  const [toggle, setToggle] = useState<ToggleType>('all');
  const [selectedFilter, setSelectedFilter] = useState<WasteTypeKey[]>(
    filter ? [filter] : [],
  );
  const [selectedStoreCategories, setSelectedStoreCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LocationListResponse | undefined>(undefined);

  const { data, refetch } = useQuery({
    ...MapQueries.getLocations({
      lat: center.lat,
      lon: center.lng,
      zoom: 16 - mapZoom,
      radius,
      store_category: selectedStoreCategories.length > 0
        ? selectedStoreCategories.join(',')
        : undefined,
    }),
    enabled: false,
  });

  // 위치 정보 로딩 완료 후 초기 데이터 로딩
  useEffect(() => {
    if (!isLoading && kakaoMapRef.current) {
      refetch();
    }
  }, [isLoading, refetch]);

  useEffect(() => {
    if (shouldRefetch) {
      refetch();
      setShouldRefetch(false);
    }
  }, [refetch, shouldRefetch]);

  // store_category 변경 시 재검색
  useEffect(() => {
    if (!isLoading) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreCategories]);

  const handleRefetchCenterLocation = () => {
    handleSetSelectedId(null);
    setSearchResults(undefined);
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

    const bounds = map.getBounds();
    const mapCenter = map.getCenter();
    const ne = bounds.getNorthEast();

    const dist = calculateDistance(
      mapCenter.getLat(),
      mapCenter.getLng(),
      ne.getLat(),
      ne.getLng(),
    );

    setRadius(Math.round(dist));
  }, []);

  const handleMoveToMyLocation = () => {
    if (!userLocation) return;

    setCenter(userLocation);
    setSearchResults(undefined);
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

    const displayData = searchResults || data;
    const targetLocation = displayData?.find((item) => item.id === id);
    if (!id || !targetLocation) return;

    setSelectedId(id);

    const moveLatLng = new kakao.maps.LatLng(
      targetLocation.latitude,
      targetLocation.longitude,
    );
    kakaoMapRef.current?.panTo(moveLatLng);
  };

  const handleDetailOpen = (id: number) => {
    setDetailId(id);
  };

  const handleDetailClose = () => {
    setDetailId(null);
  };

  const handleScrollToTop = () => {
    const scrollContainer = document.getElementById(
      'bottom-sheet-scroll-container',
    );
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSetToggle = (newToggle: ToggleType) => {
    setToggle(newToggle);
    handleScrollToTop();
  };

  // 검색 실행
  const handleSearch = async (query: string) => {
    try {
      const results = await MapService.searchLocations({ q: query, radius: 5000 });
      setSearchResults(results);
      setSelectedId(null);
      setReSearch(false);

      // 첫 번째 결과로 지도 이동
      if (results.length > 0) {
        const first = results[0];
        const moveLatLng = new kakao.maps.LatLng(first.latitude, first.longitude);
        kakaoMapRef.current?.panTo(moveLatLng);
        setCenter({ lat: first.latitude, lng: first.longitude });
      }
    } catch {
      toast.error('검색에 실패했습니다.');
    }
  };

  // 자동완성 선택 시
  const handleSuggestSelect = (entry: SuggestEntry) => {
    const moveLatLng = new kakao.maps.LatLng(entry.latitude, entry.longitude);
    kakaoMapRef.current?.panTo(moveLatLng);
    setCenter({ lat: entry.latitude, lng: entry.longitude });
    setSearchResults(undefined);
    setShouldRefetch(true);
    setReSearch(false);
  };

  const displayData = searchResults || data;

  const sortedData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];

    const filteredBySource =
      toggle === 'all'
        ? displayData
        : toggle === 'none'
          ? []
          : displayData.filter((item) => item.source === toggle);

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
  }, [displayData, selectedFilter, selectedId, toggle]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const LoadingOverlay = () => (
    <div className='absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm'>
      <img
        src={SpinnerIng}
        alt='loading'
        className='h-12 w-12 animate-spin'
      />
      <p className='mt-4 text-sm text-gray-600'>
        {permissionStatus === 'prompt'
          ? '위치 권한을 허용해주세요'
          : '위치 정보를 불러오는 중...'}
      </p>
    </div>
  );

  return (
    <div className='relative h-full w-full overflow-y-hidden'>
      {isLoading && <LoadingOverlay />}

      <MapSearchBar
        onSearch={handleSearch}
        onSuggestSelect={handleSuggestSelect}
      />

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
        selectedStoreCategories={selectedStoreCategories}
        setSelectedStoreCategories={setSelectedStoreCategories}
        onDetailOpen={handleDetailOpen}
      />

      {/* 상세 시트 */}
      <MapDetailSheet
        centerId={detailId}
        onClose={handleDetailClose}
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
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
