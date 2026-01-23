import { useEffect, useState } from 'react';
import { MapService } from '@/api/services/map/map.service';
import type { LocationDetailResponse } from '@/api/services/map/map.type';
import { WasteType, type WasteTypeKey } from '@/types/MapTypes';
import SuperBinIcon from '@/assets/icons/icon_superbean_2.svg';
import ZeroWasteIcon from '@/assets/icons/icon_zerowaste_2.svg';
import CallIcon from '@/assets/icons/icon_call.svg';

interface MapDetailSheetProps {
  centerId: number | null;
  onClose: () => void;
}

export const MapDetailSheet = ({ centerId, onClose }: MapDetailSheetProps) => {
  const [detail, setDetail] = useState<LocationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!centerId) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    MapService.getLocationDetail(centerId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setIsLoading(false));
  }, [centerId]);

  if (!centerId) return null;

  const handleNavigation = () => {
    if (!detail?.latitude || !detail?.longitude) return;
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(detail.name)},${detail.latitude},${detail.longitude}`;
    window.open(url, '_blank');
  };

  const handleCall = () => {
    if (!detail?.phone) return;
    window.location.href = `tel:${detail.phone}`;
  };

  const handlePlaceUrl = () => {
    if (!detail?.place_url) return;
    window.open(detail.place_url, '_blank');
  };

  const IconSrc = detail?.source === 'keco' ? SuperBinIcon : ZeroWasteIcon;

  return (
    <div className='absolute bottom-0 left-0 right-0 z-50 animate-slide-up'>
      <div className='rounded-t-2xl border-t border-gray-200 bg-white px-5 pb-6 pt-4 shadow-xl'>
        {/* 핸들 바 */}
        <div className='mb-4 flex justify-center'>
          <div className='h-1 w-10 rounded-full bg-gray-300' />
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-primary' />
          </div>
        ) : detail ? (
          <>
            {/* 헤더 */}
            <div className='mb-4 flex items-start gap-3'>
              <img src={IconSrc} alt={detail.source} className='h-12 w-12' />
              <div className='flex-1'>
                <h3 className='text-base font-bold text-gray-900'>{detail.name}</h3>
                <p className='mt-0.5 text-xs text-gray-500'>
                  {detail.road_address || detail.lot_address}
                </p>
              </div>
              <button
                onClick={onClose}
                className='flex h-7 w-7 items-center justify-center rounded-full bg-gray-100'
              >
                <svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* 수거품목 */}
            {detail.pickup_categories.length > 0 && (
              <div className='mb-3'>
                <p className='mb-1.5 text-xs font-semibold text-gray-700'>수거품목</p>
                <div className='flex flex-wrap gap-1.5'>
                  {detail.pickup_categories.map((cat) => (
                    <span
                      key={cat}
                      className='rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-700'
                    >
                      {WasteType[cat as WasteTypeKey] || cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 수거 안내 */}
            {detail.collection_items && (
              <div className='mb-3'>
                <p className='mb-1 text-xs font-semibold text-gray-700'>수거 안내</p>
                <p className='text-xs text-gray-600'>{detail.collection_items}</p>
              </div>
            )}

            {/* 소개 */}
            {detail.introduction && (
              <div className='mb-3'>
                <p className='mb-1 text-xs font-semibold text-gray-700'>소개</p>
                <p className='text-xs text-gray-600'>{detail.introduction}</p>
              </div>
            )}

            {/* 전화번호 */}
            {detail.phone && (
              <div className='mb-4 flex items-center gap-1.5'>
                <img src={CallIcon} alt='전화' className='h-3.5 w-3.5' />
                <span className='text-xs text-gray-600'>{detail.phone}</span>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className='flex gap-2'>
              <button
                onClick={handleNavigation}
                className='flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white'
              >
                <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                </svg>
                길찾기
              </button>
              {detail.phone && (
                <button
                  onClick={handleCall}
                  className='flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700'
                >
                  <img src={CallIcon} alt='전화' className='h-4 w-4' />
                  전화
                </button>
              )}
              {detail.place_url && (
                <button
                  onClick={handlePlaceUrl}
                  className='flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700'
                >
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                  </svg>
                  상세
                </button>
              )}
            </div>
          </>
        ) : (
          <div className='py-8 text-center text-sm text-gray-500'>
            장소 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
