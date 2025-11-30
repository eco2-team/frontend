import type { LocationListItemResponse } from '@/api/services/map/map.type';
import SuperBinIcon from '@/assets/icons/icon_superbean_2.svg';
import ZeroWasteIcon from '@/assets/icons/icon_zerowaste_2.svg';
import TimeIcon from '@/assets/icons/icon_time.svg';
import CallIcon from '@/assets/icons/icon_call.svg';
import RedTimeIcon from '@/assets/icons/icon_time_red.svg';

const ICONS = {
  keco: SuperBinIcon,
  zerowaste: ZeroWasteIcon,
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
}

export const MapCard = ({
  location,
  selectedLocationId,
  setSelectedLocationId,
}: MapCardProps) => {
  const isSelected = selectedLocationId === location.id;
  const IconSrc = ICONS[location.source] ?? ZeroWasteIcon;

  return (
    <div
      key={location.id}
      className={`cursor-pointer rounded-2xl border-2 bg-white p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-brand-primary bg-green-50 shadow-md'
          : 'hover:border-brand-primary border-gray-200'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedLocationId(location.id);
      }}
    >
      <div className='flex items-start gap-3'>
        <div className='flex items-center justify-center'>
          <img src={IconSrc} alt={location.source} className='h-12 w-12' />
        </div>

        <div className='flex-1'>
          <div className='mb-2.5 flex items-start justify-between'>
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

          {location.pickup_categories && (
            <div className='text-text-primary mb-3 text-xs leading-4'>
              <span className='mr-1.5 font-medium'>수거품목</span>
              <span>{location.pickup_categories.join('∙')}</span>
            </div>
          )}

          <div className='flex items-center gap-4 text-xs text-gray-500'>
            {location.is_open ? (
              <InfoItem
                icon={TimeIcon}
                text={`${location.start_time} ~ ${location.end_time}`}
                alt='운영 시간'
              />
            ) : (
              <InfoItem
                icon={RedTimeIcon}
                text='오늘 휴무'
                alt='운영 시간'
                isRed={true}
              />
            )}
            <InfoItem icon={CallIcon} text={location.phone} alt='전화번호' />
          </div>
        </div>
      </div>
    </div>
  );
};
