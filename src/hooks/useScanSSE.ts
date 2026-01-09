import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanService } from '@/api/services/scan/scan.service';
import type {
  ScanClassifyResponse,
  ScanSSEEvent,
  ScanSSEStage,
} from '@/api/services/scan/scan.type';

// SSE Stage → Loading Step 매핑
const STAGE_TO_STEP: Record<ScanSSEStage, number> = {
  queued: 0,
  vision: 1,
  rule: 2,
  answer: 3,
  reward: 3, // answer와 동일 step
  done: 4,
};

// 폴링 설정
const POLLING_INTERVAL = 2000; // 2초
const MAX_POLLING_ATTEMPTS = 60; // 최대 2분

type UseScanSSEOptions = {
  onComplete?: (result: ScanClassifyResponse) => void;
  onError?: (error: Error) => void;
};

type UseScanSSEReturn = {
  connect: (streamUrl: string, resultUrl: string) => void;
  disconnect: () => void;
  currentStep: number;
  isComplete: boolean;
  result: ScanClassifyResponse | null;
  error: Error | null;
};

/**
 * Scan SSE 이벤트 수신 훅 (폴링 Fallback 포함)
 *
 * SSE 연결 실패 시 자동으로 폴링 방식으로 전환
 */
export const useScanSSE = (options?: UseScanSSEOptions): UseScanSSEReturn => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<ScanClassifyResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);
  const resultUrlRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    // SSE 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // 폴링 정리
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingAttemptsRef.current = 0;
  }, []);

  // 폴링으로 결과 조회
  const startPolling = useCallback(
    (jobId: string) => {
      console.log('🔄 SSE 실패, 폴링 모드로 전환');

      // 단계별 시뮬레이션 (UX 개선)
      let simulatedStep = 0;
      const stepInterval = setInterval(() => {
        if (simulatedStep < 3) {
          simulatedStep++;
          setCurrentStep(simulatedStep);
        }
      }, POLLING_INTERVAL);

      pollingIntervalRef.current = setInterval(async () => {
        pollingAttemptsRef.current++;

        if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
          clearInterval(pollingIntervalRef.current!);
          clearInterval(stepInterval);
          const err = new Error('폴링 시간 초과');
          setError(err);
          options?.onError?.(err);
          return;
        }

        try {
          const scanResult = await ScanService.getScanResult(jobId);

          // 처리 완료 확인
          if (scanResult.status === 'completed' && scanResult.pipeline_result) {
            clearInterval(pollingIntervalRef.current!);
            clearInterval(stepInterval);
            setCurrentStep(4);
            setIsComplete(true);
            setResult(scanResult);
            options?.onComplete?.(scanResult);
            console.log('✅ 폴링으로 결과 수신:', scanResult);
          }
        } catch (err) {
          // 202 처리 중이면 계속 폴링
          console.log(`🔄 폴링 시도 ${pollingAttemptsRef.current}...`);
        }
      }, POLLING_INTERVAL);
    },
    [options],
  );

  const connect = useCallback(
    (streamUrl: string, resultUrl: string) => {
      // 기존 연결 정리
      disconnect();
      resultUrlRef.current = resultUrl;

      // job_id 추출
      const jobId = resultUrl.split('/').slice(-2, -1)[0] || '';

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const fullUrl = `${baseUrl}${streamUrl}`;

      console.log('🔗 SSE 연결 시도:', fullUrl);

      const eventSource = new EventSource(fullUrl, {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // SSE 연결 성공
      eventSource.onopen = () => {
        console.log('✅ SSE 연결 성공');
      };

      // SSE 메시지 핸들러 (unnamed events)
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ScanSSEEvent;
          console.log(`📨 SSE 이벤트 수신 [${data.stage}]:`, data);

          // Stage → Step 변환
          const step = STAGE_TO_STEP[data.stage] ?? 0;
          setCurrentStep(step);

          // 완료 처리
          if (data.stage === 'done') {
            console.log('🏁 SSE done 이벤트 수신, 결과 조회 시작');
            disconnect();
            // 결과 조회
            ScanService.getScanResult(jobId).then((scanResult) => {
              setIsComplete(true);
              setResult(scanResult);
              options?.onComplete?.(scanResult);
            });
          }
        } catch (err) {
          console.error('SSE 파싱 에러:', err);
        }
      };

      // 개별 이벤트 리스너 (stage별 named events)
      ['vision', 'rule', 'answer', 'reward', 'done'].forEach((stage) => {
        eventSource.addEventListener(stage, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as ScanSSEEvent;
            const step = STAGE_TO_STEP[data.stage] ?? 0;
            console.log(`📨 SSE [${stage}] 이벤트: step=${step}, progress=${data.progress ?? '-'}%`, data);
            setCurrentStep(step);

            if (data.stage === 'done') {
              console.log('🏁 SSE done 이벤트 수신, 결과 조회 시작');
              disconnect();
              ScanService.getScanResult(jobId).then((scanResult) => {
                setIsComplete(true);
                setResult(scanResult);
                options?.onComplete?.(scanResult);
              });
            }
          } catch (err) {
            console.error(`SSE ${stage} 이벤트 파싱 에러:`, err);
          }
        });
      });

      // 에러 핸들러 → 폴링으로 fallback
      eventSource.onerror = () => {
        console.warn('⚠️ SSE 연결 에러, 폴링으로 전환');
        disconnect();
        startPolling(jobId);
      };
    },
    [disconnect, options, startPolling],
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
    result,
    error,
  };
};
