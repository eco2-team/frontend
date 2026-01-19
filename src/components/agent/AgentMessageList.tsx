/**
 * Agent 메시지 리스트
 * - Chat UI 스타일 적용 (이코 캐릭터, 라이트 테마)
 */

import { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import EcoImg from '@/assets/images/mainCharacter/main_1.png';
import type {
  AgentMessage as AgentMessageType,
  CurrentStage,
} from '@/api/services/agent';
import { useScrollToBottom } from '@/hooks/agent';
import { AgentMessage } from './AgentMessage';
import { AgentMarkdownRenderer } from './AgentMarkdownRenderer';
import { AgentStageIndicator } from './AgentStageIndicator';

interface AgentMessageListProps {
  messages: AgentMessageType[];
  streamingText: string;
  isStreaming: boolean;
  currentStage?: CurrentStage | null;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  onRegenerate?: (messageId: string) => void;
  onLoadMore?: () => void;
}

/** 타이핑 인디케이터 HTML */
const TYPING_HTML = `
  <span class="eco-dot"></span>
  <span class="eco-dot"></span>
  <span class="eco-dot"></span>
`;

export const AgentMessageList = ({
  messages,
  streamingText,
  isStreaming,
  currentStage,
  isLoadingHistory,
  hasMoreHistory,
  onRegenerate,
  onLoadMore,
}: AgentMessageListProps) => {
  const { containerRef, showScrollButton, scrollToBottom, isAtBottom } =
    useScrollToBottom();

  // 위로 스크롤 시 이전 메시지 로드
  const handleScroll = () => {
    if (!containerRef.current || !hasMoreHistory || isLoadingHistory) return;

    const { scrollTop } = containerRef.current;
    // 상단에 가까워지면 (100px 이내) 이전 메시지 로드
    if (scrollTop < 100) {
      onLoadMore?.();
    }
  };

  // 새 메시지 시 자동 스크롤 (하단에 있을 때만)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom('auto');
    }
  }, [messages, streamingText, isAtBottom, scrollToBottom]);

  // 스트리밍 시작 시 스크롤
  useEffect(() => {
    if (isStreaming && isAtBottom) {
      scrollToBottom('auto');
    }
  }, [isStreaming, isAtBottom, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className='no-scrollbar relative flex-1 overflow-y-auto bg-white'
    >
      <div className='px-6 pb-4'>
        {/* 이전 메시지 로딩 인디케이터 */}
        {isLoadingHistory && (
          <div className='flex justify-center py-4'>
            <div className='flex items-center gap-2 text-text-inactive text-sm'>
              <span className='h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]' />
              <span className='h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]' />
              <span className='h-2 w-2 animate-bounce rounded-full bg-gray-400' />
              <span className='ml-2'>이전 대화 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* 더 보기 버튼 (로딩 중이 아닐 때) */}
        {!isLoadingHistory && hasMoreHistory && messages.length > 0 && (
          <div className='flex justify-center py-4'>
            <button
              onClick={onLoadMore}
              className='text-brand-primary text-sm hover:underline'
            >
              이전 대화 더 보기
            </button>
          </div>
        )}

        {/* 빈 상태 - 시작 메시지 */}
        {messages.length === 0 && !isStreaming && !isLoadingHistory && (
          <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
            <img src={EcoImg} alt='이코' className='h-9 w-9' />
            <div className='flex w-full flex-col items-start gap-2'>
              <div className='border-stroke-default text-text-primary inline-block max-w-[80%] rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'>
                안녕하세요! 저는 이코예요 분리수거에 대해 궁금한게 있으면
                물어봐주세요!
              </div>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((message, idx) => {
          const prev = messages[idx - 1];
          // 전 메시지와 동일한 화자인지
          const isContinued = prev?.role === message.role;

          return (
            <AgentMessage
              key={message.id}
              message={message}
              isContinued={isContinued}
              onRegenerate={
                message.role === 'assistant' && idx === messages.length - 1
                  ? () => onRegenerate?.(message.id)
                  : undefined
              }
            />
          );
        })}

        {/* Stage Indicator (스트리밍 중, 토큰 스트리밍 전) */}
        {isStreaming && currentStage && !streamingText && (
          <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
            <img src={EcoImg} alt='이코' className='h-9 w-9' />
            <div className='flex w-full flex-col items-start gap-2'>
              <div className='border-stroke-default inline-block rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'>
                <AgentStageIndicator stage={currentStage} />
              </div>
            </div>
          </div>
        )}

        {/* 스트리밍 메시지 */}
        {isStreaming && streamingText && (
          <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
            <img src={EcoImg} alt='이코' className='h-9 w-9' />
            <div className='flex w-full flex-col items-start gap-2'>
              <div className='border-stroke-default text-text-primary inline-block max-w-[80%] rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'>
                <AgentMarkdownRenderer content={streamingText} />
                <span className='bg-brand-primary ml-1 inline-block h-4 w-0.5 animate-pulse' />
              </div>
            </div>
          </div>
        )}

        {/* 로딩 인디케이터 (스트리밍 시작 전, Stage 없을 때만) */}
        {isStreaming && !streamingText && !currentStage && (
          <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
            <img src={EcoImg} alt='이코' className='h-9 w-9' />
            <div className='flex w-full flex-col items-start gap-2'>
              <div
                className='border-stroke-default inline-block rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] px-4 py-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'
                dangerouslySetInnerHTML={{ __html: TYPING_HTML }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 스크롤 하단 버튼 */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className='border-stroke-default absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-lg transition-colors hover:bg-gray-50'
        >
          <ChevronDown className='text-text-primary h-5 w-5' />
        </button>
      )}
    </div>
  );
};
