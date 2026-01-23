import { useState } from 'react';
import { STORE_CATEGORIES } from '@/api/services/map/map.type';
import CloseIcon from '@/assets/icons/icon_cancel_map.svg';

interface StoreCategoryFilterHeaderProps {
  onClose: () => void;
}

export const StoreCategoryFilterHeader = ({ onClose }: StoreCategoryFilterHeaderProps) => {
  return (
    <div id='title' className='mb-3 flex items-center justify-between'>
      <h2 className='text-text-primary text-[17px] leading-6 font-semibold'>
        장소 유형 필터
      </h2>
      <button className='h-7.5 w-7.5 cursor-pointer' onClick={onClose}>
        <img src={CloseIcon} alt='close' />
      </button>
    </div>
  );
};

interface StoreCategoryFilterChildrenProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  onClose: () => void;
}

export const StoreCategoryFilterChildren = ({
  selectedCategories,
  setSelectedCategories,
  onClose,
}: StoreCategoryFilterChildrenProps) => {
  const [tempFilter, setTempFilter] = useState<string[]>(selectedCategories);

  const handleResetFilter = () => {
    setTempFilter([]);
  };

  const handleShowResult = () => {
    setSelectedCategories(tempFilter);
    onClose();
  };

  const handleToggle = (key: string) => {
    if (tempFilter.includes(key)) {
      setTempFilter(tempFilter.filter((f) => f !== key));
    } else {
      setTempFilter([...tempFilter, key]);
    }
  };

  return (
    <div className='mt-3 flex flex-col'>
      <div className='flex flex-row flex-wrap gap-2.5 gap-y-3.5'>
        {STORE_CATEGORIES.map(({ key, label }) => (
          <div
            key={key}
            onClick={() => handleToggle(key)}
            className={`cursor-pointer rounded-[50px] px-4 py-1 text-[13px] leading-7.5 font-medium ${tempFilter.includes(key) ? 'bg-brand-primary text-white' : 'text-text-primary'} border-stroke-default border`}
          >
            {label}
          </div>
        ))}
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
