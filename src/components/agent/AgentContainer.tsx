/**
 * Agent 메인 컨테이너
 * - 사이드바 + 라이트 테마 메인 영역
 * - 메시지 큐 지원 (스트리밍 중 입력 메시지 대기)
 * - 모델 선택 지원
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentService } from '@/api/services/agent';
import type { ChatSummary } from '@/api/services/agent';
import { stripMarkdown } from '@/utils/stripMarkdown';
import { useAgentChat, useMessageQueue } from '@/hooks/agent';
import type { QueuedMessage } from '@/hooks/agent/useMessageQueue';
import { AgentSidebar } from './sidebar';
import { AgentMessageList } from './AgentMessageList';
import { AgentInputBar } from './AgentInputBar';
import { AgentMessageQueue } from './AgentMessageQueue';

export const AgentContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  // 이전 스트리밍 상태 추적 (큐 처리용)
  const wasStreamingRef = useRef(false);

  // Agent 채팅 훅
  const {
    messages,
    streamingText,
    isStreaming,
    currentStage,
    isLoading,
    isLoadingHistory,
    hasMoreHistory,
    currentChat,
    setCurrentChat,
    selectedModel,
    setSelectedModel,
    sendMessage,
    regenerateMessage,
    stopGeneration,
    loadMoreMessages,
    selectedImage,
    previewUrl,
    isUploading,
    selectImage,
    clearImage,
    createNewChat,
    loadChatMessages,
    clearMessages,
  } = useAgentChat();

  // 메시지 큐
  const { queuedMessages, enqueue, remove, dequeue } = useMessageQueue();

  // 대화 삭제 뮤테이션
  const deleteChatMutation = useMutation({
    mutationFn: AgentService.deleteChat,
    onSuccess: (_, deletedChatId) => {
      // 현재 선택된 대화가 삭제된 경우 초기화
      if (currentChat?.id === deletedChatId) {
        clearMessages();
      }
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['agent', 'chats'] });
    },
  });

  // 스트리밍 종료 시 큐에서 다음 메시지 전송
  useEffect(() => {
    // 스트리밍이 끝났고, 큐에 메시지가 있을 때
    if (wasStreamingRef.current && !isStreaming && !isLoading) {
      const nextMessage = dequeue();
      if (nextMessage) {
        // TODO: 이미지 URL이 있을 경우 sendMessage에 전달하는 방법 필요
        // 현재는 텍스트만 전송
        sendMessage(nextMessage.content);
      }
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, isLoading, dequeue, sendMessage]);

  // 메시지 전송 핸들러 (스트리밍 중이면 큐에 추가)
  const handleSend = useCallback(
    (message: string) => {
      if (isStreaming || isLoading) {
        // 스트리밍 중이면 큐에 추가
        const imageUrl = previewUrl ?? undefined;
        enqueue(message, imageUrl);
        clearImage(); // 이미지 선택 해제
      } else {
        // 바로 전송
        sendMessage(message);
      }
    },
    [isStreaming, isLoading, previewUrl, enqueue, clearImage, sendMessage],
  );

  // 큐에서 특정 메시지 즉시 전송
  const handleQueueSend = useCallback(
    (queuedMessage: QueuedMessage) => {
      // 큐에서 제거
      remove(queuedMessage.id);

      // 현재 스트리밍 중이 아니면 바로 전송
      if (!isStreaming && !isLoading) {
        // TODO: 이미지 URL 전달 방법 필요
        sendMessage(queuedMessage.content);
      } else {
        // 스트리밍 중이면 큐 맨 앞에 추가 (다음 전송 대상으로)
        enqueue(queuedMessage.content, queuedMessage.imageUrl);
      }
    },
    [isStreaming, isLoading, remove, sendMessage, enqueue],
  );

  // 대화 선택
  const handleSelectChat = useCallback(
    (chat: ChatSummary) => {
      setCurrentChat(chat);
      loadChatMessages(chat.id);
      setSidebarOpen(false);
    },
    [setCurrentChat, loadChatMessages],
  );

  // 새 대화
  const handleNewChat = useCallback(() => {
    clearMessages();
    createNewChat();
    setSidebarOpen(false);
  }, [clearMessages, createNewChat]);

  // 대화 삭제
  const handleDeleteChat = useCallback(
    (chatId: string) => {
      deleteChatMutation.mutate(chatId);
    },
    [deleteChatMutation],
  );

  return (
    <div className='relative flex h-full w-full flex-col bg-white'>
      {/* 사이드바 오버레이 (오른쪽) */}
      {sidebarOpen && (
        <>
          {/* 배경 딤 */}
          <div
            className='fixed inset-0 z-40 bg-black/50'
            onClick={() => setSidebarOpen(false)}
          />
          {/* 사이드바 */}
          <div className='fixed right-0 top-0 z-50 h-full'>
            <AgentSidebar
              currentChatId={currentChat?.id}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* 헤더 */}
      <header className='border-stroke-default flex items-center justify-between border-b bg-white px-4 py-3'>
        <h1 className='text-text-primary truncate text-sm font-medium'>
          {stripMarkdown(currentChat?.title || '') || '새 대화'}
        </h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className='text-text-primary rounded p-2 transition-colors hover:bg-gray-100'
        >
          <Menu className='h-5 w-5' />
        </button>
      </header>

      {/* 메시지 리스트 */}
      <AgentMessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        currentStage={currentStage}
        isLoadingHistory={isLoadingHistory}
        hasMoreHistory={hasMoreHistory}
        onRegenerate={regenerateMessage}
        onLoadMore={loadMoreMessages}
      />

      {/* 메시지 큐 (스트리밍 중 대기 메시지) */}
      {queuedMessages.length > 0 && (
        <AgentMessageQueue
          messages={queuedMessages}
          onSend={handleQueueSend}
          onRemove={remove}
        />
      )}

      {/* 입력창 */}
      <div className='shrink-0'>
        <AgentInputBar
          onSend={handleSend}
          isStreaming={isStreaming}
          isLoading={isLoading}
          onStop={stopGeneration}
          selectedImage={selectedImage}
          previewUrl={previewUrl}
          isUploading={isUploading}
          onSelectImage={selectImage}
          onClearImage={clearImage}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      </div>
    </div>
  );
};
