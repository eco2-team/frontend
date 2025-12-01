import { WasteType, type WasteTypeKey } from '@/types/MapTypes';
import CloseIcon from '@/assets/icons/icon_cancel_map.svg';
import { useState } from 'react';

interface FilterHeaderProps {
  onClose: () => void;
}

export const FilterHeader = ({ onClose }: FilterHeaderProps) => {
  return (
    <div id='title' className='mb-3 flex items-center justify-between'>
      <h2 className='text-text-primary text-[17px] leading-6 font-semibold'>
        수거품목 필터
      </h2>
      <button className='h-7.5 w-7.5 cursor-pointer' onClick={onClose}>
        <img src={CloseIcon} alt='filter' />
      </button>
    </div>
  );
};

interface FilterChildrenProps {
  selectedFilter: WasteTypeKey[];
  setSelectedFilter: (filter: WasteTypeKey[]) => void;
  onClose: () => void;
}

export const FilterChildren = ({
  selectedFilter,
  setSelectedFilter,
  onClose,
}: FilterChildrenProps) => {
  const [tempFilter, setTempFilter] = useState<WasteTypeKey[]>(selectedFilter);

  const handleResetFilter = () => {
    setTempFilter([]);
  };

  const handleShowResult = () => {
    setSelectedFilter(tempFilter);
    onClose();
  };

  return (
    <div className='mt-3 flex flex-col'>
      <div className='flex flex-row flex-wrap gap-2.5 gap-y-3.5'>
        {Object.entries(WasteType).map(([key, label]) => {
          const wasteKey = key as WasteTypeKey;
          const isSelected = tempFilter.includes(wasteKey);

          const handleSelectFilter = (wasteKey: WasteTypeKey) => () => {
            if (isSelected) {
              const newFilter = tempFilter.filter((f) => f !== wasteKey);
              setTempFilter(newFilter);
              return;
            }
            setTempFilter([...tempFilter, wasteKey]);
          };

          return (
            <div
              key={key}
              onClick={handleSelectFilter(wasteKey)}
              className={`cursor-pointer rounded-[50px] px-4 py-1 text-[13px] leading-7.5 font-medium ${isSelected ? 'bg-brand-primary text-white' : 'text-text-primary'} border-stroke-default border`}
            >
              {label}
            </div>
          );
        })}
      </div>

      <div className='mt-9 flex flex-row justify-between gap-2'>
        <button
          onClick={handleResetFilter}
          className='border-stroke-default text-text-secondary flex-1 rounded-[10px] border px-4 py-1 text-[13px] leading-7.5 font-medium'
        >
          초기화
        </button>
        <button
          onClick={handleShowResult}
          className='bg-brand-primary flex-1 rounded-[10px] px-4 py-1 text-[13px] leading-7.5 font-medium text-white'
        >
          결과보기
        </button>
      </div>
    </div>
  );
};
