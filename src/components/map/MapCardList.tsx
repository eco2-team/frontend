import { MapCard } from './MapCard';
import type { LocationListResponse } from '@/api/services/map/map.type';

interface MapCardListProps {
  data: LocationListResponse;
  selectLocationId: number | null;
  setSelectLocationId: (id: number | null) => void;
}

export const MapCardList = ({
  data,
  selectLocationId,
  setSelectLocationId,
}: MapCardListProps) => {
  return (
    <div className='mb-4 space-y-3'>
      {data.map((location) => (
        <MapCard
          key={location.id}
          location={location}
          selectedLocationId={selectLocationId}
          setSelectedLocationId={setSelectLocationId}
        />
      ))}
    </div>
  );
};
