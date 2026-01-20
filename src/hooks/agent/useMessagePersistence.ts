/**
 * 메시지 자동 저장 훅
 * - Throttled save (500ms)
 * - 주기적 cleanup (1분)
 */

import { useEffect, useRef } from 'react';
import { messageDB } from '@/db/messageDB';
import type { AgentMessage } from '@/api/services/agent';

/**
 * 메시지 IndexedDB 자동 저장
 */
export const useMessagePersistence = (
  chatId: string | null,
  messages: AgentMessage[],
) => {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessagesRef = useRef<AgentMessage[]>([]);

  // 메시지 자동 저장 (500ms throttle)
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
        .saveMessages(chatId, messages)
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
  }, [chatId, messages]);

  // 주기적 cleanup (1분마다)
  useEffect(() => {
    if (!chatId) return;

    cleanupTimerRef.current = setInterval(() => {
      messageDB.cleanup(chatId, {
        committedRetentionMs: 30000, // 30초
      }).catch((err) => {
        console.error('[Persistence] Failed to cleanup:', err);
      });
    }, 60000); // 1분

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [chatId]);
};
