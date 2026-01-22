/**
 * Agent 채팅 통합 훅
 * - Optimistic Update 지원 (client_id, status 추적)
 * - Reconcile 방식 데이터 병합
 * - Race condition 방지 (isSendingRef)
 * - 실패 시 롤백/상태 변경
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService } from '@/api/services/agent';
import type {
  AgentMessage,
  ChatSummary,
  CurrentStage,
  DoneEvent,
  ModelOption,
  SendMessageRequest,
} from '@/api/services/agent';
import { DEFAULT_MODEL } from '@/api/services/agent';
import {
  createUserMessage,
  createAssistantMessage,
  updateMessageStatus,
  updateMessageInList,
  reconcileMessages,
  serverToClientMessage,
} from '@/utils/message';
import { messageDB } from '@/db/messageDB';
import { useAgentSSE } from './useAgentSSE';
import { useAgentLocation } from './useAgentLocation';
import { useImageUpload } from './useImageUpload';
import { useMessagePersistence } from './useMessagePersistence';

interface UseAgentChatOptions {
  userId?: string; // User ID for IndexedDB isolation (optional, falls back to 'default')
  onMessageComplete?: (result: DoneEvent['result']) => void;
  onError?: (error: Error) => void;
}

interface UseAgentChatReturn {
  // 상태
  messages: AgentMessage[];
  streamingText: string;
  isStreaming: boolean;
  currentStage: CurrentStage | null;
  isLoading: boolean;
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  error: Error | null;

  // 현재 채팅
  currentChat: ChatSummary | null;
  setCurrentChat: (chat: ChatSummary | null) => void;

  // 모델 선택
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;

  // 메시지 액션
  sendMessage: (message: string, imageUrl?: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  stopGeneration: () => void;
  loadMoreMessages: () => Promise<void>;

  // 이미지
  selectedImage: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  selectImage: (file: File | null) => void;
  clearImage: () => void;
  uploadImage: () => Promise<string | null>;

  // 위치
  userLocation: ReturnType<typeof useAgentLocation>['userLocation'];
  locationPermission: ReturnType<typeof useAgentLocation>['permissionStatus'];

  // 채팅 관리
  createNewChat: () => Promise<ChatSummary>;
  loadChatMessages: (chatId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useAgentChat = (
  options: UseAgentChatOptions = {},
): UseAgentChatReturn => {
  const { userId = 'default', onMessageComplete, onError } = options;

  // 상태
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSummary | null>(null);
  const [selectedModel, setSelectedModel] =
    useState<ModelOption>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Race condition 방지를 위한 refs
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(true);
  const currentChatRef = useRef<ChatSummary | null>(null);
  // 현재 전송 중인 user 메시지 client_id 추적
  const pendingUserMessageIdRef = useRef<string | null>(null);
  // 메시지 전송 시점의 chatId 추적 (세션 전환 시 올바른 채팅에 저장)
  const pendingChatIdRef = useRef<string | null>(null);
  // 위치 정보 ref (최신 값 보장)
  const userLocationRef =
    useRef<ReturnType<typeof useAgentLocation>['userLocation']>(undefined);

  // currentChat 동기화
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  // 언마운트 감지
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 위치
  const { userLocation, permissionStatus: locationPermission } =
    useAgentLocation();

  // 위치 정보 동기화 (ref로 최신 값 보장)
  useEffect(() => {
    userLocationRef.current = userLocation;
    console.log('[DEBUG] userLocation updated:', userLocation);
  }, [userLocation]);

  // IndexedDB 자동 저장 (500ms throttle + 1분 cleanup, user_id 격리)
  useMessagePersistence(userId, currentChat?.id || null, messages);

  // 이미지
  const {
    selectedImage,
    previewUrl,
    isUploading,
    selectImage,
    uploadImage,
    clearImage,
  } = useImageUpload();

  // Polling fallback refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingMessageCountRef = useRef<number>(0);
  // SSE 재연결 시도 횟수 (stale 시 1회 재연결 후 polling)
  const sseReconnectAttemptRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // SSE 완료 콜백
  const handleSSEComplete = useCallback(
    (result: DoneEvent['result']) => {
      if (!isMountedRef.current) return;
      stopPolling(); // SSE 정상 완료 시 polling 중지

      // 메시지가 전송된 원래 chatId
      const originalChatId = pendingChatIdRef.current;
      // 현재 보고 있는 chatId
      const currentChatId = currentChatRef.current?.id;
      // 세션이 전환되었는지 확인
      const isSameSession = originalChatId === currentChatId;

      console.log('[SSE Complete] Session check:', {
        originalChatId,
        currentChatId,
        isSameSession,
      });

      // Assistant 메시지 생성 (committed 상태)
      const assistantMessage = createAssistantMessage(result.answer);
      assistantMessage.status = 'committed';
      if (result.persistence?.assistant_message) {
        assistantMessage.server_id = result.persistence.assistant_message;
        assistantMessage.id = result.persistence.assistant_message;
      }
      if (result.persistence?.assistant_message_created_at) {
        assistantMessage.created_at =
          result.persistence.assistant_message_created_at;
      }

      // IndexedDB에 원래 chatId로 저장 (세션 전환과 무관하게)
      if (originalChatId) {
        // User 메시지 상태 업데이트
        if (pendingUserMessageIdRef.current) {
          messageDB
            .updateMessageStatus(
              pendingUserMessageIdRef.current,
              'committed',
              result.persistence?.user_message,
            )
            .catch(console.error);
        }

        // Assistant 메시지 저장
        messageDB
          .saveMessages(userId, originalChatId, [assistantMessage])
          .catch(console.error);
      }

      // 같은 세션일 때만 UI 업데이트
      if (isSameSession) {
        setMessages((prev) => {
          let updated = prev;

          // User 메시지를 committed로 업데이트 (서버 ID 매핑)
          if (pendingUserMessageIdRef.current) {
            const userServerId = result.persistence?.user_message;
            updated = updateMessageInList(
              updated,
              pendingUserMessageIdRef.current,
              (msg) => updateMessageStatus(msg, 'committed', userServerId),
            );
          }

          // Assistant created_at이 user보다 이전이면 보정 (클라이언트-서버 시계 차이 대응)
          if (pendingUserMessageIdRef.current) {
            const userMsg = updated.find(
              (m) => m.client_id === pendingUserMessageIdRef.current,
            );
            if (userMsg) {
              const userTs = new Date(userMsg.created_at).getTime();
              const assistantTs = new Date(assistantMessage.created_at).getTime();
              if (assistantTs <= userTs) {
                assistantMessage.created_at = new Date(userTs + 1).toISOString();
              }
            }
          }

          return [...updated, assistantMessage];
        });
      } else {
        console.log(
          '[SSE Complete] Session changed, skipping UI update. Message saved to IndexedDB.',
        );
      }

      // refs 정리
      pendingUserMessageIdRef.current = null;
      pendingChatIdRef.current = null;

      onMessageComplete?.(result);
    },
    [userId, onMessageComplete, stopPolling],
  );

  // SSE 에러 콜백
  const handleSSEError = useCallback(
    (err: Error) => {
      if (!isMountedRef.current) return;

      // Pending 메시지를 failed로 변경
      if (pendingUserMessageIdRef.current) {
        setMessages((prev) =>
          updateMessageInList(prev, pendingUserMessageIdRef.current!, (msg) =>
            updateMessageStatus(msg, 'failed'),
          ),
        );
        pendingUserMessageIdRef.current = null;
      }
      pendingChatIdRef.current = null;

      setError(err);
      onError?.(err);
    },
    [onError],
  );

  // SSE stale 시: 1회 재연결 시도 → 실패 시 polling fallback
  const handleSSEStale = useCallback(
    (jobId: string) => {
      const chatId = pendingChatIdRef.current;
      if (!chatId) return;

      // 최대 3회 SSE 재연결 시도 (gateway State catch-up 기대)
      const MAX_SSE_RECONNECTS = 3;
      if (sseReconnectAttemptRef.current < MAX_SSE_RECONNECTS) {
        sseReconnectAttemptRef.current += 1;
        console.log(`[SSE] Stale - reconnecting (attempt ${sseReconnectAttemptRef.current}/${MAX_SSE_RECONNECTS})`, { jobId });
        connectSSERef.current?.(jobId);
        return;
      }

      // 재연결 모두 실패: polling fallback
      console.log('[Polling] SSE stale after reconnect, starting polling fallback', { jobId, chatId });
      pollingMessageCountRef.current = messages.length;

      // 3초마다 getChatDetail 폴링
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await AgentService.getChatDetail(chatId, { limit: 5 });
          const lastMsg = response.messages[response.messages.length - 1];

          // 새 assistant 메시지가 있으면 완료 처리
          if (lastMsg && lastMsg.role === 'assistant') {
            console.log('[Polling] Found assistant message via polling');
            stopPolling();

            // SSE 해제
            stopGenerationRef.current?.();

            // handleSSEComplete과 동일한 처리
            const assistantMessage = createAssistantMessage(lastMsg.content);
            assistantMessage.status = 'committed';
            assistantMessage.server_id = lastMsg.id;
            assistantMessage.id = lastMsg.id;
            assistantMessage.created_at = lastMsg.created_at;

            const originalChatId = pendingChatIdRef.current;
            const currentChatId = currentChatRef.current?.id;
            const isSameSession = originalChatId === currentChatId;

            if (originalChatId) {
              messageDB
                .saveMessages(userId, originalChatId, [assistantMessage])
                .catch(console.error);
            }

            if (isSameSession) {
              setMessages((prev) => {
                let updated = prev;
                if (pendingUserMessageIdRef.current) {
                  updated = updateMessageInList(
                    updated,
                    pendingUserMessageIdRef.current,
                    (msg) => updateMessageStatus(msg, 'committed'),
                  );
                }
                return [...updated, assistantMessage];
              });
            }

            pendingUserMessageIdRef.current = null;
            pendingChatIdRef.current = null;
          }
        } catch (err) {
          console.error('[Polling] Failed to poll chat detail:', err);
        }
      }, 3000);

      // 최대 120초 후 폴링 중단
      setTimeout(() => {
        if (pollingIntervalRef.current) {
          console.warn('[Polling] Max polling duration reached');
          stopPolling();
        }
      }, 120000);
    },
    [messages.length, userId, stopPolling],
  );

  // SSE 함수 refs (circular dependency 방지)
  const stopGenerationRef = useRef<(() => void) | null>(null);
  const connectSSERef = useRef<((jobId: string) => void) | null>(null);

  // SSE
  const {
    streamingText,
    isStreaming,
    currentStage,
    connect: connectSSE,
    disconnect: stopGeneration,
  } = useAgentSSE({
    onComplete: handleSSEComplete,
    onError: handleSSEError,
    onStale: handleSSEStale,
  });

  // SSE 함수 ref 동기화
  useEffect(() => {
    stopGenerationRef.current = stopGeneration;
    connectSSERef.current = connectSSE;
  }, [stopGeneration, connectSSE]);

  // 새 채팅 생성
  const createNewChat = useCallback(async (): Promise<ChatSummary> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await AgentService.createChat();
      const newChat: ChatSummary = {
        id: response.id,
        title: response.title,
        preview: null,
        message_count: 0,
        last_message_at: null,
        created_at: response.created_at,
      };
      setCurrentChat(newChat);
      setMessages([]);
      return newChat;
    } catch (err) {
      const createError =
        err instanceof Error ? err : new Error('Failed to create chat');
      setError(createError);
      throw createError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 메시지 전송 (내부용 - 이미지 URL 직접 전달 가능)
  const sendMessageInternal = useCallback(
    async (message: string, imageUrl?: string) => {
      if (!message.trim() && !imageUrl && !selectedImage) return;

      // Race condition 방지
      if (isSendingRef.current) return;
      isSendingRef.current = true;

      if (!isMountedRef.current) return;
      setIsLoading(true);
      setError(null);

      // User 메시지 생성 (Optimistic - pending 상태)
      let finalImageUrl = imageUrl;

      try {
        // 채팅이 없으면 새로 생성 (ref 사용으로 최신 값 보장)
        let chatId = currentChatRef.current?.id;
        if (!chatId) {
          const newChat = await createNewChat();
          chatId = newChat.id;
        }

        // 원래 chatId 저장 (세션 전환 시에도 올바른 채팅에 저장하기 위함)
        pendingChatIdRef.current = chatId;

        // 이미지 업로드 (직접 전달된 imageUrl이 없을 때만)
        console.log('[DEBUG] Image upload check:', {
          hasImageUrl: !!finalImageUrl,
          hasSelectedImage: !!selectedImage,
        });
        if (!finalImageUrl && selectedImage) {
          console.log('[DEBUG] Uploading image...');
          finalImageUrl = (await uploadImage()) ?? undefined;
          console.log('[DEBUG] Image uploaded:', finalImageUrl);
          clearImage();
        }

        if (!isMountedRef.current) return;

        // 이미지만 전송 시 기본 프롬프트 추가
        const effectiveMessage =
          !message.trim() && finalImageUrl
            ? '이 이미지 분류해줘'
            : message;

        // User 메시지 추가 (Optimistic Update)
        const userMessage = createUserMessage(effectiveMessage, finalImageUrl);
        pendingUserMessageIdRef.current = userMessage.client_id;
        setMessages((prev) => [...prev, userMessage]);

        // 요청 데이터 구성 (ref에서 최신 위치 정보 가져옴)
        const currentLocation = userLocationRef.current;
        const requestData: SendMessageRequest = {
          message: effectiveMessage,
          image_url: finalImageUrl || undefined, // 빈 문자열 → undefined (Backend HttpUrl validation)
          user_location: currentLocation,
          model: selectedModel.id,
        };
        console.log('[DEBUG] sendMessage request:', {
          chatId,
          message,
          client_id: userMessage.client_id,
          image_url: finalImageUrl,  // 이미지 URL 디버깅용
          user_location: currentLocation,
          model: selectedModel.id,
        });

        // 메시지 전송
        const response = await AgentService.sendMessage(chatId, requestData);
        console.log('[DEBUG] sendMessage response:', response);

        if (!isMountedRef.current) return;

        // SSE 연결
        console.log('[DEBUG] Connecting to SSE with job_id:', response.job_id);
        sseReconnectAttemptRef.current = 0;
        connectSSE(response.job_id);
      } catch (err) {
        if (!isMountedRef.current) return;

        // 실패 시 메시지를 failed 상태로 변경
        if (pendingUserMessageIdRef.current) {
          setMessages((prev) =>
            updateMessageInList(prev, pendingUserMessageIdRef.current!, (msg) =>
              updateMessageStatus(msg, 'failed'),
            ),
          );
          pendingUserMessageIdRef.current = null;
        }
        pendingChatIdRef.current = null;

        const sendError =
          err instanceof Error ? err : new Error('Failed to send message');
        setError(sendError);
        onError?.(sendError);
      } finally {
        isSendingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      selectedImage,
      selectedModel,
      createNewChat,
      uploadImage,
      clearImage,
      connectSSE,
      onError,
    ],
  );

  // 메시지 전송 (외부 API)
  // imageUrl: AgentInputBar에서 업로드 후 직접 전달된 CDN URL
  const sendMessage = useCallback(
    async (message: string, imageUrl?: string) => {
      await sendMessageInternal(message, imageUrl);
    },
    [sendMessageInternal],
  );

  // 메시지 재생성
  const regenerateMessage = useCallback(
    async (messageId: string) => {
      // 해당 메시지 이전의 마지막 user 메시지 찾기
      const messageIndex = messages.findIndex(
        (m) => m.id === messageId || m.client_id === messageId,
      );
      if (messageIndex === -1) return;

      // 이전 user 메시지 찾기
      let lastUserMessage: AgentMessage | null = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessage = messages[i];
          break;
        }
      }

      if (!lastUserMessage) return;

      // 해당 assistant 메시지 이후 삭제
      setMessages((prev) => prev.slice(0, messageIndex));

      // 재전송 (이미지 URL 포함)
      await sendMessageInternal(
        lastUserMessage.content,
        lastUserMessage.image_url || undefined, // 빈 문자열 → undefined
      );
    },
    [messages, sendMessageInternal],
  );

  // 메시지 초기화
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentChat(null);
    setError(null);
    setHasMoreHistory(false);
    setHistoryCursor(null);
    pendingUserMessageIdRef.current = null;
    pendingChatIdRef.current = null;
  }, []);

  // 채팅 메시지 로드 (채팅 선택 시) - IndexedDB 우선 + Reconcile
  const loadChatMessages = useCallback(
    async (chatId: string) => {
      // Session 전환 시 기존 SSE 연결 정리 (다른 세션의 typing indicator 방지)
      stopGeneration();

      // 즉시 messages 초기화 (이전 세션 메시지가 새 세션에 저장되는 것 방지)
      setMessages([]);
      setIsLoadingHistory(true);
      setError(null);

      try {
        // 1. IndexedDB에서 먼저 로드 (즉시 표시, user_id 격리)
        const localMessages = await messageDB.getMessages(userId, chatId);
        if (localMessages.length > 0) {
          console.log(
            `[IndexedDB] Loaded ${localMessages.length} messages from cache (user: ${userId})`,
          );
          setMessages(localMessages);
        }

        // 2. 서버 조회 (백그라운드)
        const response = await AgentService.getChatDetail(chatId, {
          limit: 20,
        });

        // 3. Reconcile: 로컬 + 서버 병합
        setMessages((prev) => {
          const currentChatId = currentChatRef.current?.id;

          // 다른 채팅으로 전환: 서버 데이터만
          if (currentChatId !== chatId) {
            return response.messages.map(serverToClientMessage);
          }

          // 같은 채팅: reconcile (로컬 pending + committed 30초 유지)
          const merged = reconcileMessages(
            prev.length > 0 ? prev : localMessages,
            response.messages,
            { committedRetentionMs: 30000 },
          );

          return merged;
        });

        setHasMoreHistory(response.has_more);
        setHistoryCursor(response.next_cursor);
      } catch (err) {
        console.error('[loadChatMessages] Server fetch failed:', err);
        // 에러 시 IndexedDB 데이터 유지
        const loadError =
          err instanceof Error ? err : new Error('Failed to load messages');
        setError(loadError);
        onError?.(loadError);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [userId, stopGeneration, onError],
  );

  // 이전 메시지 더 로드 (위로 스크롤 시) - 단순 append+dedup
  const loadMoreMessages = useCallback(async () => {
    if (!currentChat?.id || !hasMoreHistory || isLoadingHistory) return;

    setIsLoadingHistory(true);

    try {
      const response = await AgentService.getChatDetail(currentChat.id, {
        limit: 20,
        cursor: historyCursor ?? undefined,
      });

      // 기존 메시지 유지 + 서버에서 받은 이전 메시지 중 중복 아닌 것만 추가
      setMessages((prev) => {
        const existingIds = new Set(
          prev.flatMap((m) => [m.server_id, m.client_id, m.id].filter(Boolean)),
        );

        const newMessages = response.messages
          .filter((sm) => !existingIds.has(sm.id))
          .map(serverToClientMessage);

        if (newMessages.length === 0) return prev;

        const merged = [...newMessages, ...prev];
        // 시간순 정렬 (안정 정렬)
        merged.sort((a, b) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return ta - tb;
        });
        return merged;
      });

      setHasMoreHistory(response.has_more);
      setHistoryCursor(response.next_cursor);
    } catch (err) {
      const loadError =
        err instanceof Error ? err : new Error('Failed to load more messages');
      setError(loadError);
      onError?.(loadError);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [
    currentChat?.id,
    hasMoreHistory,
    isLoadingHistory,
    historyCursor,
    onError,
  ]);

  return {
    // 상태
    messages,
    streamingText,
    isStreaming,
    currentStage,
    isLoading,
    isLoadingHistory,
    hasMoreHistory,
    error,

    // 현재 채팅
    currentChat,
    setCurrentChat,

    // 모델 선택
    selectedModel,
    setSelectedModel,

    // 메시지 액션
    sendMessage,
    regenerateMessage,
    stopGeneration,
    loadMoreMessages,

    // 이미지
    selectedImage,
    previewUrl,
    isUploading,
    selectImage,
    clearImage,
    uploadImage,

    // 위치
    userLocation,
    locationPermission,

    // 채팅 관리
    createNewChat,
    loadChatMessages,
    clearMessages,
  };
};
