import type { LocationListResponse } from '@/api/services/map/map.type';
import { BottomSheet } from '@/components/bottomSheet/BottomSheet';
import { EcoHelperCard } from '@/components/map/EcoHelperCard';
import { MapCardList } from '@/components/map/MapCardList';

interface MapBottomSheetProps {
  data: LocationListResponse;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
}

const header = (
  <div id='title' className='mb-3 gap-1'>
    <h2 className='text-text-primary text-[17px] leading-6 font-semibold'>
      친환경 장소
    </h2>
    <p className='text-text-secondary text-xs leading-4'>
      가까운 곳부터 보여드릴게요
    </p>
  </div>
);

const children = ({ data, selectedId, setSelectedId }: MapBottomSheetProps) => (
  <>
    <MapCardList
      data={data}
      selectLocationId={selectedId}
      setSelectLocationId={setSelectedId}
    />
    <EcoHelperCard />
  </>
);

export const MapBottomSheet = ({
  data,
  selectedId,
  setSelectedId,
}: MapBottomSheetProps) => {
  const handleResetSelectedId = () => {
    setSelectedId(null);
  };

  return (
    <BottomSheet
      isOpen
      isFullScreen
      header={header}
      onClick={handleResetSelectedId}
    >
      {children({ data, selectedId, setSelectedId })}
    </BottomSheet>
  );
};
