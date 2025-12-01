import FilterIcon from '@/assets/icons/icon_map_filter.svg';
import type { LocationListResponse } from '@/api/services/map/map.type';
import { EcoHelperCard } from '@/components/map/EcoHelperCard';
import { MapCardList } from '@/components/map/MapCardList';

interface MainHeaderProps {
  handleFilter: () => void;
}

export const MainHeader = ({ handleFilter }: MainHeaderProps) => {
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
      <button
        className='h-7.5 w-7.5 cursor-pointer pt-1'
        onClick={handleFilter}
      >
        <img src={FilterIcon} alt='filter' />
      </button>
    </div>
  );
};

interface MainChildrenProps {
  data: LocationListResponse;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
}

export const MainChildren = ({
  data,
  selectedId,
  setSelectedId,
}: MainChildrenProps) => (
  <>
    <MapCardList
      data={data}
      selectLocationId={selectedId}
      setSelectLocationId={setSelectedId}
    />
    <EcoHelperCard />
  </>
);
