import { Map, MapMarker } from 'react-kakao-maps-sdk';
import superPinMarker from '@/assets/icons/icon_superbean.svg';
import userMarker from '@/assets/icons/my_location.svg';
import zeroWasteMarker from '@/assets/icons/icon_zerowaste.svg';
import { DEFAULT_CENTER } from '@/constants/MapConfig';
import type { Position } from '@/types/MapTypes';
import type { LocationListResponse } from '@/api/services/map/map.type';

export const DEFAULT_ZOOM = 3;

interface MapViewProps {
  ref: React.RefObject<kakao.maps.Map | null>;
  data: LocationListResponse;
  selectedId: number | null;
  userLocation: Position | null;
  handleCenterChanged: (target: kakao.maps.Map) => void;
  handleZoomChanged: (target: kakao.maps.Map) => void;
}

export const MapView = ({
  ref,
  data,
  selectedId,
  userLocation,
  handleCenterChanged,
  handleZoomChanged,
}: MapViewProps) => {
  return (
    <Map
      id='map'
      ref={ref}
      level={DEFAULT_ZOOM}
      center={userLocation ?? DEFAULT_CENTER}
      className='h-[60%] w-full'
      onDragEnd={handleCenterChanged}
      onZoomChanged={handleZoomChanged}
    >
      <>
        {/* 사용자 현재 위치 표시 */}
        {userLocation && (
          <MapMarker
            position={userLocation}
            image={{
              src: userMarker,
              size: { width: 48, height: 48 },
            }}
          />
        )}

        {/* 근처 제로 웨이스트샵 및 수퍼빈 표시 (임시 데이터) */}
        {data.length > 0 &&
          data
            .filter((item) => selectedId === null || item.id === selectedId)
            .map((item, index) => (
              <MapMarker
                key={index}
                position={{ lat: item.latitude, lng: item.longitude }}
                image={{
                  src: item.id % 2 === 0 ? zeroWasteMarker : superPinMarker,
                  size: { width: 40, height: 40 },
                }}
                onClick={() => console.log(item)}
              />
            ))}
      </>
    </Map>
  );
};
