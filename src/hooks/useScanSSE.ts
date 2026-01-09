import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanSSEEvent, ScanSSEStage } from '@/api/services/scan/scan.type';

// SSE Stage → Loading Step 매핑
const STAGE_TO_STEP: Record<ScanSSEStage, number> = {
  queued: 0,
  vision: 1,
  rule: 2,
  answer: 3,
  reward: 3, // answer와 동일 step
  done: 4,
};

type UseScanSSEOptions = {
  onComplete?: (event: ScanSSEEvent) => void;
  onError?: (error: Error) => void;
};

type UseScanSSEReturn = {
  connect: (streamUrl: string) => void;
  disconnect: () => void;
  currentStep: number;
  isComplete: boolean;
  error: Error | null;
};

/**
 * Scan SSE 이벤트 수신 훅
 *
 * @example
 * const { connect, currentStep, isComplete } = useScanSSE({
 *   onComplete: (event) => console.log('완료:', event),
 * });
 *
 * // POST /scan 후 stream_url로 연결
 * connect('/api/v1/scan/{job_id}/events');
 */
export const useScanSSE = (options?: UseScanSSEOptions): UseScanSSEReturn => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventRef = useRef<ScanSSEEvent | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (streamUrl: string) => {
      // 기존 연결 정리
      disconnect();

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const fullUrl = `${baseUrl}${streamUrl}`;

      const eventSource = new EventSource(fullUrl, {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // SSE 메시지 핸들러
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ScanSSEEvent;
          lastEventRef.current = data;

          // Stage → Step 변환
          const step = STAGE_TO_STEP[data.stage] ?? 0;
          setCurrentStep(step);

          // 완료 처리
          if (data.stage === 'done') {
            setIsComplete(true);
            options?.onComplete?.(data);
            disconnect();
          }
        } catch (err) {
          console.error('SSE 파싱 에러:', err);
        }
      };

      // 에러 핸들러
      eventSource.onerror = (event) => {
        console.error('SSE 연결 에러:', event);
        const err = new Error('SSE 연결 실패');
        setError(err);
        options?.onError?.(err);
        disconnect();
      };
    },
    [disconnect, options],
  );

  // 컴포넌트 언마운트 시 연결 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    currentStep,
    isComplete,
    error,
  };
};

