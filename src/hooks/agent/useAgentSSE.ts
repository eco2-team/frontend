/**
 * Agent SSE 토큰 스트리밍 훅
 * - 이벤트 리스너 cleanup 관리
 * - 수동 재연결 with exponential backoff
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

const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY = 1000;

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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualDisconnectRef = useRef(false);
  const accumulatedTextRef = useRef('');

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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    cleanup();
    setIsStreaming(false);
    setCurrentStage(null);
    currentJobIdRef.current = null;
    reconnectAttemptRef.current = 0;
    accumulatedTextRef.current = '';
  }, [cleanup]);

  // Create EventSource with all listeners
  const createEventSource = useCallback((jobId: string) => {
    cleanup();

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const url = `${baseUrl}/api/v1/chat/${jobId}/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    // Progress event handler
    const handleProgress = (e: Event) => {
      try {
        const data: ProgressEvent = JSON.parse((e as MessageEvent).data);
        const stage: CurrentStage = {
          stage: data.stage,
          status: data.status,
          progress: data.progress,
          message: getStageMessage(data.stage),
        };
        setCurrentStage(stage);
        onProgressRef.current?.(stage);
      } catch (err) {
        console.error('Progress event parse error:', err);
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
        accumulatedTextRef.current += data.content;
        setStreamingText(accumulatedTextRef.current);
        onTokenRef.current?.(data.content);
      } catch (err) {
        console.error('Token parse error:', err);
      }
    });

    // Token recovery event
    es.addEventListener('token_recovery', (e) => {
      try {
        const data: TokenRecoveryEvent = JSON.parse((e as MessageEvent).data);
        accumulatedTextRef.current = data.accumulated;
        setStreamingText(data.accumulated);

        if (data.completed) {
          cleanup();
          setIsStreaming(false);
          setCurrentStage(null);
        }
      } catch (err) {
        console.error('Token recovery parse error:', err);
      }
    });

    // Done event
    es.addEventListener('done', (e) => {
      // 항상 스트리밍 종료 (파싱 실패해도)
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
        console.error('Done event parse error:', err);
      }
    });

    // Error event from server
    es.addEventListener('error', (e) => {
      const messageEvent = e as MessageEvent;

      // Check if this is a server-sent error message
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
        } catch {
          // Not a JSON error, continue to connection error handling
        }
      }

      // Connection error - attempt reconnection
      if (isManualDisconnectRef.current) {
        return;
      }

      if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptRef.current += 1;
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current - 1);

        console.warn(
          `SSE connection error. Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS})`
        );

        cleanup();
        reconnectTimeoutRef.current = setTimeout(() => {
          if (currentJobIdRef.current && !isManualDisconnectRef.current) {
            createEventSource(currentJobIdRef.current);
          }
        }, delay);
      } else {
        const err = new Error('SSE connection failed after max retries');
        setError(err);
        onErrorRef.current?.(err);
        cleanup();
        setIsStreaming(false);
        setCurrentStage(null);
      }
    });

    // Connection opened
    es.onopen = () => {
      reconnectAttemptRef.current = 0;
    };
  }, [cleanup]);

  // Connect
  const connect = useCallback(
    (jobId: string) => {
      // Reset state
      isManualDisconnectRef.current = false;
      currentJobIdRef.current = jobId;
      reconnectAttemptRef.current = 0;
      accumulatedTextRef.current = '';

      setStreamingText('');
      setCurrentStage(null);
      setError(null);
      setIsStreaming(true);

      createEventSource(jobId);
    },
    [createEventSource],
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
