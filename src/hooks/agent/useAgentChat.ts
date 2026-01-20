/**
 * Agent 채팅 통합 훅
 * - Race condition 방지 (isSendingRef)
 * - 언마운트 후 상태 업데이트 방지
 * - 모델 선택 지원
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
import { useAgentSSE } from './useAgentSSE';
import { useAgentLocation } from './useAgentLocation';
import { useImageUpload } from './useImageUpload';

interface UseAgentChatOptions {
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
  const { onMessageComplete, onError } = options;

  // 상태
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSummary | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Race condition 방지를 위한 refs
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(true);
  const currentChatRef = useRef<ChatSummary | null>(null);

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

      // Assistant 메시지 추가
      const assistantMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      onMessageComplete?.(result);
    },
    [onMessageComplete],
  );

  // SSE 에러 콜백
  const handleSSEError = useCallback(
    (err: Error) => {
      if (!isMountedRef.current) return;

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

      try {
        // 채팅이 없으면 새로 생성 (ref 사용으로 최신 값 보장)
        let chatId = currentChatRef.current?.id;
        if (!chatId) {
          const newChat = await createNewChat();
          chatId = newChat.id;
        }

        // 이미지 업로드 (직접 전달된 imageUrl이 없을 때만)
        let finalImageUrl = imageUrl;
        if (!finalImageUrl && selectedImage) {
          finalImageUrl = (await uploadImage()) ?? undefined;
          clearImage();
        }

        if (!isMountedRef.current) return;

        // User 메시지 추가
        const userMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: message,
          created_at: new Date().toISOString(),
          image_url: finalImageUrl,
        };
        setMessages((prev) => [...prev, userMessage]);

        // 요청 데이터 구성
        const requestData: SendMessageRequest = {
          message,
          image_url: finalImageUrl,
          user_location: userLocation,
          model: selectedModel.id,
        };
        console.log('[DEBUG] sendMessage request:', {
          chatId,
          message,
          user_location: userLocation,
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
      userLocation,
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
      const messageIndex = messages.findIndex((m) => m.id === messageId);
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
      await sendMessageInternal(lastUserMessage.content, lastUserMessage.image_url);
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
  }, []);

  // 채팅 메시지 로드 (채팅 선택 시)
  const loadChatMessages = useCallback(async (chatId: string) => {
    // 이전 채팅 상태 초기화 (중요: API 호출 전에 리셋)
    setMessages([]);
    setHasMoreHistory(false);
    setHistoryCursor(null);
    setIsLoadingHistory(true);
    setError(null);

    try {
      const response = await AgentService.getChatDetail(chatId, {
        limit: 20,
      });
      // 백엔드가 오래된 순(ASC)으로 반환
      setMessages(response.messages);
      setHasMoreHistory(response.has_more);
      setHistoryCursor(response.next_cursor);
    } catch (err) {
      const loadError =
        err instanceof Error ? err : new Error('Failed to load messages');
      setError(loadError);
      onError?.(loadError);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [onError]);

  // 이전 메시지 더 로드 (위로 스크롤 시)
  const loadMoreMessages = useCallback(async () => {
    if (!currentChat?.id || !hasMoreHistory || isLoadingHistory) return;

    setIsLoadingHistory(true);

    try {
      const response = await AgentService.getChatDetail(currentChat.id, {
        limit: 20,
        cursor: historyCursor ?? undefined,
      });

      // 백엔드가 오래된 순(ASC)으로 반환하므로 앞에 추가
      setMessages((prev) => [...response.messages, ...prev]);
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
  }, [currentChat?.id, hasMoreHistory, isLoadingHistory, historyCursor, onError]);

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
