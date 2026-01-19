/**
 * Agent 메시지 액션 (복사, 재생성, 피드백)
 * - 라이트 테마 적용
 */

import { useState } from 'react';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';

interface AgentMessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
}

export const AgentMessageActions = ({
  content,
  onRegenerate,
  onFeedback,
}: AgentMessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div className='mt-1 flex items-center gap-1'>
      {/* 복사 */}
      <button
        onClick={handleCopy}
        className='text-text-inactive flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100 hover:text-gray-700'
        title='복사'
      >
        {copied ? (
          <Check className='h-3.5 w-3.5 text-green-600' />
        ) : (
          <Copy className='h-3.5 w-3.5' />
        )}
      </button>

      {/* 재생성 */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className='text-text-inactive flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100 hover:text-gray-700'
          title='다시 생성'
        >
          <RefreshCw className='h-3.5 w-3.5' />
        </button>
      )}

      {/* 피드백 */}
      {onFeedback && (
        <>
          <button
            onClick={() => handleFeedback('up')}
            className={`rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100 ${
              feedback === 'up'
                ? 'text-green-600'
                : 'text-text-inactive hover:text-gray-700'
            }`}
            title='좋아요'
          >
            <ThumbsUp className='h-3.5 w-3.5' />
          </button>
          <button
            onClick={() => handleFeedback('down')}
            className={`rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100 ${
              feedback === 'down'
                ? 'text-red-500'
                : 'text-text-inactive hover:text-gray-700'
            }`}
            title='별로예요'
          >
            <ThumbsDown className='h-3.5 w-3.5' />
          </button>
        </>
      )}
    </div>
  );
};
