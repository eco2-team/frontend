/**
 * Agent 메시지 컴포넌트
 * - Chat UI 스타일 적용 (이코 캐릭터, 라이트 테마)
 */

import EcoImg from '@/assets/images/mainCharacter/main_1.png';
import type { AgentMessage as AgentMessageType } from '@/api/services/agent';
import { AgentMarkdownRenderer } from './AgentMarkdownRenderer';
import { AgentMessageActions } from './AgentMessageActions';

interface AgentMessageProps {
  message: AgentMessageType;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  /** 이전 메시지와 동일한 화자인지 */
  isContinued?: boolean;
}

export const AgentMessage = ({
  message,
  isStreaming,
  onRegenerate,
  isContinued = false,
}: AgentMessageProps) => {
  const isUser = message.role === 'user';

  // User 메시지
  if (isUser) {
    return (
      <div className='mt-[15px] flex w-full flex-col items-end gap-2'>
        {/* 이미지 (있는 경우) */}
        {message.image_url && (
          <img
            src={message.image_url}
            alt='첨부 이미지'
            className='h-[132px] w-[132px] rounded-md object-cover'
          />
        )}
        {/* 텍스트 */}
        {message.content && (
          <div className='border-brand-primary bg-brand-primary max-w-[80%] shrink-0 items-start rounded-[16px_6px_16px_16px] border-[0.676px] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)] break-words whitespace-pre-wrap'>
            {message.content}
          </div>
        )}
      </div>
    );
  }

  // Assistant (이코) 메시지
  return (
    <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
      {/* 이코 아바타 */}
      {!isContinued ? (
        <img src={EcoImg} alt='이코' className='h-9 w-9' />
      ) : (
        <div className='h-9 w-9' />
      )}

      <div className='flex w-full flex-col items-start gap-2'>
        {/* 메시지 버블 */}
        <div className='border-stroke-default text-text-primary inline-block max-w-[80%] rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)] break-words'>
          <AgentMarkdownRenderer content={message.content} />
          {/* 스트리밍 커서 */}
          {isStreaming && (
            <span className='bg-brand-primary ml-1 inline-block h-4 w-0.5 animate-pulse' />
          )}
        </div>

        {/* 메시지 액션 (스트리밍 중 아닐 때) */}
        {!isStreaming && (
          <AgentMessageActions
            content={message.content}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
};
