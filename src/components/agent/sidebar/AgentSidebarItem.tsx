/**
 * Agent 사이드바 아이템
 * - 스와이프하여 삭제 지원
 * - 라이트 테마 적용
 */

import { useState, useRef } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { ChatSummary } from '@/api/services/agent';
import { stripMarkdown } from '@/utils/stripMarkdown';

interface AgentSidebarItemProps {
  item: ChatSummary;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

/**
 * 상대 시간 포맷
 */
const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
};

/** 스와이프 임계값 (px) */
const SWIPE_THRESHOLD = 60;
/** 삭제 버튼 너비 (px) */
const DELETE_BUTTON_WIDTH = 72;

export const AgentSidebarItem = ({
  item,
  isActive,
  onClick,
  onDelete,
}: AgentSidebarItemProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isDraggingRef.current = false;
  };

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !onDelete) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // 수직 스크롤이 더 크면 스와이프 무시
    if (Math.abs(deltaY) > Math.abs(deltaX) && !isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = true;

    // 왼쪽으로만 스와이프 (음수)
    if (deltaX < 0) {
      // 이미 열려있으면 추가 스와이프 제한
      const newOffset = isOpen
        ? Math.max(deltaX - DELETE_BUTTON_WIDTH, -DELETE_BUTTON_WIDTH)
        : Math.max(deltaX, -DELETE_BUTTON_WIDTH - 20);
      setOffsetX(newOffset);
    } else if (isOpen) {
      // 열려있을 때 오른쪽으로 스와이프하면 닫기
      const newOffset = Math.min(deltaX - DELETE_BUTTON_WIDTH, 0);
      setOffsetX(newOffset);
    }
  };

  // 터치 종료
  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;

    // 임계값 넘으면 열기/닫기
    if (offsetX < -SWIPE_THRESHOLD && !isOpen) {
      setOffsetX(-DELETE_BUTTON_WIDTH);
      setIsOpen(true);
    } else if (offsetX > -SWIPE_THRESHOLD && isOpen) {
      setOffsetX(0);
      setIsOpen(false);
    } else {
      // 원래 상태로 복귀
      setOffsetX(isOpen ? -DELETE_BUTTON_WIDTH : 0);
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  };

  // 클릭 핸들러 (스와이프 중이 아닐 때만)
  const handleClick = () => {
    if (isDraggingRef.current) return;

    // 열려있으면 닫기
    if (isOpen) {
      setOffsetX(0);
      setIsOpen(false);
      return;
    }

    onClick();
  };

  // 삭제 버튼 클릭
  const handleDelete = () => {
    setOffsetX(0);
    setIsOpen(false);
    onDelete?.();
  };

  return (
    <div className='relative overflow-hidden rounded-lg'>
      {/* 삭제 버튼 (배경) */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className='absolute right-0 top-0 flex h-full items-center justify-center bg-red-500 px-5 text-white transition-colors hover:bg-red-600'
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <Trash2 className='h-5 w-5' />
        </button>
      )}

      {/* 메인 아이템 (스와이프 가능) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={`relative flex w-full cursor-pointer items-center gap-3 bg-white px-3 py-2.5 text-left transition-transform ${
          isActive ? 'bg-brand-primary/10' : 'hover:bg-gray-100'
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <MessageSquare
          className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-inactive'}`}
        />
        <div className='min-w-0 flex-1'>
          <p
            className={`truncate text-sm ${isActive ? 'text-brand-primary font-medium' : 'text-text-primary'}`}
          >
            {stripMarkdown(item.title || item.preview || '') || '새 대화'}
          </p>
        </div>
        <span className='text-text-inactive flex-shrink-0 text-xs'>
          {formatRelativeTime(item.last_message_at || item.created_at)}
        </span>
      </div>
    </div>
  );
};
