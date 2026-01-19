/**
 * 메시지 큐 컴포넌트
 * - 스트리밍 중 대기 메시지 표시
 * - 전송(위 화살표), 삭제(휴지통) 버튼
 */

import { ArrowUp, Trash2 } from 'lucide-react';
import type { QueuedMessage } from '@/hooks/agent/useMessageQueue';

interface AgentMessageQueueProps {
  messages: QueuedMessage[];
  onSend: (message: QueuedMessage) => void;
  onRemove: (id: string) => void;
}

export const AgentMessageQueue = ({
  messages,
  onSend,
  onRemove,
}: AgentMessageQueueProps) => {
  if (messages.length === 0) return null;

  return (
    <div className='border-t border-gray-100 bg-gray-50 px-4 py-2'>
      <div className='flex flex-col gap-2'>
        {messages.map((message) => (
          <div
            key={message.id}
            className='flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm'
          >
            {/* 이미지 썸네일 (있을 경우) */}
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt='첨부 이미지'
                className='h-8 w-8 rounded object-cover'
              />
            )}

            {/* 메시지 내용 */}
            <p className='min-w-0 flex-1 truncate text-sm text-gray-700'>
              {message.content || '(이미지만 전송)'}
            </p>

            {/* 전송 버튼 */}
            <button
              onClick={() => onSend(message)}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600'
              title='지금 전송'
            >
              <ArrowUp className='h-4 w-4' />
            </button>

            {/* 삭제 버튼 */}
            <button
              onClick={() => onRemove(message.id)}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-red-100 hover:text-red-500'
              title='삭제'
            >
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        ))}
      </div>

      {/* 큐 상태 안내 */}
      <p className='mt-2 text-center text-xs text-gray-400'>
        {messages.length}개 메시지 대기 중 - 응답 완료 후 순차 전송됩니다
      </p>
    </div>
  );
};
