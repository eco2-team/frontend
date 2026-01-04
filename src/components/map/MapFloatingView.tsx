import { motion } from 'framer-motion';
import RefreshIcon from '@/assets/icons/icon_refresh.svg';
import LocationActiveIcon from '@/assets/icons/my_location_active.svg';
import LocationInactiveIcon from '@/assets/icons/my_location_inactive.svg';
import ZeroWasteActiveIcon from '@/assets/icons/icon_zerowaste_active.svg';
import ZeroWasteInactiveIcon from '@/assets/icons/icon_zerowaste_inactive.svg';
import SuperBeanActiveIcon from '@/assets/icons/icon_superbean_active.svg';
import SuperBeanInactiveIcon from '@/assets/icons/icon_superbean_inactive.svg';
import type { SourceType, ToggleType } from '@/api/services/map/map.type';
import { TOGGLE_TRANSITION_MAP } from '@/constants/MapConfig';

interface MapFloatingViewProps {
  toggle: ToggleType;
  setToggle: (toggle: ToggleType) => void;
  isMyLocation: boolean;
  reSearch: boolean;
  refetchCenterLocation: () => void;
  moveToMyLocation: () => void;
}

export const MapFloatingView = ({
  toggle,
  setToggle,
  isMyLocation,
  reSearch,
  refetchCenterLocation,
  moveToMyLocation,
}: MapFloatingViewProps) => {
  const handleToggle = (item: 'keco' | 'zerowaste') => {
    setToggle(TOGGLE_TRANSITION_MAP[toggle][item]);
  };

  return (
    <motion.div
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className='max-w-app pointer-events-none absolute bottom-[calc(45%+17px)] z-50 flex w-full items-center justify-end px-6'
    >
      {reSearch && (
        <button
          onClick={refetchCenterLocation}
          className='pointer-events-auto absolute bottom-0 left-1/2 flex h-[33px] w-[123px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-[50px] bg-white shadow-md transition-transform active:scale-95'
          aria-label='중심 버튼'
        >
          <img src={RefreshIcon} alt='refresh' className='mr-1 h-4 w-4' />
          <p className='text-text-primary text-xs leading-5 font-medium tracking-[-0.15px]'>
            현 위치에서 검색
          </p>
        </button>
      )}

      <div className='flex flex-col gap-4.5'>
        <div className='pointer-events-auto flex cursor-pointer flex-col items-center rounded-[5px] shadow-[0_4px_4px_0_rgba(0,0,0,0.15)]'>
          <ToggleButton
            type='keco'
            active={toggle === 'all' || toggle === 'keco'}
            handleToggle={handleToggle}
          />
          <ToggleButton
            type='zerowaste'
            active={toggle === 'all' || toggle === 'zerowaste'}
            handleToggle={handleToggle}
          />
        </div>
        <button
          onClick={moveToMyLocation}
          aria-label='내 위치로 이동'
          className='pointer-events-auto cursor-pointer rounded-full shadow-[0_4px_4px_0_rgba(0,0,0,0.15)] transition-transform active:scale-95'
        >
          <img
            src={isMyLocation ? LocationActiveIcon : LocationInactiveIcon}
            alt='my_location'
            className='h-[40px] w-[40px]'
          />
        </button>
      </div>
    </motion.div>
  );
};

const ToggleButton = ({
  type,
  active,
  handleToggle,
}: {
  type: SourceType;
  active: boolean;
  handleToggle: (type: SourceType) => void;
}) => {
  const isZerowaste = type === 'zerowaste';
  const activeIcon = isZerowaste ? ZeroWasteActiveIcon : SuperBeanActiveIcon;
  const inactiveIcon = isZerowaste
    ? ZeroWasteInactiveIcon
    : SuperBeanInactiveIcon;

  const bgColor = active
    ? isZerowaste
      ? 'bg-[#FE9A00]'
      : 'bg-[#3563D1]'
    : 'bg-stroke-default';

  return (
    <button
      onClick={() => handleToggle(type)}
      className={`h-[40px] w-[40px] ${bgColor} flex items-center justify-center ${
        isZerowaste ? 'rounded-b-[5px]' : 'rounded-t-[5px]'
      }`}
    >
      <img
        src={active ? activeIcon : inactiveIcon}
        alt={type}
        className='h-[18px] w-[18px]'
      />
    </button>
  );
};
