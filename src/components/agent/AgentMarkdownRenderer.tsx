/**
 * Agent 마크다운 렌더러
 * - 라이트 테마 적용
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { AgentCodeBlock } from './AgentCodeBlock';
import { AgentImage } from './AgentImage';

// highlight.js 테마 (라이트)
import 'highlight.js/styles/github.css';

interface AgentMarkdownRendererProps {
  content: string;
}

export const AgentMarkdownRenderer = ({
  content,
}: AgentMarkdownRendererProps) => {
  const components: Components = {
    // 코드 블록
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;

      if (isInline) {
        return (
          <code
            className='rounded bg-gray-100 px-1.5 py-0.5 text-sm text-[#d63384]'
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = match[1];
      return (
        <AgentCodeBlock
          code={String(children).replace(/\n$/, '')}
          language={language}
        />
      );
    },

    // 이미지
    img({ src, alt }) {
      return <AgentImage src={src} alt={alt} />;
    },

    // 링크
    a({ href, children }) {
      return (
        <a
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          className='text-brand-primary hover:underline'
        >
          {children}
        </a>
      );
    },

    // 리스트
    ul({ children }) {
      return <ul className='my-2 list-disc space-y-1 pl-6'>{children}</ul>;
    },
    ol({ children }) {
      return <ol className='my-2 list-decimal space-y-1 pl-6'>{children}</ol>;
    },
    li({ children }) {
      return <li className='text-text-primary'>{children}</li>;
    },

    // 강조
    strong({ children }) {
      return (
        <strong className='text-text-primary font-semibold'>{children}</strong>
      );
    },
    em({ children }) {
      return <em className='text-text-secondary italic'>{children}</em>;
    },

    // 헤딩
    h1({ children }) {
      return (
        <h1 className='text-text-primary mb-3 mt-4 text-xl font-bold'>
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className='text-text-primary mb-2 mt-3 text-lg font-bold'>
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className='text-text-primary mb-2 mt-3 text-base font-bold'>
          {children}
        </h3>
      );
    },

    // 단락
    p({ children }) {
      return <p className='text-text-primary my-1 leading-relaxed'>{children}</p>;
    },

    // 인용
    blockquote({ children }) {
      return (
        <blockquote className='border-brand-primary text-text-secondary my-2 border-l-4 pl-4 italic'>
          {children}
        </blockquote>
      );
    },

    // 테이블
    table({ children }) {
      return (
        <div className='my-3 overflow-x-auto'>
          <table className='border-stroke-default min-w-full border-collapse border'>
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className='border-stroke-default text-text-primary border bg-gray-100 px-3 py-2 text-left text-sm font-semibold'>
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className='border-stroke-default text-text-primary border px-3 py-2 text-sm'>
          {children}
        </td>
      );
    },

    // 수평선
    hr() {
      return <hr className='border-stroke-default my-4' />;
    },
  };

  return (
    <div className='max-w-none'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
