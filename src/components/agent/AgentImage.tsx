/**
 * Agent 이미지 컴포넌트 (마크다운 이미지 렌더링)
 * - 라이트 테마 적용
 * - 길게 누르면 다운로드 옵션 표시
 */

import { useState, useRef, useCallback } from 'react';
import { ImageOff, Download, Loader2 } from 'lucide-react';

interface AgentImageProps {
  src?: string;
  alt?: string;
}

const LONG_PRESS_DURATION = 500; // ms

export const AgentImage = ({ src, alt }: AgentImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // Long press 감지
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowDownload(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    // 길게 눌러서 다운로드 버튼이 떴다면 클릭 무시
    if (isLongPress.current) {
      e.stopPropagation();
      return;
    }
  }, []);

  if (!src) return null;

  // 에러 상태
  if (hasError) {
    return (
      <div className='text-text-inactive my-2 flex items-center gap-2 rounded-lg bg-gray-100 p-3'>
        <ImageOff className='h-5 w-5' />
        <span className='text-sm'>이미지를 불러올 수 없습니다</span>
      </div>
    );
  }

  return (
    <>
      {/* 인라인 이미지 */}
      <div className='my-2'>
        {isLoading && (
          <div className='text-text-inactive flex h-48 w-full items-center justify-center rounded-lg bg-gray-100'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        )}
        <img
          src={src}
          alt={alt || '이미지'}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onClick={() => setIsExpanded(true)}
          className={`max-h-96 max-w-full cursor-zoom-in rounded-lg object-contain ${
            isLoading ? 'hidden' : 'block'
          }`}
        />
        {alt && !isLoading && (
          <p className='text-text-inactive mt-1 text-center text-xs'>{alt}</p>
        )}
      </div>

      {/* 확대 모달 */}
      {isExpanded && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'
          onClick={() => {
            setIsExpanded(false);
            setShowDownload(false);
          }}
        >
          {/* 확대 이미지 (길게 누르면 다운로드 옵션) */}
          <div className='relative'>
            <img
              src={src}
              alt={alt || '이미지'}
              onClick={handleImageClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className='max-h-[90vh] max-w-[90vw] rounded-lg object-contain select-none'
              draggable={false}
            />

            {/* 다운로드 버튼 (길게 누르면 표시) */}
            {showDownload && (
              <a
                href={src}
                download
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDownload(false);
                  setIsExpanded(false);
                }}
                className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-xl bg-white/90 px-6 py-4 text-gray-700 shadow-lg backdrop-blur-sm transition-all'
              >
                <Download className='h-8 w-8' />
                <span className='text-sm font-medium'>저장</span>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};
