/**
 * Agent 이미지 컴포넌트 (마크다운 이미지 렌더링)
 * - 라이트 테마 적용
 */

import { useState } from 'react';
import { ImageOff, X, Download, Loader2 } from 'lucide-react';

interface AgentImageProps {
  src?: string;
  alt?: string;
}

export const AgentImage = ({ src, alt }: AgentImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
          onClick={() => setIsExpanded(false)}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={() => setIsExpanded(false)}
            className='absolute right-4 top-4 rounded-full bg-white p-2 text-gray-700 shadow-lg transition-colors hover:bg-gray-100'
          >
            <X className='h-6 w-6' />
          </button>

          {/* 확대 이미지 */}
          <img
            src={src}
            alt={alt || '이미지'}
            onClick={(e) => e.stopPropagation()}
            className='max-h-[90vh] max-w-[90vw] rounded-lg object-contain'
          />

          {/* 다운로드 버튼 */}
          <a
            href={src}
            download
            onClick={(e) => e.stopPropagation()}
            className='bg-brand-primary absolute bottom-4 right-4 flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow-lg transition-colors hover:opacity-90'
          >
            <Download className='h-5 w-5' />
            <span>다운로드</span>
          </a>
        </div>
      )}
    </>
  );
};
