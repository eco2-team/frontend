import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';

const BLANK_AREA = '32px';
const VELOCITY_THRESHOLD = 500; // 속도 임계값 : 500 이상이면 빠른 스와이프로 판단
const OFFSET_THRESHOLD = 50; // 이동 거리 임계값 : 실수로 살짝 움직인 것 방지

interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  initialHeight?: number; // 초기 높이 (%, 기본값: 60)
  minHeight?: number; // 최소 높이 (%, 0이면 완전히 닫을 수 있음, 기본값: initialHeight)
  maxHeight?: number; // 최대 높이 (%, 기본값: 90)
  snapPoints?: number[]; // 스냅 포인트들 (%, 예: [60, 90])
  isFullScreen?: boolean;
  onClick?: () => void; // BottomSheet 클릭 시 호출
}

export const BottomSheet = ({
  isOpen,
  onClose,
  header,
  children,
  initialHeight = 45,
  minHeight = initialHeight,
  maxHeight = 90,
  snapPoints = [45, 90],
  isFullScreen = false,
  onClick,
}: BottomSheetProps) => {
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [currentHeight, setCurrentHeight] = useState(initialHeight);

  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const closable = minHeight === 0;

  // 전체 화면 높이 (100% = 전체 viewport 높이)
  const getViewportHeight = useCallback(() => {
    const safeAreaTopValue = getComputedStyle(
      document.documentElement,
    ).getPropertyValue('--safe-area-top');

    const safeAreaTop = parseFloat(safeAreaTopValue) || 0;

    const bottomNavHeightValue = getComputedStyle(
      document.documentElement,
    ).getPropertyValue('--height-bottom-nav');
    const bottomNavHeight = parseFloat(bottomNavHeightValue) || 0;

    const root = document.getElementById('root');
    const rootHeight = root?.clientHeight ?? window.innerHeight;

    return rootHeight - (isFullScreen ? 0 : safeAreaTop) - bottomNavHeight;
  }, [isFullScreen]);

  // 높이를 픽셀로 변환 (전체 화면 높이 기준)
  const percentToPixels = useCallback(
    (percent: number) => {
      return (getViewportHeight() * percent) / 100;
    },
    [getViewportHeight],
  );

  // 픽셀을 높이 퍼센트로 변환 (전체 화면 높이 기준)
  const pixelsToPercent = useCallback(
    (pixels: number) => {
      return (pixels / getViewportHeight()) * 100;
    },
    [getViewportHeight],
  );

  useEffect(() => {
    if (!isOpen) {
      controls.start({
        bottom: -percentToPixels(maxHeight),
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      });
      return;
    }

    const targetHeight = Math.max(initialHeight, minHeight);
    const targetPixels = percentToPixels(targetHeight);

    controls.start({
      bottom: 0,
      height: targetPixels,
      transition: { type: 'spring', damping: 30, stiffness: 300 },
    });
    setCurrentHeight(targetHeight);
  }, [isOpen, initialHeight, minHeight, controls, percentToPixels, maxHeight]);

  const findClosestSnapPoint = useCallback(
    (height: number) => {
      const validPoints = snapPoints.filter((point) => point >= minHeight);
      return validPoints.reduce((closest, point) =>
        Math.abs(point - height) < Math.abs(closest - height) ? point : closest,
      );
    },
    [minHeight, snapPoints],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = percentToPixels(currentHeight);

    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      const deltaY = startY.current - e.clientY;
      const newHeightPixels = Math.max(
        percentToPixels(minHeight),
        Math.min(percentToPixels(maxHeight), startHeight.current + deltaY),
      );

      const newHeightPercent = pixelsToPercent(newHeightPixels);
      setCurrentHeight(newHeightPercent);
      controls.set({ height: newHeightPixels });
    },
    [
      isDragging,
      minHeight,
      maxHeight,
      percentToPixels,
      pixelsToPercent,
      controls,
    ],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      setIsDragging(false);
      document.body.style.userSelect = '';

      const deltaY = startY.current - e.clientY;
      const velocity = Math.abs(deltaY);

      if (
        closable &&
        deltaY < -OFFSET_THRESHOLD &&
        velocity > VELOCITY_THRESHOLD
      ) {
        // 빠른 속도로 아래로 드래그하면 닫기
        onClose?.();
        return;
      }

      if (
        closable &&
        currentHeight < minHeight + (snapPoints[0] - minHeight) * 0.5
      ) {
        // 최소 높이보다 낮으면 닫기
        onClose?.();
        return;
      }

      // 가장 가까운 스냅 포인트로 이동
      const targetHeight = findClosestSnapPoint(currentHeight);
      const targetPixels = percentToPixels(targetHeight);

      controls.start({
        height: targetPixels,
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      });
      setCurrentHeight(targetHeight);
    },
    [
      isDragging,
      closable,
      currentHeight,
      minHeight,
      snapPoints,
      onClose,
      findClosestSnapPoint,
      percentToPixels,
      controls,
    ],
  );

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleContentTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget;
    const isScrollable = target.scrollHeight > target.clientHeight;

    if (isScrollable) {
      e.stopPropagation();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      ref={sheetRef}
      animate={controls}
      initial={{ bottom: -percentToPixels(maxHeight) }}
      className='max-w-app absolute bottom-0 z-1000 flex w-full touch-none flex-col rounded-t-4xl bg-white shadow-2xl'
      style={{ height: percentToPixels(initialHeight) }}
      onClick={onClick}
    >
      {/* 드래그 핸들 */}
      <div
        ref={handleRef}
        className='flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-[14px] active:cursor-grabbing'
        onPointerDown={handlePointerDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='h-1.5 w-12 rounded-full bg-gray-300' />
      </div>

      <div className='px-6'>{header}</div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div
        ref={contentRef}
        className='no-scrollbar flex-1 overflow-y-auto overscroll-contain px-6'
        onTouchStart={handleContentTouchStart}
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: BLANK_AREA,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
};
