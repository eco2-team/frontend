# Chat Sidebar 설계

> 백엔드 세션 구조 기반 우측 사이드바 컴포넌트 설계
> Reference: Claude Code 스타일 (이미지 참조)

---

## 1. 백엔드 데이터 구조

### 1.1 API Endpoints

| Method | Endpoint | 설명 | Query Params |
|--------|----------|------|--------------|
| **GET** | `/api/v1/chat` | 대화 목록 (사이드바) | `limit` (1-100, default 20), `cursor` |
| **POST** | `/api/v1/chat` | 새 대화 생성 | - |
| **DELETE** | `/api/v1/chat/{chat_id}` | 대화 삭제 (soft delete) | - |

### 1.2 Response Schema

```typescript
// 사이드바 목록 아이템
interface ChatSummary {
  id: string;                    // UUID
  title: string | null;          // 대화 제목 (없으면 null)
  preview: string | null;        // 마지막 메시지 미리보기 (100자)
  message_count: number;         // 메시지 수
  last_message_at: string | null; // 마지막 메시지 시간 (ISO 8601)
  created_at: string;            // 생성 시간 (ISO 8601)
}

// 목록 응답
interface ChatListResponse {
  chats: ChatSummary[];
  next_cursor: string | null;    // 커서 기반 페이지네이션
}
```

---

## 2. UI 디자인

### 2.1 레이아웃 (Reference: Claude Code 스타일)

```
┌─────────────────────────────────┐
│  🔍 Search Chats...             │  ← 검색 입력
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │     + 새 대화               ││  ← 새 대화 버튼
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  대화 목록                       │  ← 섹션 헤더
│                                 │
│  💬 페트병 분리배출...      3d   │  ← 대화 아이템
│  💬 음식물 쓰레기 처...     3d   │
│  💬 캔 분류 방법이...       4d   │
│  💬 종이팩 처리하는...      4d   │
│  💬 플라스틱 용기 세...     5d   │
│  💬 대형폐기물 배출...      9d   │
│  💬 재활용 시세 조회...     9d   │
│                                 │
│  ··· 더 보기                    │  ← 페이지네이션
├─────────────────────────────────┤
│  보관함                          │  ← 삭제된 대화 (선택적)
│                                 │
│  💬 오래된 대화...          30d  │
└─────────────────────────────────┘
```

### 2.2 색상 테마 (다크 모드)

```css
/* 배경 */
--sidebar-bg: #1a1a1a;           /* 메인 배경 */
--sidebar-header-bg: #242424;    /* 헤더 배경 */

/* 텍스트 */
--sidebar-text-primary: #ffffff;  /* 제목 */
--sidebar-text-secondary: #888888; /* 시간, 미리보기 */

/* 아이템 */
--sidebar-item-hover: #2a2a2a;   /* 호버 배경 */
--sidebar-item-active: #333333;  /* 선택된 아이템 */

/* 버튼 */
--sidebar-btn-border: #444444;   /* 버튼 테두리 */
--sidebar-btn-text: #cccccc;     /* 버튼 텍스트 */

/* 입력 */
--sidebar-input-bg: #2a2a2a;     /* 검색 입력 배경 */
--sidebar-input-border: #444444; /* 검색 입력 테두리 */
```

---

## 3. TypeScript Types

### 3.1 컴포넌트 Props

```typescript
// types/chat-sidebar.ts

export interface ChatSidebarItem {
  id: string;
  title: string;                  // title || preview || "새 대화"
  preview: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  isArchived?: boolean;
}

export interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export interface ChatSidebarItemProps {
  item: ChatSidebarItem;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export interface ChatSidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

### 3.2 API 응답 타입 매핑

```typescript
// api/services/chat/chat.type.ts

// 백엔드 응답 그대로
export interface ChatSummaryResponse {
  id: string;
  title: string | null;
  preview: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatListResponse {
  chats: ChatSummaryResponse[];
  next_cursor: string | null;
}

// 프론트엔드용 변환
export function toChatSidebarItem(
  response: ChatSummaryResponse
): ChatSidebarItem {
  return {
    id: response.id,
    title: response.title || response.preview || '새 대화',
    preview: response.preview,
    messageCount: response.message_count,
    lastMessageAt: response.last_message_at
      ? new Date(response.last_message_at)
      : null,
    createdAt: new Date(response.created_at),
  };
}
```

---

## 4. Utility Functions

### 4.1 상대 시간 포맷

```typescript
// utils/formatRelativeTime.ts

/**
 * 상대 시간 문자열 반환 (3d, 4d, 1w, 1mo 등)
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  if (diffMonths < 12) return `${diffMonths}mo`;
  return `${diffYears}y`;
}

/**
 * 한글 상대 시간 (오늘, 어제, 3일 전 등)
 */
export function formatRelativeTimeKo(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}
```

### 4.2 제목 생성

```typescript
// utils/generateChatTitle.ts

/**
 * 대화 제목 생성 (title || preview 앞 30자 || 기본값)
 */
export function generateChatTitle(
  title: string | null,
  preview: string | null,
  defaultTitle = '새 대화'
): string {
  if (title) return truncate(title, 30);
  if (preview) return truncate(preview, 30);
  return defaultTitle;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
```

---

## 5. 컴포넌트 구조

### 5.1 파일 구조

```
src/
├── components/chat/
│   ├── ChatSidebar/
│   │   ├── index.ts               # 배럴 export
│   │   ├── ChatSidebar.tsx        # 메인 컴포넌트
│   │   ├── ChatSidebarHeader.tsx  # 검색 + 새 대화 버튼
│   │   ├── ChatSidebarList.tsx    # 대화 목록 (가상화)
│   │   ├── ChatSidebarItem.tsx    # 개별 아이템
│   │   ├── ChatSidebarEmpty.tsx   # 빈 상태
│   │   └── ChatSidebar.styles.ts  # 스타일 (선택적)
│   │
│   └── ... (기존 컴포넌트)
│
├── hooks/
│   ├── useChatSidebar.ts          # 사이드바 상태 관리
│   └── useSwipeDrawer.ts          # 스와이프 제스처 (기존)
│
└── utils/
    ├── formatRelativeTime.ts      # 상대 시간 포맷
    └── generateChatTitle.ts       # 제목 생성
```

### 5.2 ChatSidebar.tsx (메인 컴포넌트)

```typescript
// components/chat/ChatSidebar/ChatSidebar.tsx
import { useRef, useState } from 'react';
import { ChatSidebarHeader } from './ChatSidebarHeader';
import { ChatSidebarList } from './ChatSidebarList';
import { ChatSidebarEmpty } from './ChatSidebarEmpty';
import { useChatSidebar } from '@/hooks/useChatSidebar';
import type { ChatSidebarProps } from '@/types/chat-sidebar';

export const ChatSidebar = ({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  const {
    chats,
    archivedChats,
    isLoading,
    hasMore,
    fetchMore,
    isFetchingMore,
  } = useChatSidebar({ searchQuery });

  // 검색 필터링
  const filteredChats = searchQuery
    ? chats.filter(
        (chat) =>
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 사이드바 */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 right-0 z-50 flex h-full w-[300px] flex-col bg-[#1a1a1a] shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더: 검색 + 새 대화 */}
        <ChatSidebarHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewChat={onNewChat}
          onClose={onClose}
        />

        {/* 대화 목록 */}
        {isLoading ? (
          <ChatSidebarSkeleton />
        ) : filteredChats.length === 0 ? (
          <ChatSidebarEmpty
            hasSearchQuery={!!searchQuery}
            onNewChat={onNewChat}
          />
        ) : (
          <ChatSidebarList
            chats={filteredChats}
            currentChatId={currentChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            hasMore={hasMore}
            onLoadMore={fetchMore}
            isLoadingMore={isFetchingMore}
          />
        )}

        {/* 보관함 (삭제된 대화) - 선택적 */}
        {archivedChats.length > 0 && (
          <div className="border-t border-[#333] p-4">
            <h3 className="mb-2 text-xs font-medium text-[#666]">보관함</h3>
            {/* ... archived items ... */}
          </div>
        )}
      </aside>
    </>
  );
};

// 로딩 스켈레톤
const ChatSidebarSkeleton = () => (
  <div className="flex-1 space-y-2 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center gap-3 rounded-lg p-3">
          <div className="h-5 w-5 rounded bg-[#333]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-[#333]" />
          </div>
          <div className="h-3 w-6 rounded bg-[#333]" />
        </div>
      </div>
    ))}
  </div>
);
```

### 5.3 ChatSidebarHeader.tsx

```typescript
// components/chat/ChatSidebar/ChatSidebarHeader.tsx
import { SearchIcon, PlusIcon, XIcon } from '@/assets/icons';

interface ChatSidebarHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export const ChatSidebarHeader = ({
  searchQuery,
  onSearchChange,
  onNewChat,
  onClose,
}: ChatSidebarHeaderProps) => {
  return (
    <div className="border-b border-[#333] p-4">
      {/* 닫기 버튼 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">대화 목록</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[#888] hover:bg-[#333] hover:text-white"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* 검색 입력 */}
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="대화 검색..."
          className="w-full rounded-lg border border-[#444] bg-[#2a2a2a] py-2 pl-10 pr-4 text-sm text-white placeholder-[#666] outline-none focus:border-[#666]"
        />
      </div>

      {/* 새 대화 버튼 */}
      <button
        onClick={onNewChat}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#444] py-2.5 text-sm text-[#ccc] transition-colors hover:border-[#666] hover:bg-[#2a2a2a] hover:text-white"
      >
        <PlusIcon className="h-4 w-4" />
        <span>새 대화</span>
      </button>
    </div>
  );
};
```

### 5.4 ChatSidebarItem.tsx

```typescript
// components/chat/ChatSidebar/ChatSidebarItem.tsx
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { MessageIcon, TrashIcon } from '@/assets/icons';
import type { ChatSidebarItem as ChatSidebarItemType } from '@/types/chat-sidebar';

interface ChatSidebarItemProps {
  item: ChatSidebarItemType;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export const ChatSidebarItem = ({
  item,
  isActive,
  onClick,
  onDelete,
}: ChatSidebarItemProps) => {
  const relativeTime = formatRelativeTime(item.lastMessageAt || item.createdAt);

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
        isActive
          ? 'bg-[#333] text-white'
          : 'text-[#ccc] hover:bg-[#2a2a2a] hover:text-white'
      }`}
    >
      {/* 아이콘 */}
      <MessageIcon className="h-5 w-5 flex-shrink-0 text-[#666]" />

      {/* 제목 */}
      <span className="flex-1 truncate text-sm">{item.title}</span>

      {/* 시간 */}
      <span className="flex-shrink-0 text-xs text-[#666]">{relativeTime}</span>

      {/* 삭제 버튼 (호버 시 표시) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="hidden flex-shrink-0 rounded p-1 text-[#666] hover:bg-[#444] hover:text-red-400 group-hover:block"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </button>
  );
};
```

### 5.5 ChatSidebarList.tsx

```typescript
// components/chat/ChatSidebar/ChatSidebarList.tsx
import { useRef, useCallback } from 'react';
import { ChatSidebarItem } from './ChatSidebarItem';
import type { ChatSidebarItem as ChatSidebarItemType } from '@/types/chat-sidebar';

interface ChatSidebarListProps {
  chats: ChatSidebarItemType[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export const ChatSidebarList = ({
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: ChatSidebarListProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤 감지
  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-2"
    >
      {/* 섹션 헤더 */}
      <h3 className="mb-2 px-2 text-xs font-medium text-[#666]">대화 목록</h3>

      {/* 대화 목록 */}
      <div className="space-y-1">
        {chats.map((chat) => (
          <ChatSidebarItem
            key={chat.id}
            item={chat}
            isActive={chat.id === currentChatId}
            onClick={() => onSelectChat(chat.id)}
            onDelete={onDeleteChat ? () => onDeleteChat(chat.id) : undefined}
          />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="mt-2 w-full py-2 text-center text-xs text-[#666] hover:text-[#888]"
        >
          {isLoadingMore ? '로딩 중...' : '··· 더 보기'}
        </button>
      )}
    </div>
  );
};
```

### 5.6 ChatSidebarEmpty.tsx

```typescript
// components/chat/ChatSidebar/ChatSidebarEmpty.tsx
import { MessageIcon, PlusIcon } from '@/assets/icons';

interface ChatSidebarEmptyProps {
  hasSearchQuery: boolean;
  onNewChat: () => void;
}

export const ChatSidebarEmpty = ({
  hasSearchQuery,
  onNewChat,
}: ChatSidebarEmptyProps) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <MessageIcon className="mb-4 h-12 w-12 text-[#444]" />
      <p className="mb-2 text-sm text-[#888]">
        {hasSearchQuery
          ? '검색 결과가 없습니다'
          : '아직 대화가 없습니다'}
      </p>
      {!hasSearchQuery && (
        <button
          onClick={onNewChat}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[#333] px-4 py-2 text-sm text-white hover:bg-[#444]"
        >
          <PlusIcon className="h-4 w-4" />
          새 대화 시작하기
        </button>
      )}
    </div>
  );
};
```

---

## 6. Hook 구현

### 6.1 useChatSidebar.ts

```typescript
// hooks/useChatSidebar.ts
import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatService, toChatSidebarItem } from '@/api/services/chat';
import type { ChatSidebarItem } from '@/types/chat-sidebar';

interface UseChatSidebarOptions {
  searchQuery?: string;
}

interface UseChatSidebarReturn {
  chats: ChatSidebarItem[];
  archivedChats: ChatSidebarItem[];
  isLoading: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  isFetchingMore: boolean;
  createChat: () => Promise<string>;
  deleteChat: (chatId: string) => Promise<void>;
}

export const useChatSidebar = ({
  searchQuery,
}: UseChatSidebarOptions = {}): UseChatSidebarReturn => {
  const queryClient = useQueryClient();

  // 대화 목록 조회 (무한 스크롤)
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat', 'list', searchQuery],
    queryFn: ({ pageParam }) => ChatService.getChats(pageParam),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  // 새 대화 생성
  const createMutation = useMutation({
    mutationFn: () => ChatService.createChat(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
    },
  });

  // 대화 삭제
  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => ChatService.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
    },
  });

  // 데이터 변환
  const chats = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages
      .flatMap((page) => page.chats)
      .map(toChatSidebarItem);
  }, [data]);

  return {
    chats,
    archivedChats: [], // TODO: 보관함 API 추가 시 구현
    isLoading,
    hasMore: !!hasNextPage,
    fetchMore: fetchNextPage,
    isFetchingMore: isFetchingNextPage,
    createChat: async () => {
      const result = await createMutation.mutateAsync();
      return result.id;
    },
    deleteChat: deleteMutation.mutateAsync,
  };
};
```

---

## 7. API Service 확장

### 7.1 chat.service.ts 추가

```typescript
// api/services/chat/chat.service.ts (기존 파일에 추가)

export class ChatService {
  // ... 기존 메서드 ...

  /**
   * 대화 목록 조회 (사이드바)
   * GET /api/v1/chat?limit=20&cursor={cursor}
   */
  static async getChats(cursor?: string, limit = 20) {
    return api
      .get<ChatListResponse>('/api/v1/chat', {
        params: { limit, cursor },
      })
      .then((res) => res.data);
  }

  /**
   * 새 대화 생성
   * POST /api/v1/chat
   */
  static async createChat(title?: string) {
    return api
      .post<ChatSummaryResponse>('/api/v1/chat', { title })
      .then((res) => res.data);
  }

  /**
   * 대화 삭제 (soft delete)
   * DELETE /api/v1/chat/{chatId}
   */
  static async deleteChat(chatId: string) {
    return api.delete(`/api/v1/chat/${chatId}`);
  }
}
```

---

## 8. 스와이프 제스처 통합

### 8.1 Chat 페이지에서 사용

```typescript
// pages/Chat/Chat.tsx
import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useSwipeDrawer } from '@/hooks/useSwipeDrawer';

const Chat = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // 스와이프로 사이드바 열기 (우→좌)
  const {
    isOpen: isSidebarOpen,
    open: openSidebar,
    close: closeSidebar,
    handlers: swipeHandlers,
  } = useSwipeDrawer({ direction: 'right' });

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    closeSidebar();
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    // 메시지 초기화 로직...
    closeSidebar();
  };

  return (
    <div className="flex h-full w-full flex-col" {...swipeHandlers}>
      {/* 헤더 */}
      <ChatHeader onMenuClick={openSidebar} />

      {/* 메시지 목록 */}
      <ChatMessageList /* ... */ />

      {/* 입력창 */}
      <ChatInputBar /* ... */ />

      {/* 사이드바 */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
    </div>
  );
};
```

---

## 9. 체크리스트

### 필수 구현

- [ ] `types/chat-sidebar.ts` - 타입 정의
- [ ] `utils/formatRelativeTime.ts` - 상대 시간 포맷
- [ ] `components/chat/ChatSidebar/ChatSidebar.tsx` - 메인 컴포넌트
- [ ] `components/chat/ChatSidebar/ChatSidebarHeader.tsx` - 검색 + 새 대화
- [ ] `components/chat/ChatSidebar/ChatSidebarList.tsx` - 목록 (무한 스크롤)
- [ ] `components/chat/ChatSidebar/ChatSidebarItem.tsx` - 개별 아이템
- [ ] `components/chat/ChatSidebar/ChatSidebarEmpty.tsx` - 빈 상태
- [ ] `hooks/useChatSidebar.ts` - 상태 관리 훅
- [ ] API 서비스 확장 (`getChats`, `createChat`, `deleteChat`)

### 선택적 구현

- [ ] 다크/라이트 테마 지원
- [ ] 보관함 (삭제된 대화) 섹션
- [ ] 대화 제목 수정 기능
- [ ] 키보드 네비게이션 (↑↓ 이동, Enter 선택)
- [ ] 드래그 앤 드롭 정렬

### 백엔드 의존성

| 기능 | API | 상태 |
|------|-----|------|
| 대화 목록 | `GET /api/v1/chat` | ✅ 구현됨 |
| 새 대화 생성 | `POST /api/v1/chat` | ✅ 구현됨 |
| 대화 삭제 | `DELETE /api/v1/chat/{id}` | ✅ 구현됨 |

---

## 10. 세션 자동 생성 흐름

세션이 없는 상태에서 사용자가 메시지를 입력하면 **프론트엔드에서 순차 호출**로 처리합니다.

### 10.1 흐름

```
[사용자] 첫 메시지 입력 ("페트병 버리는 법")
    │
    ▼
[프론트엔드] currentChatId === null?
    │
    ├─ Yes ─► POST /api/v1/chat     ← 세션 생성
    │              │
    │              ▼
    │         { id: "abc-123", title: null, ... }
    │              │
    │         setCurrentChatId("abc-123")
    │              │
    ▼              ▼
POST /api/v1/chat/abc-123/messages   ← 메시지 전송
    │
    ▼
{ job_id: "...", stream_url: "/sse/..." }
    │
    ▼
EventSource(stream_url)              ← SSE 연결
```

### 10.2 구현 코드

```typescript
// hooks/useChatStream.ts 또는 Chat.tsx

const [currentChatId, setCurrentChatId] = useState<string | null>(null);

const handleSend = async (text: string, imageUrl?: string) => {
  let chatId = currentChatId;

  // 1. 세션이 없으면 먼저 생성
  if (!chatId) {
    const newChat = await ChatService.createChat();
    chatId = newChat.id;
    setCurrentChatId(chatId);

    // 사이드바 목록 갱신
    queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
  }

  // 2. 사용자 메시지 UI에 즉시 추가
  addUserMessage(text);
  if (imageUrl) addUserMessage(imageUrl, 'image');

  // 3. 메시지 전송 + SSE 연결
  const { job_id, stream_url } = await ChatService.submitMessage(chatId, {
    message: text,
    image_url: imageUrl,
  });

  connectSSE(stream_url);
};
```

### 10.3 세션 제목 자동 설정

백엔드에서 첫 메시지 저장 시 `preview` 필드가 자동 업데이트됩니다:

```sql
-- conversations.preview = 첫 메시지 내용 (100자 제한)
UPDATE chat.conversations
SET preview = LEFT(message_content, 100),
    last_message_at = NOW()
WHERE id = chat_id;
```

사이드바에서는 `title || preview || '새 대화'` 순서로 표시합니다.

### 10.4 UX 고려사항

| 상황 | 처리 |
|------|------|
| 세션 생성 실패 | 에러 토스트, 재시도 버튼 표시 |
| 메시지 전송 실패 | 세션은 유지, 메시지만 재전송 UI |
| 네트워크 끊김 | 세션 ID는 로컬 저장 (새로고침 대비) |

---

**작성일**: 2026-01-19
**상태**: 설계 완료
