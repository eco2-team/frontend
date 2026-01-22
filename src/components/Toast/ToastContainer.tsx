import { useState, useEffect, useRef, useCallback } from 'react';
import SuccessIcon from '@/assets/icons/icon_toast_fin.svg';
import ErrorIcon from '@/assets/icons/icon_toast_cancel.svg';
import { setToastFn, setDismissToastFn, type ToastProps } from './toast';

/**
 * 애니메이션 점 컴포넌트 (. → .. → ... → . 순환)
 */
const AnimatedDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return <span>{'.'.repeat(dotCount)}</span>;
};

export const ToastContainer = () => {
  const [currentToast, setCurrentToast] = useState<ToastProps | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 토스트 dismiss
  const dismissToast = useCallback((id: string) => {
    setCurrentToast((prev) => {
      if (prev?.id === id) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return null;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    setToastFn((props: ToastProps) => {
      // 이전 타이머 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setCurrentToast(props);

      // loading 타입이 아니면 3초 후 자동 닫기
      if (props.type !== 'loading') {
        timeoutRef.current = setTimeout(() => setCurrentToast(null), 3000);
      }
    });

    setDismissToastFn(dismissToast);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dismissToast]);

  if (!currentToast) return null;

  // 아이콘 선택 (loading은 별도 처리)
  const getIcon = () => {
    if (currentToast.type === 'success') return SuccessIcon;
    if (currentToast.type === 'error') return ErrorIcon;
    return null; // loading은 스피너 사용
  };

  const Icon = getIcon();

  return (
    <div className='fixed top-[calc(var(--safe-area-top)+4px)] right-0 left-0 z-50 flex justify-center'>
      <div className='animate-slide-down flex items-center gap-5 rounded-[10px] bg-black/80 px-5 py-3 shadow-lg'>
        {currentToast.type === 'loading' ? (
          // 로딩 스피너
          <div className='h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent' />
        ) : (
          Icon && <img src={Icon} alt={currentToast.type} className='h-6 w-6' />
        )}
        <span className='text-xs leading-5 font-medium tracking-[-0.15px] whitespace-pre-line text-white'>
          {currentToast.message}
          {currentToast.type === 'loading' && <AnimatedDots />}
        </span>
      </div>
    </div>
  );
};
