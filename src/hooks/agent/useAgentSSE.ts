/**
 * Agent SSE 토큰 스트리밍 훅
 * - fetch + ReadableStream 기반 (PWA Service Worker 간섭 우회)
 * - 수동 재연결 with exponential backoff
 * - Safari/iOS 백그라운드 대응 (visibility change)
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
const PROGRESS_STAGES: ReadonlySet<string> = new Set([
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
]);

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

interface SSEEvent {
  event: string;
  data: string;
  id?: string;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

// 타임아웃 설정 (LLM 응답 시간 고려)
const DEFAULT_EVENT_TIMEOUT = 60000; // 60초
const IMAGE_GENERATION_TIMEOUT = 180000; // 이미지 생성은 3분

// 연결 상태 확인 주기
const HEALTH_CHECK_INTERVAL = 10000; // 10초

export const useAgentSSE = (
  options: UseAgentSSEOptions = {},
): UseAgentSSEReturn => {
  const { onToken, onProgress, onComplete, onError } = options;

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<CurrentStage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing connection state
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeoutDurationRef = useRef(DEFAULT_EVENT_TIMEOUT);
  const isManualDisconnectRef = useRef(false);
  const isConnectedRef = useRef(false);
  const accumulatedTextRef = useRef('');
  const lastEventSeqRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isConnectedRef.current = false;
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
        if (!isManualDisconnectRef.current && isConnectedRef.current) {
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

  // SSE 이벤트 처리
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      const { event: eventType, data } = event;

      if (!data) return;

      // Progress events
      if (PROGRESS_STAGES.has(eventType)) {
        try {
          const parsed: ProgressEvent = JSON.parse(data);
          console.log('[SSE] Progress:', parsed.stage, parsed.status);

          if (parsed.seq) {
            lastEventSeqRef.current = parsed.seq;
          }

          const stage: CurrentStage = {
            stage: parsed.stage,
            status: parsed.status,
            progress: parsed.progress,
            message: getStageMessage(parsed.stage),
          };
          setCurrentStage(stage);
          onProgressRef.current?.(stage);

          const timeout =
            parsed.stage === 'image_generation'
              ? IMAGE_GENERATION_TIMEOUT
              : DEFAULT_EVENT_TIMEOUT;
          resetEventTimeout(timeout);
        } catch (err) {
          console.error('[SSE] Progress parse error:', err);
        }
        return;
      }

      // Token event
      if (eventType === 'token') {
        try {
          const parsed: TokenEvent = JSON.parse(data);
          console.log('[SSE] Token:', parsed.content?.slice(0, 20));

          if (parsed.seq) {
            lastEventSeqRef.current = parsed.seq;
          }

          accumulatedTextRef.current += parsed.content;
          setStreamingText(accumulatedTextRef.current);
          onTokenRef.current?.(parsed.content);
          resetEventTimeout();
        } catch (err) {
          console.error('[SSE] Token parse error:', err);
        }
        return;
      }

      // Token recovery event
      if (eventType === 'token_recovery') {
        try {
          const parsed: TokenRecoveryEvent = JSON.parse(data);
          console.log('[SSE] Token recovery:', {
            accumulatedLength: parsed.accumulated?.length,
            lastSeq: parsed.last_seq,
            completed: parsed.completed,
          });

          accumulatedTextRef.current = parsed.accumulated;
          setStreamingText(parsed.accumulated);

          if (parsed.last_seq) {
            lastEventSeqRef.current = parsed.last_seq;
          }

          if (parsed.completed) {
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
        return;
      }

      // Done event
      if (eventType === 'done') {
        console.log('[SSE] Done event received');
        cleanup();
        setIsStreaming(false);
        setCurrentStage(null);

        try {
          const parsed: DoneEvent = JSON.parse(data);
          console.log('[SSE] Done data:', {
            status: parsed.status,
            hasResult: !!parsed.result,
          });

          if (parsed.status === 'completed') {
            onCompleteRef.current?.(parsed.result);
          } else {
            const err = new Error(parsed.message || 'Job failed');
            setError(err);
            onErrorRef.current?.(err);
          }
        } catch (err) {
          console.error('[SSE] Done parse error:', err);
        }
        return;
      }

      // Keepalive event
      if (eventType === 'keepalive') {
        console.log('[SSE] Keepalive received');
        resetEventTimeout();
        return;
      }

      // Error event from server
      if (eventType === 'error') {
        try {
          const parsed = JSON.parse(data);
          console.error('[SSE] Server error:', parsed);
          const err = new Error(parsed.message || 'SSE error');
          setError(err);
          onErrorRef.current?.(err);
          cleanup();
          setIsStreaming(false);
          setCurrentStage(null);
        } catch {
          console.error('[SSE] Unparseable error event:', data);
        }
        return;
      }
    },
    [cleanup, resetEventTimeout],
  );

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
          startFetchSSE(jobId);
        }
      }, delay);
    },
    [cleanup],
  );

  // SSE 텍스트 스트림을 파싱하여 이벤트로 변환
  const parseSSEStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>, jobId: string) => {
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[SSE] Stream ended');
            // 스트림이 정상적으로 종료되었지만 done 이벤트를 받지 못한 경우
            if (isConnectedRef.current && !isManualDisconnectRef.current) {
              attemptReconnect(jobId, 'stream ended unexpectedly');
            }
            break;
          }

          if (isManualDisconnectRef.current) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 이벤트는 빈 줄(\n\n)로 구분
          const events = buffer.split('\n\n');
          // 마지막 요소는 아직 완성되지 않은 이벤트일 수 있음
          buffer = events.pop() || '';

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;

            const sseEvent: SSEEvent = { event: 'message', data: '' };
            const lines = eventStr.split('\n');

            for (const line of lines) {
              if (line.startsWith('event:')) {
                sseEvent.event = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                sseEvent.data = line.slice(5).trim();
              } else if (line.startsWith('id:')) {
                sseEvent.id = line.slice(3).trim();
              }
            }

            if (sseEvent.data) {
              handleSSEEvent(sseEvent);
            }
          }
        }
      } catch (err) {
        if (isManualDisconnectRef.current) return;

        const isAbortError =
          err instanceof DOMException && err.name === 'AbortError';

        if (!isAbortError) {
          console.error('[SSE] Stream read error:', err);
          attemptReconnect(jobId, 'stream read error');
        }
      }
    },
    [handleSSEEvent, attemptReconnect],
  );

  // Fetch 기반 SSE 연결
  const startFetchSSE = useCallback(
    async (jobId: string) => {
      cleanup();

      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const lastSeq = lastEventSeqRef.current;
      const url = lastSeq
        ? `${baseUrl}/api/v1/chat/${jobId}/events?last_seq=${lastSeq}`
        : `${baseUrl}/api/v1/chat/${jobId}/events`;

      console.log('[SSE] Creating fetch connection:', {
        url,
        lastSeq,
        attempt: reconnectAttemptRef.current,
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Health check: 주기적으로 연결 상태 확인
      healthCheckIntervalRef.current = setInterval(() => {
        if (!isConnectedRef.current || isManualDisconnectRef.current) return;

        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
        console.log('[SSE] Health check:', {
          connected: isConnectedRef.current,
          timeSinceLastEvent: Math.round(timeSinceLastEvent / 1000) + 's',
          jobId,
        });

        if (timeSinceLastEvent > currentTimeoutDurationRef.current * 0.8) {
          console.warn('[SSE] Connection stale, attempting reconnect');
          attemptReconnect(jobId, 'connection stale');
        }
      }, HEALTH_CHECK_INTERVAL);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store', // Service Worker 캐시 우회
          signal: abortController.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported');
        }

        console.log('[SSE] Connection opened');
        isConnectedRef.current = true;
        reconnectAttemptRef.current = 0;
        resetEventTimeout(DEFAULT_EVENT_TIMEOUT);

        const reader = response.body.getReader();
        await parseSSEStream(reader, jobId);
      } catch (err) {
        if (isManualDisconnectRef.current) return;

        const isAbortError =
          err instanceof DOMException && err.name === 'AbortError';

        if (!isAbortError) {
          console.error('[SSE] Connection error:', err);
          attemptReconnect(jobId, 'fetch error');
        }
      }
    },
    [cleanup, resetEventTimeout, attemptReconnect, parseSSEStream],
  );

  // Safari/iOS 대응: visibility change 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SSE] Tab became visible');

        if (
          currentJobIdRef.current &&
          isConnectedRef.current &&
          !isManualDisconnectRef.current
        ) {
          const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;

          console.log('[SSE] Visibility check:', {
            timeSinceLastEvent: Math.round(timeSinceLastEvent / 1000) + 's',
          });

          // 30초 이상 이벤트 없으면 재연결
          if (timeSinceLastEvent > 30000) {
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

      startFetchSSE(jobId);
    },
    [startFetchSSE],
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
