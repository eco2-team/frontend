import type { LocationListItemResponse } from '@/api/services/map/map.type';
import SuperBinIcon from '@/assets/icons/icon_superbean_2.svg';
import ZeroWasteIcon from '@/assets/icons/icon_zerowaste_2.svg';
import TimeIcon from '@/assets/icons/icon_time.svg';
import CallIcon from '@/assets/icons/icon_call.svg';
import RedTimeIcon from '@/assets/icons/icon_time_red.svg';
import { WasteType, type WasteTypeKey } from '@/types/MapTypes';

const ICONS: Record<string, string> = {
  keco: SuperBinIcon,
  zerowaste: ZeroWasteIcon,
  kakao: ZeroWasteIcon,
};

interface InfoItemProps {
  icon: string;
  alt: string;
  text: string | undefined;
  isRed?: boolean;
}

const InfoItem = ({ icon, alt, text, isRed }: InfoItemProps) => {
  const textColor = isRed ? 'text-[#F14950]' : '';

  return (
    text && (
      <div className='flex items-center gap-1'>
        <img src={icon} alt={alt} className='h-3 w-3' />
        <span className={textColor}>{text}</span>
      </div>
    )
  );
};

interface MapCardProps {
  location: LocationListItemResponse;
  selectedLocationId: number | null;
  setSelectedLocationId: (id: number | null) => void;
  onDetailOpen: (id: number) => void;
}

export const MapCard = ({
  location,
  selectedLocationId,
  setSelectedLocationId,
  onDetailOpen,
}: MapCardProps) => {
  const isSelected = selectedLocationId === location.id;
  const IconSrc = ICONS[location.source] ?? ZeroWasteIcon;

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dest = `${encodeURIComponent(location.name)},${location.latitude},${location.longitude}`;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://map.kakao.com/link/from/현위치,${pos.coords.latitude},${pos.coords.longitude}/to/${dest}`;
        window.open(url, '_blank');
      },
      () => {
        window.open(`https://map.kakao.com/link/to/${dest}`, '_blank');
      },
      { maximumAge: 60000, timeout: 3000 },
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected && location.source !== 'kakao') {
      onDetailOpen(location.id);
    } else {
      setSelectedLocationId(location.id);
    }
  };

  return (
    <div
      key={location.id}
      className={`cursor-pointer rounded-2xl border-2 bg-white p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-brand-primary bg-green-50 shadow-md'
          : 'hover:border-brand-primary border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className='flex items-start gap-3'>
        <div className='flex items-center justify-center'>
          <img src={IconSrc} alt={location.source} className='h-12 w-12' />
        </div>

        <div className='flex flex-1 flex-col gap-3'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-text-primary mb-[3px] text-[15px] leading-6 font-semibold tracking-tight'>
                {location.name}
              </p>
              <p className='text-text-secondary text-xs'>
                {location.road_address}
              </p>
            </div>
            <span className='shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700'>
              {location.distance_text}
            </span>
          </div>

          {location.pickup_categories && location.source === 'keco' && (
            <div className='text-text-primary text-xs leading-4'>
              <span className='mr-1.5 font-medium'>수거품목</span>
              <span>
                {location.pickup_categories
                  .map((item) => WasteType[item as WasteTypeKey])
                  .join('\u2219')}
              </span>
            </div>
          )}

          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4 text-xs text-gray-500'>
              {location.source === 'keco' && location.is_holiday && (
                <InfoItem
                  icon={location.is_holiday ? RedTimeIcon : TimeIcon}
                  text={
                    location.is_holiday
                      ? '오늘 휴무'
                      : `${location.start_time} ~ ${location.end_time}`
                  }
                  alt='운영 시간'
                  isRed={location.is_holiday}
                />
              )}
              <InfoItem icon={CallIcon} text={location.phone} alt='전화번호' />
            </div>

            {/* 길찾기 버튼 */}
            <button
              onClick={handleNavigation}
              className='flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary'
            >
              <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
              길찾기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
