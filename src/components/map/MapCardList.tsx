import { MapCard } from './MapCard';
import type { LocationListResponse } from '@/api/services/map/map.type';

interface MapCardListProps {
  data: LocationListResponse;
  selectLocationId: number | null;
  setSelectLocationId: (id: number | null) => void;
  onDetailOpen: (id: number) => void;
}

export const MapCardList = ({
  data,
  selectLocationId,
  setSelectLocationId,
  onDetailOpen,
}: MapCardListProps) => {
  return (
    <div className='mb-4 space-y-3'>
      {data.map((location, idx) => (
        <MapCard
          key={location.kakao_place_id || `${location.id}-${idx}`}
          location={location}
          selectedLocationId={selectLocationId}
          setSelectedLocationId={setSelectLocationId}
          onDetailOpen={onDetailOpen}
        />
      ))}
    </div>
  );
};
