import { motion } from 'framer-motion';
import RefreshIcon from '@/assets/icons/icon_refresh.svg';
import LocationActiveIcon from '@/assets/icons/my_location_active.svg';
import LocationInactiveIcon from '@/assets/icons/my_location_inactive.svg';

interface MapFloatingViewProps {
  isMyLocation: boolean;
  reSearch: boolean;
  refetchCenterLocation: () => void;
  moveToMyLocation: () => void;
}

export const MapFloatingView = ({
  isMyLocation,
  reSearch,
  refetchCenterLocation,
  moveToMyLocation,
}: MapFloatingViewProps) => {
  return (
    <motion.div
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className='max-w-app pointer-events-none absolute bottom-[calc(45%+17px)] z-50 flex w-full items-center justify-end px-6'
    >
      {reSearch && (
        <button
          onClick={refetchCenterLocation}
          className='pointer-events-auto absolute left-1/2 flex h-[33px] w-[123px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-[50px] bg-white shadow-md transition-transform active:scale-95'
          aria-label='중심 버튼'
        >
          <img src={RefreshIcon} alt='refresh' className='mr-1 h-4 w-4' />
          <p className='text-text-primary text-xs leading-5 font-medium tracking-[-0.15px]'>
            현 위치에서 검색
          </p>
        </button>
      )}

      <button
        onClick={moveToMyLocation}
        aria-label='내 위치로 이동'
        className='pointer-events-auto cursor-pointer transition-transform active:scale-95'
      >
        <img
          src={isMyLocation ? LocationActiveIcon : LocationInactiveIcon}
          alt='my_location'
          className='h-9 w-9'
        />
      </button>
    </motion.div>
  );
};
