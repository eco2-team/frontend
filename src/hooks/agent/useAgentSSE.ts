/**
 * Agent SSE 토큰 스트리밍 훅
 * - 이벤트 리스너 cleanup 관리
 * - 수동 재연결 with exponential backoff
 * - Safari 백그라운드 대응 (visibility change, readyState 모니터링)
 * - Last-Event-ID 기반 복구 (token_recovery)
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
}

interface UseAgentSSEReturn {
  streamingText: string;
  isStreaming: boolean;
  currentStage: CurrentStage | null;
  error: Error | null;
  connect: (jobId: string) => void;
  disconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5; // 3 → 5로 증가
const INITIAL_RECONNECT_DELAY = 1000;

// 타임아웃 설정 (LLM 응답 시간 고려)
const DEFAULT_EVENT_TIMEOUT = 60000; // 60초
const IMAGE_GENERATION_TIMEOUT = 180000; // 이미지 생성은 3분 (2분 → 3분)

// Safari 대응: 연결 상태 확인 주기
const HEALTH_CHECK_INTERVAL = 10000; // 10초마다 readyState 확인

export const useAgentSSE = (
  options: UseAgentSSEOptions = {},
): UseAgentSSEReturn => {
  const { onToken, onProgress, onComplete, onError } = options;

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<CurrentStage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing connection state
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const currentTimeoutDurationRef = useRef(DEFAULT_EVENT_TIMEOUT);
  const isManualDisconnectRef = useRef(false);
  const accumulatedTextRef = useRef('');
  const lastEventSeqRef = useRef<number | null>(null); // Last-Event-ID 추적
  const lastEventTimeRef = useRef<number>(Date.now()); // 마지막 이벤트 시간

  // Callback refs to avoid stale closures
  const onTokenRef = useRef(onToken);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onToken, onProgress, onComplete, onError]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[SSE] Cleanup called');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
      eventTimeoutRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // 이벤트 타임아웃 리셋 (이벤트 받을 때마다 호출)
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
          console.error(
            '[SSE] Event timeout - no events received for',
            timeoutDuration / 1000,
            'seconds',
          );
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
    reconnectAttemptRef.current = 0;
    accumulatedTextRef.current = '';
    lastEventSeqRef.current = null;
  }, [cleanup]);

  // 재연결 시도
  const attemptReconnect = useCallback(
    (jobId: string, reason: string) => {
      if (isManualDisconnectRef.current) {
        console.log('[SSE] Skipping reconnect - manual disconnect');
        return;
      }

      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[SSE] Max reconnect attempts reached');
        const err = new Error('연결 재시도 횟수 초과');
        setError(err);
        onErrorRef.current?.(err);
        cleanup();
        setIsStreaming(false);
        setCurrentStage(null);
        return;
      }

      reconnectAttemptRef.current += 1;
      const delay =
        INITIAL_RECONNECT_DELAY *
        Math.pow(2, reconnectAttemptRef.current - 1);

      console.warn(
        `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS}) - reason: ${reason}`,
      );

      cleanup();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isManualDisconnectRef.current) {
          // createEventSource는 아래에서 정의됨
          createEventSourceFn(jobId);
        }
      }, delay);
    },
    [cleanup],
  );

  // Create EventSource with all listeners
  const createEventSourceFn = useCallback(
    (jobId: string) => {
      cleanup();

      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      // Last-Event-ID를 URL 파라미터로 전달 (서버에서 token_recovery 지원)
      const lastSeq = lastEventSeqRef.current;
      const url = lastSeq
        ? `${baseUrl}/api/v1/chat/${jobId}/events?last_seq=${lastSeq}`
        : `${baseUrl}/api/v1/chat/${jobId}/events`;

      console.log('[SSE] Creating EventSource:', {
        url,
        lastSeq,
        attempt: reconnectAttemptRef.current,
      });

      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      // Safari 대응: readyState 주기적 모니터링
      healthCheckIntervalRef.current = setInterval(() => {
        if (!eventSourceRef.current || isManualDisconnectRef.current) {
          return;
        }

        const readyState = eventSourceRef.current.readyState;
        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;

        console.log('[SSE] Health check:', {
          readyState: ['CONNECTING', 'OPEN', 'CLOSED'][readyState],
          timeSinceLastEvent: Math.round(timeSinceLastEvent / 1000) + 's',
          jobId,
        });

        // CLOSED 상태이거나, OPEN인데 오래동안 이벤트가 없으면 재연결
        if (readyState === EventSource.CLOSED) {
          console.warn('[SSE] Connection closed, attempting reconnect');
          attemptReconnect(jobId, 'readyState CLOSED');
        } else if (
          readyState === EventSource.OPEN &&
          timeSinceLastEvent > currentTimeoutDurationRef.current * 0.8
        ) {
          console.warn('[SSE] Connection stale, attempting reconnect');
          attemptReconnect(jobId, 'connection stale');
        }
      }, HEALTH_CHECK_INTERVAL);

      // Progress event handler
      const handleProgress = (e: Event) => {
        try {
          const data: ProgressEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Progress:', data.stage, data.status);

          // seq 추적
          if (data.seq) {
            lastEventSeqRef.current = data.seq;
          }

          const stage: CurrentStage = {
            stage: data.stage,
            status: data.status,
            progress: data.progress,
            message: getStageMessage(data.stage),
          };
          setCurrentStage(stage);
          onProgressRef.current?.(stage);

          // 이미지 생성은 타임아웃 더 길게
          const timeout =
            data.stage === 'image_generation'
              ? IMAGE_GENERATION_TIMEOUT
              : DEFAULT_EVENT_TIMEOUT;
          resetEventTimeout(timeout);
        } catch (err) {
          console.error('[SSE] Progress parse error:', err);
        }
      };

      // Register progress event listeners
      PROGRESS_STAGES.forEach((stage) => {
        es.addEventListener(stage, handleProgress);
      });

      // Token event
      es.addEventListener('token', (e) => {
        try {
          const data: TokenEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Token:', data.content?.slice(0, 20));

          // seq 추적
          if (data.seq) {
            lastEventSeqRef.current = data.seq;
          }

          accumulatedTextRef.current += data.content;
          setStreamingText(accumulatedTextRef.current);
          onTokenRef.current?.(data.content);
          resetEventTimeout();
        } catch (err) {
          console.error('[SSE] Token parse error:', err);
        }
      });

      // Token recovery event (재연결 시 누락된 토큰 복구)
      es.addEventListener('token_recovery', (e) => {
        try {
          const data: TokenRecoveryEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Token recovery:', {
            accumulatedLength: data.accumulated?.length,
            lastSeq: data.last_seq,
            completed: data.completed,
          });

          accumulatedTextRef.current = data.accumulated;
          setStreamingText(data.accumulated);

          if (data.last_seq) {
            lastEventSeqRef.current = data.last_seq;
          }

          if (data.completed) {
            console.log('[SSE] Token recovery completed - closing connection');
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

      // Done event
      es.addEventListener('done', (e) => {
        console.log('[SSE] Done event received');
        cleanup();
        setIsStreaming(false);
        setCurrentStage(null);

        try {
          const data: DoneEvent = JSON.parse((e as MessageEvent).data);
          console.log('[SSE] Done data:', {
            status: data.status,
            hasResult: !!data.result,
          });

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

      // Keepalive event
      es.addEventListener('keepalive', () => {
        console.log('[SSE] Keepalive received');
        resetEventTimeout();
      });

      // Error event
      es.addEventListener('error', (e) => {
        const messageEvent = e as MessageEvent;
        console.error('[SSE] Error event:', {
          hasData: !!messageEvent.data,
          readyState: es.readyState,
        });

        // Server-sent error message
        if (messageEvent.data) {
          try {
            const data = JSON.parse(messageEvent.data);
            console.error('[SSE] Server error:', data);
            const err = new Error(data.message || 'SSE error');
            setError(err);
            onErrorRef.current?.(err);
            cleanup();
            setIsStreaming(false);
            setCurrentStage(null);
            return;
          } catch {
            // Not JSON, continue to connection error handling
          }
        }

        // Connection error - attempt reconnection
        if (!isManualDisconnectRef.current) {
          attemptReconnect(jobId, 'error event');
        }
      });

      // Connection opened
      es.onopen = () => {
        console.log('[SSE] Connection opened');
        reconnectAttemptRef.current = 0; // 성공 시 재시도 카운터 리셋
        resetEventTimeout(DEFAULT_EVENT_TIMEOUT);
      };
    },
    [cleanup, resetEventTimeout, attemptReconnect],
  );

  // Safari 대응: visibility change 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SSE] Tab became visible');

        // 스트리밍 중이고 연결이 있으면 상태 확인
        if (
          currentJobIdRef.current &&
          eventSourceRef.current &&
          !isManualDisconnectRef.current
        ) {
          const readyState = eventSourceRef.current.readyState;
          const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;

          console.log('[SSE] Visibility check:', {
            readyState: ['CONNECTING', 'OPEN', 'CLOSED'][readyState],
            timeSinceLastEvent: Math.round(timeSinceLastEvent / 1000) + 's',
          });

          // CLOSED이거나 오래된 연결이면 재연결
          if (
            readyState === EventSource.CLOSED ||
            timeSinceLastEvent > 30000 // 30초 이상 이벤트 없으면
          ) {
            console.warn('[SSE] Reconnecting after visibility change');
            attemptReconnect(currentJobIdRef.current, 'visibility change');
          }
        }
      } else {
        console.log('[SSE] Tab became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptReconnect]);

  // Connect
  const connect = useCallback(
    (jobId: string) => {
      console.log('[SSE] Connect called:', jobId);

      // Reset state
      isManualDisconnectRef.current = false;
      currentJobIdRef.current = jobId;
      reconnectAttemptRef.current = 0;
      accumulatedTextRef.current = '';
      lastEventSeqRef.current = null;
      lastEventTimeRef.current = Date.now();

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
