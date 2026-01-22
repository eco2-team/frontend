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
  sendMessage: (message: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  stopGeneration: () => void;
  loadMoreMessages: () => Promise<void>;

  // 이미지
  selectedImage: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  selectImage: (file: File | null) => void;
  clearImage: () => void;

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

  // SSE 완료 콜백
  const handleSSEComplete = useCallback(
    (result: DoneEvent['result']) => {
      if (!isMountedRef.current) return;

      setMessages((prev) => {
        let updated = prev;

        // 1. User 메시지를 committed로 업데이트 (서버 ID 매핑)
        if (pendingUserMessageIdRef.current) {
          updated = updateMessageInList(
            updated,
            pendingUserMessageIdRef.current,
            (msg) => updateMessageStatus(msg, 'committed'),
          );

          // IndexedDB 동기화
          if (currentChatRef.current?.id) {
            messageDB
              .updateMessageStatus(
                pendingUserMessageIdRef.current,
                'committed',
                result.persistence?.user_message,
              )
              .catch(console.error);
          }

          pendingUserMessageIdRef.current = null;
        }

        // 2. Assistant 메시지 추가 (committed 상태)
        const assistantMessage = createAssistantMessage(result.answer);
        assistantMessage.status = 'committed';
        // 서버에서 온 persistence 정보로 서버 ID 설정
        if (result.persistence?.assistant_message) {
          assistantMessage.server_id = result.persistence.assistant_message;
          assistantMessage.id = result.persistence.assistant_message;
        }
        if (result.persistence?.assistant_message_created_at) {
          assistantMessage.created_at =
            result.persistence.assistant_message_created_at;
        }

        return [...updated, assistantMessage];
      });

      onMessageComplete?.(result);
    },
    [onMessageComplete],
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

      setError(err);
      onError?.(err);
    },
    [onError],
  );

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
  });

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

        // 이미지 업로드 (직접 전달된 imageUrl이 없을 때만)
        if (!finalImageUrl && selectedImage) {
          finalImageUrl = (await uploadImage()) ?? undefined;
          clearImage();
        }

        if (!isMountedRef.current) return;

        // User 메시지 추가 (Optimistic Update)
        const userMessage = createUserMessage(message, finalImageUrl);
        pendingUserMessageIdRef.current = userMessage.client_id;
        setMessages((prev) => [...prev, userMessage]);

        // 요청 데이터 구성 (ref에서 최신 위치 정보 가져옴)
        const currentLocation = userLocationRef.current;
        const requestData: SendMessageRequest = {
          message,
          image_url: finalImageUrl || undefined, // 빈 문자열 → undefined (Backend HttpUrl validation)
          user_location: currentLocation,
          model: selectedModel.id,
        };
        console.log('[DEBUG] sendMessage request:', {
          chatId,
          message,
          client_id: userMessage.client_id,
          user_location: currentLocation,
          model: selectedModel.id,
        });

        // 메시지 전송
        const response = await AgentService.sendMessage(chatId, requestData);
        console.log('[DEBUG] sendMessage response:', response);

        if (!isMountedRef.current) return;

        // SSE 연결
        console.log('[DEBUG] Connecting to SSE with job_id:', response.job_id);
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
  const sendMessage = useCallback(
    async (message: string) => {
      await sendMessageInternal(message);
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
  }, []);

  // 채팅 메시지 로드 (채팅 선택 시) - IndexedDB 우선 + Reconcile
  const loadChatMessages = useCallback(
    async (chatId: string) => {
      // Session 전환 시 기존 SSE 연결 정리 (다른 세션의 typing indicator 방지)
      stopGeneration();

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

  // 이전 메시지 더 로드 (위로 스크롤 시) - Reconcile 적용
  const loadMoreMessages = useCallback(async () => {
    if (!currentChat?.id || !hasMoreHistory || isLoadingHistory) return;

    setIsLoadingHistory(true);

    try {
      const response = await AgentService.getChatDetail(currentChat.id, {
        limit: 20,
        cursor: historyCursor ?? undefined,
      });

      // Reconcile로 병합 (로컬 pending/committed 유지)
      setMessages((prev) =>
        reconcileMessages(prev, response.messages, {
          committedRetentionMs: 30000,
        }),
      );

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

    // 위치
    userLocation,
    locationPermission,

    // 채팅 관리
    createNewChat,
    loadChatMessages,
    clearMessages,
  };
};
