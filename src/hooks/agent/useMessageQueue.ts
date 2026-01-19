/**
 * 메시지 큐 훅
 * - 스트리밍 중 입력된 메시지를 큐에 보관
 * - 삭제/전송 기능
 */

import { useState, useCallback } from 'react';

export interface QueuedMessage {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: Date;
}

interface UseMessageQueueReturn {
  /** 대기 중인 메시지 목록 */
  queuedMessages: QueuedMessage[];
  /** 메시지를 큐에 추가 */
  enqueue: (content: string, imageUrl?: string) => void;
  /** 특정 메시지 삭제 */
  remove: (id: string) => void;
  /** 첫 번째 메시지 제거 후 반환 */
  dequeue: () => QueuedMessage | null;
  /** 전체 큐 비우기 */
  clear: () => void;
}

export const useMessageQueue = (): UseMessageQueueReturn => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);

  // 메시지 추가
  const enqueue = useCallback((content: string, imageUrl?: string) => {
    const newMessage: QueuedMessage = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      content,
      imageUrl,
      createdAt: new Date(),
    };
    setQueuedMessages((prev) => [...prev, newMessage]);
  }, []);

  // 특정 메시지 삭제
  const remove = useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  // 첫 번째 메시지 제거 후 반환
  const dequeue = useCallback((): QueuedMessage | null => {
    let removed: QueuedMessage | null = null;
    setQueuedMessages((prev) => {
      if (prev.length === 0) return prev;
      [removed] = prev;
      return prev.slice(1);
    });
    return removed;
  }, []);

  // 전체 큐 비우기
  const clear = useCallback(() => {
    setQueuedMessages([]);
  }, []);

  return {
    queuedMessages,
    enqueue,
    remove,
    dequeue,
    clear,
  };
};
