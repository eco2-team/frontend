import FilterIcon from '@/assets/icons/icon_map_filter.svg';
import type { LocationListResponse } from '@/api/services/map/map.type';
import { EcoHelperCard } from '@/components/map/EcoHelperCard';
import { MapCardList } from '@/components/map/MapCardList';

interface MainHeaderProps {
  handlePickupFilter: () => void;
  handleStoreFilter: () => void;
}

export const MainHeader = ({ handlePickupFilter, handleStoreFilter }: MainHeaderProps) => {
  return (
    <div id='title' className='mb-3 flex'>
      <div className='flex flex-1 flex-col gap-1'>
        <h2 className='text-text-primary text-[17px] leading-6 font-semibold'>
          친환경 장소
        </h2>
        <p className='text-text-secondary text-xs leading-4'>
          가까운 곳부터 보여드릴게요
        </p>
      </div>
      <div className='flex items-start gap-2 pt-1'>
        <button
          className='flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600'
          onClick={handleStoreFilter}
        >
          유형
        </button>
        <button
          className='h-7.5 w-7.5 cursor-pointer'
          onClick={handlePickupFilter}
        >
          <img src={FilterIcon} alt='filter' />
        </button>
      </div>
    </div>
  );
};

interface MainChildrenProps {
  data: LocationListResponse;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  onDetailOpen: (id: number) => void;
}

export const MainChildren = ({
  data,
  selectedId,
  setSelectedId,
  onDetailOpen,
}: MainChildrenProps) => (
  <>
    <MapCardList
      data={data}
      selectLocationId={selectedId}
      setSelectLocationId={setSelectedId}
      onDetailOpen={onDetailOpen}
    />
    <EcoHelperCard />
  </>
);
