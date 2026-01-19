/**
 * Agent 사이드바 아이템
 * - 라이트 테마 적용
 */

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ChatSummary } from '@/api/services/agent';
import { stripMarkdown } from '@/utils/stripMarkdown';

interface AgentSidebarItemProps {
  item: ChatSummary;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
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

export const AgentSidebarItem = ({
  item,
  isActive,
  onClick,
  onDelete,
  onRename,
}: AgentSidebarItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || '');
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 편집 모드 시 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onRename?.(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(item.title || '');
      setIsEditing(false);
    }
  };

  // 편집 모드
  if (isEditing) {
    return (
      <div className='flex items-center gap-2 rounded-lg bg-gray-100 p-2'>
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRename}
          className='border-stroke-default text-text-primary flex-1 rounded border bg-white px-2 py-1 text-sm outline-none'
        />
        <button
          onClick={handleRename}
          className='rounded p-1 text-green-600 hover:bg-gray-200'
        >
          <Check className='h-4 w-4' />
        </button>
        <button
          onClick={() => {
            setEditTitle(item.title || '');
            setIsEditing(false);
          }}
          className='text-text-inactive rounded p-1 hover:bg-gray-200'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    );
  }

  // 일반 모드
  return (
    <div className='group relative'>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          isActive ? 'bg-brand-primary/10' : 'hover:bg-gray-100'
        }`}
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
      </button>

      {/* 더보기 버튼 */}
      {(onDelete || onRename) && (
        <div ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className='text-text-inactive absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100'
          >
            <MoreVertical className='h-4 w-4' />
          </button>

          {/* 메뉴 */}
          {showMenu && (
            <div className='border-stroke-default absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border bg-white py-1 shadow-xl'>
              {onRename && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className='text-text-primary flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100'
                >
                  <Pencil className='h-4 w-4' />
                  <span>제목 수정</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className='flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-100'
                >
                  <Trash2 className='h-4 w-4' />
                  <span>삭제</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
