/**
 * 메시지 자동 저장 훅
 * - Pending 메시지: 즉시 저장 (데이터 유실 방지)
 * - 기타 메시지: Throttled save (500ms)
 * - 주기적 cleanup (1분)
 * - beforeunload 핸들러 (best-effort 저장)
 */

import { useEffect, useRef, useCallback } from 'react';
import { messageDB } from '@/db/messageDB';
import type { AgentMessage } from '@/api/services/agent';

/**
 * 메시지 IndexedDB 자동 저장 (user_id 격리)
 */
export const useMessagePersistence = (
  userId: string,
  chatId: string | null,
  messages: AgentMessage[],
) => {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessagesRef = useRef<AgentMessage[]>([]);
  const userIdRef = useRef<string>(userId);
  const chatIdRef = useRef<string | null>(chatId);
  const messagesRef = useRef<AgentMessage[]>(messages);

  // Refs 동기화 (beforeunload에서 사용)
  useEffect(() => {
    userIdRef.current = userId;
    chatIdRef.current = chatId;
    messagesRef.current = messages;
  }, [userId, chatId, messages]);

  // Pending 메시지 즉시 저장 (throttle 무시)
  // 브라우저 종료 시 데이터 유실 방지
  useEffect(() => {
    if (!chatId) return;

    const pendingMessages = messages.filter((m) => m.status === 'pending');
    const prevPendingIds = new Set(
      prevMessagesRef.current
        .filter((m) => m.status === 'pending')
        .map((m) => m.client_id),
    );

    // 새로운 pending 메시지가 있으면 즉시 저장
    const newPending = pendingMessages.filter(
      (m) => !prevPendingIds.has(m.client_id),
    );

    if (newPending.length > 0) {
      messageDB.saveMessages(userId, chatId, newPending).catch((err) => {
        console.error('[Persistence] Failed to save pending messages:', err);
      });
    }
  }, [userId, chatId, messages]);

  // 기타 메시지 자동 저장 (500ms throttle)
  useEffect(() => {
    if (!chatId || messages.length === 0) return;

    // 변경 감지 (얕은 비교)
    const changed =
      messages.length !== prevMessagesRef.current.length ||
      messages.some((msg, i) => {
        const prev = prevMessagesRef.current[i];
        return (
          !prev ||
          msg.client_id !== prev.client_id ||
          msg.status !== prev.status ||
          msg.content !== prev.content
        );
      });

    if (!changed) return;

    // Throttle: 500ms 내 변경사항 모아서 한 번에 저장
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      messageDB
        .saveMessages(userId, chatId, messages)
        .catch((err) => {
          console.error('[Persistence] Failed to save messages:', err);
        })
        .finally(() => {
          prevMessagesRef.current = messages;
        });
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [userId, chatId, messages]);

  // beforeunload 핸들러 (best-effort 저장)
  const handleBeforeUnload = useCallback(() => {
    const currentUserId = userIdRef.current;
    const currentChatId = chatIdRef.current;
    const currentMessages = messagesRef.current;

    if (currentChatId && currentMessages.length > 0) {
      // IndexedDB는 비동기라 보장 안됨, 하지만 시도는 필요
      messageDB
        .saveMessages(currentUserId, currentChatId, currentMessages)
        .catch(() => {
          // beforeunload에서는 에러 로깅도 의미 없음
        });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  // 주기적 cleanup (1분마다, user_id 격리)
  useEffect(() => {
    if (!chatId) return;

    cleanupTimerRef.current = setInterval(() => {
      messageDB
        .cleanup(userId, chatId, {
          committedRetentionMs: 30000, // 30초
        })
        .catch((err) => {
          console.error('[Persistence] Failed to cleanup:', err);
        });
    }, 60000); // 1분

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [userId, chatId]);
};
