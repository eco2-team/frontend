/**
 * Agent 사이드바
 * - 라이트 테마 적용
 */

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, Plus, X } from 'lucide-react';
import { AgentService } from '@/api/services/agent';
import type { ChatSummary } from '@/api/services/agent';
import { AgentSidebarItem } from './AgentSidebarItem';

interface AgentSidebarProps {
  currentChatId?: string;
  onSelectChat: (chat: ChatSummary) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
  onClose?: () => void;
}

export const AgentSidebar = ({
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClose,
}: AgentSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 대화 목록 무한 스크롤
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['agent', 'chats'],
      queryFn: ({ pageParam }) =>
        AgentService.getChatList({ limit: 20, cursor: pageParam }),
      getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    });

  // 모든 대화 목록
  const allChats = data?.pages.flatMap((page) => page.chats) ?? [];

  // 검색 필터링
  const filteredChats = searchQuery
    ? allChats.filter(
        (chat) =>
          chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.preview?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allChats;

  return (
    <aside className='border-stroke-default flex h-full w-[280px] flex-col border-l bg-white shadow-lg'>
      {/* 헤더 */}
      <div className='border-stroke-default flex items-center justify-between border-b p-4'>
        <h2 className='text-text-primary text-lg font-semibold'>대화 목록</h2>
        {onClose && (
          <button
            onClick={onClose}
            className='text-text-inactive rounded p-1 hover:bg-gray-100 hover:text-gray-700'
          >
            <X className='h-5 w-5' />
          </button>
        )}
      </div>

      {/* 검색 */}
      <div className='p-3'>
        <div className='border-stroke-default bg-inactive flex items-center gap-2 rounded-lg border px-3 py-2'>
          <Search className='text-text-inactive h-4 w-4' />
          <input
            type='text'
            placeholder='대화 검색...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='placeholder:text-text-inactive text-text-primary flex-1 bg-transparent text-sm outline-none'
          />
        </div>
      </div>

      {/* 새 대화 버튼 */}
      <div className='px-3 pb-3'>
        <button
          onClick={onNewChat}
          className='border-brand-primary text-brand-primary hover:bg-brand-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm transition-colors hover:text-white'
        >
          <Plus className='h-4 w-4' />
          <span>새 대화</span>
        </button>
      </div>

      {/* 대화 목록 */}
      <div className='no-scrollbar flex-1 overflow-y-auto px-3'>
        {filteredChats.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-text-inactive text-sm'>
              {searchQuery ? '검색 결과가 없습니다' : '대화가 없습니다'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewChat}
                className='text-brand-primary mt-3 text-sm hover:underline'
              >
                새 대화 시작하기
              </button>
            )}
          </div>
        ) : (
          <div className='space-y-1 pb-4'>
            {filteredChats.map((chat) => (
              <AgentSidebarItem
                key={chat.id}
                item={chat}
                isActive={chat.id === currentChatId}
                onClick={() => onSelectChat(chat)}
                onDelete={onDeleteChat ? () => onDeleteChat(chat.id) : undefined}
              />
            ))}

            {/* 더 불러오기 */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className='text-text-inactive w-full py-2 text-center text-sm hover:text-gray-700'
              >
                {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
