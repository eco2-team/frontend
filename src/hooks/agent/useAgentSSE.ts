/**
 * Agent SSE 토큰 스트리밍 훅
 * - EventSource 기반 (iOS Safari PWA 호환)
 * - 네이티브 Last-Event-ID 복구 (브라우저 자동 재연결 시 헤더 전송)
 * - Safari 백그라운드 대응 (visibility change, health check)
 * - Stale 감지 콜백 (polling fallback 연동)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  CurrentStage,
  DoneEvent,
  ProgressEvent,
  StageType,
  TokenEvent,
  TokenRecoveryEvent,
} from '@/api/services/agent';

/** Stage별 한글 메시지 매핑 */
const STAGE_MESSAGES: Partial<Record<StageType, string>> = {
  queued: '대기 중...',
  intent: '질문 분석 중...',
  vision: '이미지 분석 중...',
  waste_rag: '분리배출 정보 검색 중...',
  character: '캐릭터 정보 확인 중...',
  location: '위치 검색 중...',
  bulk_waste: '대형폐기물 정보 확인 중...',
  weather: '날씨 정보 확인 중...',
  collection_point: '수거함 위치 검색 중...',
  recyclable_price: '재활용 시세 확인 중...',
  web_search: '웹 검색 중...',
  image_generation: '이미지 생성 중...',
  general: '답변 준비 중...',
  aggregator: '정보 정리 중...',
  summarize: '내용 요약 중...',
  answer: '답변 작성 중...',
  done: '완료',
};

const getStageMessage = (stage: StageType): string => {
  return STAGE_MESSAGES[stage] ?? '처리 중...';
};

/** Progress 이벤트를 받을 stage 목록 */
const PROGRESS_STAGES = [
  'queued',
  'intent',
  'vision',
  'waste_rag',
  'character',
  'location',
  'bulk_waste',
  'weather',
  'collection_point',
  'recyclable_price',
  'web_search',
  'image_generation',
  'general',
  'aggregator',
  'summarize',
  'answer',
] as const;

interface UseAgentSSEOptions {
  onToken?: (token: string) => void;
  onProgress?: (stage: CurrentStage) => void;
  onComplete?: (result: DoneEvent['result']) => void;
  onError?: (error: Error) => void;
  /** SSE 연결은 되었지만 meaningful 이벤트를 받지 못할 때 콜백 (polling fallback 트리거) */
  onStale?: (jobId: string) => void;
}

interface UseAgentSSEReturn {
  streamingText: string;
  isStreaming: boolean;
  currentStage: CurrentStage | null;
  error: Error | null;
  connect: (jobId: string) => void;
  disconnect: () => void;
}

// 네이티브 EventSource 자동 재연결 시 연속 에러 최대 허용 횟수
const MAX_CONSECUTIVE_ERRORS = 5;

// 타임아웃 설정
const DEFAULT_EVENT_TIMEOUT = 60000; // 60초
const IMAGE_GENERATION_TIMEOUT = 180000; // 3분

// 연결 상태 확인 주기
const HEALTH_CHECK_INTERVAL = 10000; // 10초

// Stale 감지: meaningful 이벤트 없이 이 시간이 지나면 onStale 호출
const STALE_THRESHOLD = 25000; // 25초

export const useAgentSSE = (
  options: UseAgentSSEOptions = {},
): UseAgentSSEReturn => {
  const { onToken, onProgress, onComplete, onError, onStale } = options;

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<CurrentStage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTimeoutDurationRef = useRef(DEFAULT_EVENT_TIMEOUT);
  const isManualDisconnectRef = useRef(false);
  const accumulatedTextRef = useRef('');
  const lastEventTimeRef = useRef<number>(Date.now());
  const receivedMeaningfulEventRef = useRef(false);

  // Callback refs
  const onTokenRef = useRef(onToken);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onStaleRef = useRef(onStale);

  useEffect(() => {
    onTokenRef.current = onToken;
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onStaleRef.current = onStale;
  }, [onToken, onProgress, onComplete, onError, onStale]);

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[SSE] Cleanup called');
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
      eventTimeoutRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (staleTimeoutRef.current) {
      clearTimeout(staleTimeoutRef.current);
      staleTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // 이벤트 타임아웃 리셋
  const resetEventTimeout = useCallback(
    (duration?: number) => {
      if (eventTimeoutRef.current) {
        clearTimeout(eventTimeoutRef.current);
      }

      const timeoutDuration = duration ?? currentTimeoutDurationRef.current;
      currentTimeoutDurationRef.current = timeoutDuration;
      lastEventTimeRef.current = Date.now();

      eventTimeoutRef.current = setTimeout(() => {
        if (!isManualDisconnectRef.current && eventSourceRef.current) {
          console.error('[SSE] Event timeout -', timeoutDuration / 1000, 's');
          const err = new Error('서버 응답 타임아웃');
          setError(err);
          onErrorRef.current?.(err);
          cleanup();
          setIsStreaming(false);
          setCurrentStage(null);
        }
      }, timeoutDuration);
    },
    [cleanup],
  );

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('[SSE] Manual disconnect');
    isManualDisconnectRef.current = true;
    cleanup();
    setIsStreaming(false);
    setCurrentStage(null);
    currentJobIdRef.current = null;
    consecutiveErrorsRef.current = 0;
    accumulatedTextRef.current = '';
    receivedMeaningfulEventRef.current = false;
  }, [cleanup]);

  // Create EventSource (네이티브 Last-Event-ID 활용)
  const createEventSourceFn = useCallback(
    (jobId: string) => {
      cleanup();

      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const url = `${baseUrl}/api/v1/chat/${jobId}/events`;

      console.log('[SSE] Creating EventSource:', { url });

      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      // Stale 감지 타이머 (meaningful 이벤트 없으면 polling fallback 트리거)
      if (!receivedMeaningfulEventRef.current) {
        staleTimeoutRef.current = setTimeout(() => {
          if (!receivedMeaningfulEventRef.current && !isManualDisconnectRef.current) {
            console.warn('[SSE] Stale - no meaningful events received, triggering fallback');
            onStaleRef.current?.(jobId);
          }
        }, STALE_THRESHOLD);
      }

      // Health check (EventSource 자동 재연결 실패 시 감지)
      healthCheckIntervalRef.current = setInterval(() => {
        if (!eventSourceRef.current || isManualDisconnectRef.current) return;

        const readyState = eventSourceRef.current.readyState;
        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;

        console.log('[SSE] Health check:', {
          readyState: ['CONNECTING', 'OPEN', 'CLOSED'][readyState],
          timeSinceLastEvent: Math.round(timeSinceLastEvent / 1000) + 's',
          hasMeaningfulEvent: receivedMeaningfulEventRef.current,
          consecutiveErrors: consecutiveErrorsRef.current,
          jobId,
        });

        // EventSource가 CLOSED 상태면 자동 재연결 실패한 것 → 포기
        if (readyState === EventSource.CLOSED) {
          console.error('[SSE] EventSource CLOSED - auto-reconnect failed');
          const err = new Error('SSE 연결 실패');
          setError(err);
          onErrorRef.current?.(err);
          cleanup();
          setIsStreaming(false);
          setCurrentStage(null);
        }
      }, HEALTH_CHECK_INTERVAL);

      // Meaningful 이벤트 수신 마킹 헬퍼
      const markMeaningful = () => {
        receivedMeaningfulEventRef.current = true;
        consecutiveErrorsRef.current = 0;
        if (staleTimeoutRef.current) {
          clearTimeout(staleTimeoutRef.current);
          staleTimeoutRef.current = null;
        }
      };

      // Progress events
      const handleProgress = (e: Event) => {
        try {
          const data: ProgressEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Progress:', data.stage, data.status);

          markMeaningful();

          const stage: CurrentStage = {
            stage: data.stage,
            status: data.status,
            progress: data.progress,
            message: getStageMessage(data.stage),
          };
          setCurrentStage(stage);
          onProgressRef.current?.(stage);

          const timeout =
            data.stage === 'image_generation'
              ? IMAGE_GENERATION_TIMEOUT
              : DEFAULT_EVENT_TIMEOUT;
          resetEventTimeout(timeout);
        } catch (err) {
          console.error('[SSE] Progress parse error:', err);
        }
      };

      PROGRESS_STAGES.forEach((stage) => {
        es.addEventListener(stage, handleProgress);
      });

      // Token
      es.addEventListener('token', (e) => {
        try {
          const data: TokenEvent = JSON.parse((e as MessageEvent).data);
          markMeaningful();

          accumulatedTextRef.current += data.content;
          setStreamingText(accumulatedTextRef.current);
          onTokenRef.current?.(data.content);
          resetEventTimeout();
        } catch (err) {
          console.error('[SSE] Token parse error:', err);
        }
      });

      // Token recovery (재연결 시 서버가 Last-Event-ID 기반으로 누적 텍스트 전송)
      es.addEventListener('token_recovery', (e) => {
        try {
          const data: TokenRecoveryEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Token recovery:', {
            accumulatedLength: data.accumulated?.length,
            completed: data.completed,
          });

          markMeaningful();
          accumulatedTextRef.current = data.accumulated;
          setStreamingText(data.accumulated);

          if (data.completed) {
            cleanup();
            setIsStreaming(false);
            setCurrentStage(null);
          } else {
            resetEventTimeout();
          }
        } catch (err) {
          console.error('[SSE] Token recovery parse error:', err);
        }
      });

      // Done
      es.addEventListener('done', (e) => {
        console.log('[SSE] Done event received');
        markMeaningful();
        cleanup();
        setIsStreaming(false);
        setCurrentStage(null);

        try {
          const data: DoneEvent = JSON.parse((e as MessageEvent).data);
          if (data.status === 'completed') {
            onCompleteRef.current?.(data.result);
          } else {
            const err = new Error(data.message || 'Job failed');
            setError(err);
            onErrorRef.current?.(err);
          }
        } catch (err) {
          console.error('[SSE] Done parse error:', err);
        }
      });

      // Keepalive
      es.addEventListener('keepalive', () => {
        console.log('[SSE] Keepalive received');
        consecutiveErrorsRef.current = 0;
        resetEventTimeout();
      });

      // Error: 네이티브 EventSource 자동 재연결에 맡김
      // 서버 에러(data 있음)만 fatal 처리, 네트워크 에러는 브라우저가 Last-Event-ID로 복구
      es.addEventListener('error', (e) => {
        const messageEvent = e as MessageEvent;

        // 서버가 보낸 에러 이벤트 (fatal)
        if (messageEvent.data) {
          try {
            const data = JSON.parse(messageEvent.data);
            const err = new Error(data.message || 'SSE error');
            setError(err);
            onErrorRef.current?.(err);
            cleanup();
            setIsStreaming(false);
            setCurrentStage(null);
            return;
          } catch { /* Not JSON */ }
        }

        // 네트워크 에러: EventSource가 자동 재연결 (Last-Event-ID 헤더 포함)
        consecutiveErrorsRef.current += 1;
        console.warn('[SSE] Network error, auto-reconnecting...', {
          consecutiveErrors: consecutiveErrorsRef.current,
          readyState: es.readyState,
        });

        // 연속 에러가 너무 많으면 포기
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          console.error('[SSE] Too many consecutive errors, giving up');
          const err = new Error('연결 재시도 횟수 초과');
          setError(err);
          onErrorRef.current?.(err);
          cleanup();
          setIsStreaming(false);
          setCurrentStage(null);
        }
      });

      es.onopen = () => {
        console.log('[SSE] Connection opened');
        consecutiveErrorsRef.current = 0;
        resetEventTimeout(DEFAULT_EVENT_TIMEOUT);
      };
    },
    [cleanup, resetEventTimeout],
  );

  // Visibility change: 백그라운드 복귀 시 EventSource 상태 확인
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (
          currentJobIdRef.current &&
          eventSourceRef.current &&
          !isManualDisconnectRef.current
        ) {
          const readyState = eventSourceRef.current.readyState;
          console.log('[SSE] Visibility restored, readyState:', readyState);

          // EventSource가 CLOSED면 자동 재연결 실패한 것 → 새로 생성
          if (readyState === EventSource.CLOSED) {
            console.warn('[SSE] Reconnecting after visibility change (CLOSED)');
            createEventSourceFn(currentJobIdRef.current);
          }
          // CONNECTING이면 자동 재연결 진행 중 → 대기
          // OPEN이면 정상 → 아무것도 안함
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [createEventSourceFn]);

  // Connect
  const connect = useCallback(
    (jobId: string) => {
      console.log('[SSE] Connect called:', jobId);

      isManualDisconnectRef.current = false;
      currentJobIdRef.current = jobId;
      consecutiveErrorsRef.current = 0;
      accumulatedTextRef.current = '';
      lastEventTimeRef.current = Date.now();
      receivedMeaningfulEventRef.current = false;

      setStreamingText('');
      setCurrentStage(null);
      setError(null);
      setIsStreaming(true);

      createEventSourceFn(jobId);
    },
    [createEventSourceFn],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManualDisconnectRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return {
    streamingText,
    isStreaming,
    currentStage,
    error,
    connect,
    disconnect,
  };
};
