/**
 * Agent 코드 블록 컴포넌트
 * - 라이트 테마 적용
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AgentCodeBlockProps {
  code: string;
  language: string;
}

export const AgentCodeBlock = ({ code, language }: AgentCodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className='border-stroke-default my-3 overflow-hidden rounded-lg border bg-gray-50'>
      {/* 헤더 */}
      <div className='flex items-center justify-between bg-gray-100 px-4 py-2'>
        <span className='text-text-inactive text-xs'>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className='text-text-inactive flex items-center gap-1.5 text-xs transition-colors hover:text-gray-700'
        >
          {copied ? (
            <>
              <Check className='h-3.5 w-3.5 text-green-600' />
              <span>복사됨</span>
            </>
          ) : (
            <>
              <Copy className='h-3.5 w-3.5' />
              <span>복사</span>
            </>
          )}
        </button>
      </div>
      {/* 코드 */}
      <pre className='overflow-x-auto p-4'>
        <code className={`language-${language} text-sm`}>{code}</code>
      </pre>
    </div>
  );
};
