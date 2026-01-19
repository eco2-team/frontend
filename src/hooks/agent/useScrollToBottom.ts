/**
 * 스크롤 하단 이동 훅
 * - Throttle 적용으로 성능 최적화
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseScrollToBottomReturn {
  /** 컨테이너 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 스크롤 버튼 표시 여부 */
  showScrollButton: boolean;
  /** 하단으로 스크롤 */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** 현재 하단에 있는지 여부 */
  isAtBottom: boolean;
}

const THROTTLE_MS = 100;

/**
 * 스크롤 하단 이동 훅
 * @param threshold 하단 판정 임계값 (px)
 */
export const useScrollToBottom = (threshold = 100): UseScrollToBottomReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Throttle을 위한 refs
  const lastCallRef = useRef(0);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 스크롤 위치 체크 (실제 로직)
  const checkScrollImpl = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setShowScrollButton(distanceFromBottom > threshold);
    setIsAtBottom(distanceFromBottom <= threshold);
  }, [threshold]);

  // Throttled 스크롤 체크
  const checkScroll = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;

    if (elapsed >= THROTTLE_MS) {
      lastCallRef.current = now;
      checkScrollImpl();
    } else if (!scheduledRef.current) {
      // 다음 실행 예약
      scheduledRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        scheduledRef.current = null;
        checkScrollImpl();
      }, THROTTLE_MS - elapsed);
    }
  }, [checkScrollImpl]);

  // 하단으로 스크롤
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return;

    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior,
    });
  }, []);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', checkScroll);
      // 예약된 타이머 정리
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
        scheduledRef.current = null;
      }
    };
  }, [checkScroll]);

  return {
    containerRef,
    showScrollButton,
    scrollToBottom,
    isAtBottom,
  };
};
