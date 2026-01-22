# Agent 페이지 설계

> 기존 Chat과 분리된 신규 Agent 페이지 설계
> SSE 토큰 스트리밍, 사이드바, 모델 선택 지원

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
│  Search Chats...                │  ← 검색 입력
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │     + 새 대화               ││  ← 새 대화 버튼
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  대화 목록                       │  ← 섹션 헤더
│                                 │
│  페트병 분리배출...         3d   │  ← 대화 아이템
│  음식물 쓰레기 처...        3d   │
│  캔 분류 방법이...          4d   │
│  종이팩 처리하는...         4d   │
│  플라스틱 용기 세...        5d   │
│  대형폐기물 배출...         9d   │
│  재활용 시세 조회...        9d   │
│                                 │
│  ··· 더 보기                    │  ← 페이지네이션
├─────────────────────────────────┤
│  보관함                          │  ← 삭제된 대화 (선택적)
│                                 │
│  오래된 대화...             30d  │
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
// types/agent.ts

export interface AgentSidebarItem {
  id: string;
  title: string;                  // title || preview || "새 대화"
  preview: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  isArchived?: boolean;
}

export interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export interface AgentSidebarItemProps {
  item: AgentSidebarItem;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export interface AgentSidebarSearchProps {
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
export function toAgentSidebarItem(
  response: ChatSummaryResponse
): AgentSidebarItem {
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

기존 `chat/` 컴포넌트와 분리하여 `agent/`로 신규 구성합니다.

```
src/
├── pages/
│   ├── Chat/                        ← 기존 (유지)
│   │   └── Chat.tsx
│   │
│   └── Agent/                       ← 신규
│       ├── Agent.tsx
│       └── index.ts
│
├── components/
│   ├── chat/                        ← 기존 (유지)
│   │   ├── ChatInputBar.tsx
│   │   ├── ChatMessageList.tsx
│   │   └── ChatEndWarningDialog.tsx
│   │
│   └── agent/                       ← 신규
│       ├── index.ts
│       │
│       ├── AgentContainer.tsx       # 레이아웃 컨테이너
│       ├── AgentHeader.tsx          # 헤더 (사이드바 토글)
│       ├── AgentMessageList.tsx     # 메시지 목록 (스트리밍)
│       ├── AgentInputBar.tsx        # 입력바 + 모델 선택
│       ├── AgentThinkingUI.tsx      # Thinking 상태 표시
│       │
│       ├── sidebar/
│       │   ├── AgentSidebar.tsx
│       │   ├── AgentSidebarHeader.tsx
│       │   ├── AgentSidebarList.tsx
│       │   ├── AgentSidebarItem.tsx
│       │   └── AgentSidebarEmpty.tsx
│       │
│       └── ModelSelector.tsx
│
├── hooks/
│   ├── useScanSSE.ts                ← 기존
│   │
│   └── agent/                       ← 신규
│       ├── useAgentStream.ts        # SSE 연결 + 토큰 처리
│       ├── useAgentSidebar.ts       # 사이드바 상태
│       ├── useAgentSession.ts       # 세션 관리
│       ├── useModelSelection.ts     # 모델 선택
│       └── useTypingAnimation.ts    # 타이핑 애니메이션
│
├── api/services/
│   └── agent/                       ← 신규
│       ├── agent.service.ts
│       ├── agent.type.ts
│       ├── agent.queries.ts
│       └── index.ts
│
├── types/
│   └── agent.ts                     ← 신규
│
└── utils/
    └── formatRelativeTime.ts        ← 신규
```

### 5.2 라우터 설정

**Phase 1: 병행 운영**
```typescript
// App.tsx
<Route path='chat' element={<Chat />} />      // 기존
<Route path='agent' element={<Agent />} />    // 신규 (테스트)
```

**Phase 2: 교체**
```typescript
// App.tsx
<Route path='chat' element={<Agent />} />     // agent로 교체
```

### 5.3 AgentSidebar.tsx (메인 컴포넌트)

```typescript
// components/agent/sidebar/AgentSidebar.tsx
import { useRef, useState } from 'react';
import { AgentSidebarHeader } from './AgentSidebarHeader';
import { AgentSidebarList } from './AgentSidebarList';
import { AgentSidebarEmpty } from './AgentSidebarEmpty';
import { useAgentSidebar } from '@/hooks/agent/useAgentSidebar';
import type { AgentSidebarProps } from '@/types/agent';

export const AgentSidebar = ({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: AgentSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  const {
    chats,
    archivedChats,
    isLoading,
    hasMore,
    fetchMore,
    isFetchingMore,
  } = useAgentSidebar({ searchQuery });

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
        <AgentSidebarHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewChat={onNewChat}
          onClose={onClose}
        />

        {/* 대화 목록 */}
        {isLoading ? (
          <AgentSidebarSkeleton />
        ) : filteredChats.length === 0 ? (
          <AgentSidebarEmpty
            hasSearchQuery={!!searchQuery}
            onNewChat={onNewChat}
          />
        ) : (
          <AgentSidebarList
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
const AgentSidebarSkeleton = () => (
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

### 5.3 AgentSidebarHeader.tsx

```typescript
// components/agent/sidebar/AgentSidebarHeader.tsx
import { SearchIcon, PlusIcon, XIcon } from '@/assets/icons';

interface AgentSidebarHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export const AgentSidebarHeader = ({
  searchQuery,
  onSearchChange,
  onNewChat,
  onClose,
}: AgentSidebarHeaderProps) => {
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

### 5.4 AgentSidebarItem.tsx

```typescript
// components/agent/sidebar/AgentSidebarItem.tsx
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { MessageIcon, TrashIcon } from '@/assets/icons';
import type { AgentSidebarItem as AgentSidebarItemType } from '@/types/agent';

interface AgentSidebarItemProps {
  item: AgentSidebarItemType;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export const AgentSidebarItem = ({
  item,
  isActive,
  onClick,
  onDelete,
}: AgentSidebarItemProps) => {
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

### 5.5 AgentSidebarList.tsx

```typescript
// components/agent/sidebar/AgentSidebarList.tsx
import { useRef, useCallback } from 'react';
import { AgentSidebarItem } from './AgentSidebarItem';
import type { AgentSidebarItem as AgentSidebarItemType } from '@/types/agent';

interface AgentSidebarListProps {
  chats: AgentSidebarItemType[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export const AgentSidebarList = ({
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: AgentSidebarListProps) => {
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
          <AgentSidebarItem
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

### 5.6 AgentSidebarEmpty.tsx

```typescript
// components/agent/sidebar/AgentSidebarEmpty.tsx
import { MessageIcon, PlusIcon } from '@/assets/icons';

interface AgentSidebarEmptyProps {
  hasSearchQuery: boolean;
  onNewChat: () => void;
}

export const AgentSidebarEmpty = ({
  hasSearchQuery,
  onNewChat,
}: AgentSidebarEmptyProps) => {
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

### 6.1 useAgentSidebar.ts

```typescript
// hooks/useAgentSidebar.ts
import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatService, toAgentSidebarItem } from '@/api/services/chat';
import type { AgentSidebarItem } from '@/types/agent';

interface UseAgentSidebarOptions {
  searchQuery?: string;
}

interface UseAgentSidebarReturn {
  chats: AgentSidebarItem[];
  archivedChats: AgentSidebarItem[];
  isLoading: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  isFetchingMore: boolean;
  createChat: () => Promise<string>;
  deleteChat: (chatId: string) => Promise<void>;
}

export const useAgentSidebar = ({
  searchQuery,
}: UseAgentSidebarOptions = {}): UseAgentSidebarReturn => {
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
      .map(toAgentSidebarItem);
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
import { AgentSidebar } from '@/components/agent/sidebar';
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
      <AgentSidebar
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

- [ ] `types/agent.ts` - 타입 정의
- [ ] `utils/formatRelativeTime.ts` - 상대 시간 포맷
- [ ] `components/agent/sidebar/AgentSidebar.tsx` - 메인 컴포넌트
- [ ] `components/agent/sidebar/AgentSidebarHeader.tsx` - 검색 + 새 대화
- [ ] `components/agent/sidebar/AgentSidebarList.tsx` - 목록 (무한 스크롤)
- [ ] `components/agent/sidebar/AgentSidebarItem.tsx` - 개별 아이템
- [ ] `components/agent/sidebar/AgentSidebarEmpty.tsx` - 빈 상태
- [ ] `hooks/useAgentSidebar.ts` - 상태 관리 훅
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
    │
    ▼
token 이벤트 수신 → 타이핑 효과로 출력
```

---

## 10.5 SSE 토큰 스트리밍 상세

### 10.5.1 이벤트 흐름

```
[EventSource 연결]
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  event: intent (started)    → "어떤 건지 파악해볼게요"         │
│  event: intent (completed)  → "아, 분리배출 궁금하시군요!"     │
│  event: router (completed)  → "필요한 정보 찾아볼게요"         │
│  event: answer (started)    → "정리해서 알려드릴게요"          │
├──────────────────────────────────────────────────────────────┤
│  event: token {content:"유", seq:1001}  → 메시지에 "유" 추가   │
│  event: token {content:"리", seq:1002}  → 메시지에 "리" 추가   │
│  event: token {content:"병", seq:1003}  → 메시지에 "병" 추가   │
│  event: token {content:"은", seq:1004}  → ...                 │
│  ... (100~200개 토큰)                                         │
├──────────────────────────────────────────────────────────────┤
│  event: done (completed)    → 완료, EventSource.close()       │
└──────────────────────────────────────────────────────────────┘
```

### 10.5.2 TypeScript 타입

```typescript
// types/agent.ts

// SSE 이벤트 타입
type SSEEventType =
  | 'token'           // 실시간 토큰 스트리밍
  | 'token_recovery'  // 늦은 구독자용 스냅샷
  | 'intent'          // Intent 분류
  | 'router'          // 라우팅
  | 'answer'          // 답변 생성 상태
  | 'done'            // 완료
  | 'error'           // 에러
  | 'keepalive';      // 연결 유지

// 토큰 이벤트 (가장 중요!)
interface TokenEvent {
  content: string;    // 토큰 텍스트 ("유", "리", "병" ...)
  seq: number;        // 시퀀스 번호 (1001부터 시작)
  node: string;       // "answer"
}

// 토큰 복구 이벤트 (늦은 연결 시)
interface TokenRecoveryEvent {
  stage: 'token_recovery';
  status: 'snapshot';
  accumulated: string;  // 누적된 전체 답변
  last_seq: number;
  completed: boolean;
}

// Stage 이벤트
interface StageEvent {
  job_id: string;
  stage: string;
  status: 'started' | 'completed';
  seq: number;
  progress: number;
  result: any;
  message: string;
}
```

### 10.5.3 useAgentStream Hook

```typescript
// hooks/agent/useAgentStream.ts

import { useState, useCallback, useRef } from 'react';

interface UseAgentStreamOptions {
  onStageChange?: (stage: string, status: string, message: string) => void;
  onComplete?: (answer: string) => void;
  onError?: (error: string) => void;
}

interface UseAgentStreamReturn {
  streamingText: string;       // 현재까지 누적된 텍스트
  isStreaming: boolean;        // 스트리밍 중 여부
  currentStage: string | null; // 현재 stage
  connect: (streamUrl: string) => void;
  disconnect: () => void;
}

export const useAgentStream = ({
  onStageChange,
  onComplete,
  onError,
}: UseAgentStreamOptions = {}): UseAgentStreamReturn => {
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback((streamUrl: string) => {
    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStreamingText('');
    setIsStreaming(true);

    const eventSource = new EventSource(streamUrl, {
      withCredentials: true,
    });
    eventSourceRef.current = eventSource;

    // 토큰 스트리밍 (핵심!)
    eventSource.addEventListener('token', (event) => {
      const data: TokenEvent = JSON.parse(event.data);
      // 토큰을 누적하여 타이핑 효과
      setStreamingText((prev) => prev + data.content);
    });

    // 토큰 복구 (늦은 연결 시)
    eventSource.addEventListener('token_recovery', (event) => {
      const data: TokenRecoveryEvent = JSON.parse(event.data);
      // 누적된 전체 텍스트로 대체
      setStreamingText(data.accumulated);
      if (data.completed) {
        setIsStreaming(false);
        onComplete?.(data.accumulated);
      }
    });

    // Stage 이벤트 (Thinking UI용)
    const stageHandler = (stageName: string) => (event: MessageEvent) => {
      const data: StageEvent = JSON.parse(event.data);
      setCurrentStage(stageName);
      onStageChange?.(stageName, data.status, data.message);
    };

    eventSource.addEventListener('intent', stageHandler('intent'));
    eventSource.addEventListener('router', stageHandler('router'));
    eventSource.addEventListener('answer', stageHandler('answer'));

    // 완료
    eventSource.addEventListener('done', (event) => {
      const data: StageEvent = JSON.parse(event.data);
      setIsStreaming(false);
      setCurrentStage(null);
      onComplete?.(data.result?.answer || streamingText);
      eventSource.close();
    });

    // 에러
    eventSource.addEventListener('error', (event) => {
      console.error('SSE Error:', event);
      setIsStreaming(false);
      onError?.('스트리밍 연결 오류');
      eventSource.close();
    });

    // keepalive (무시)
    eventSource.addEventListener('keepalive', () => {
      // 연결 유지용, 별도 처리 불필요
    });
  }, [onStageChange, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    streamingText,
    isStreaming,
    currentStage,
    connect,
    disconnect,
  };
};
```

### 10.5.4 AgentMessageList 컴포넌트

```typescript
// components/agent/AgentMessageList.tsx

interface AgentMessageListProps {
  messages: Message[];
  streamingText: string;  // 현재 스트리밍 중인 텍스트
  isStreaming: boolean;
}

export const AgentMessageList = ({
  messages,
  streamingText,
  isStreaming,
}: AgentMessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 기존 메시지들 */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 스트리밍 중인 메시지 (타이핑 효과) */}
      {isStreaming && streamingText && (
        <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#333]" />
          <div className="flex-1 bg-[#2a2a2a] rounded-lg p-3">
            <p className="text-white whitespace-pre-wrap">
              {streamingText}
              <span className="animate-pulse">▊</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 10.5.5 Agent 페이지 통합

```typescript
// pages/Agent/Agent.tsx

import { useState } from 'react';
import { useAgentStream } from '@/hooks/agent/useAgentStream';
import { useAgentSession } from '@/hooks/agent/useAgentSession';
import { AgentService } from '@/api/services/agent';

const Agent = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);

  const { currentChatId, createSession } = useAgentSession();

  const {
    streamingText,
    isStreaming,
    currentStage,
    connect,
  } = useAgentStream({
    onStageChange: (stage, status, message) => {
      // Thinking UI 업데이트
      setThinkingMessage(getStageMessage(stage, status));
    },
    onComplete: (answer) => {
      // 완료 시 메시지 목록에 추가
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: answer },
      ]);
      setThinkingMessage(null);
    },
  });

  const handleSend = async (text: string, model: string) => {
    // 1. 사용자 메시지 즉시 표시
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text },
    ]);

    // 2. 세션 생성 (없으면)
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createSession();
    }

    // 3. 메시지 전송 → stream_url 받기
    const { stream_url } = await AgentService.sendMessage(chatId, {
      message: text,
      model,
    });

    // 4. SSE 연결 → 토큰 스트리밍 시작
    connect(stream_url);
  };

  return (
    <AgentContainer>
      <AgentHeader />

      {/* Thinking UI */}
      {thinkingMessage && (
        <AgentThinkingUI message={thinkingMessage} />
      )}

      {/* 메시지 목록 + 스트리밍 */}
      <AgentMessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
      />

      <AgentInputBar onSend={handleSend} disabled={isStreaming} />
    </AgentContainer>
  );
};

// Stage → 메시지 매핑
function getStageMessage(stage: string, status: string): string {
  const messages: Record<string, Record<string, string>> = {
    intent: {
      started: '어떤 건지 파악해볼게요',
      completed: '질문 파악 완료!',
    },
    router: {
      completed: '필요한 정보 찾아볼게요',
    },
    answer: {
      started: '정리해서 알려드릴게요',
    },
  };
  return messages[stage]?.[status] || '';
}
```

### 10.5.6 타이핑 효과 CSS

```css
/* 커서 깜빡임 */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.animate-cursor {
  animation: blink 0.8s step-end infinite;
}
```

### 10.5.7 시퀀스 다이어그램

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  User    │      │ Frontend │      │  API     │      │   SSE    │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ "페트병 버리는 법"│                 │                 │
     │────────────────>│                 │                 │
     │                 │                 │                 │
     │                 │ POST /messages  │                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │ {stream_url}    │                 │
     │                 │<────────────────│                 │
     │                 │                 │                 │
     │                 │ EventSource(url)│                 │
     │                 │─────────────────────────────────>│
     │                 │                 │                 │
     │                 │      event: intent (started)     │
     │                 │<─────────────────────────────────│
     │ "어떤 건지..."   │                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │                 │      event: token {content:"유"} │
     │                 │<─────────────────────────────────│
     │ "유"            │                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │                 │      event: token {content:"리"} │
     │                 │<─────────────────────────────────│
     │ "유리"          │                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │       ...       │      (100~200 tokens)            │
     │                 │                 │                 │
     │                 │      event: done                 │
     │                 │<─────────────────────────────────│
     │ 완료!           │                 │                 │
     │<────────────────│                 │                 │
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

## 11. 새 채팅 생성 애니메이션 (Claude 스타일)

새 채팅 생성 시 사이드바에서 보여지는 UX 애니메이션을 상세히 설계합니다.

### 11.1 상태 전이 흐름

```
[사용자 메시지 입력]
       │
       ▼
┌─────────────────────────────────┐
│ State 1: CREATING               │
│ ─────────────────────────────── │
│ New Chat (loading)              │  ← 사이드바 상단에 즉시 추가
│    ↑ 새로 추가됨                 │
│ 이전 대화...               3d   │
│ 또 다른 대화...             4d   │
└─────────────────────────────────┘
       │
       │ (SSE 연결, 응답 대기중)
       ▼
┌─────────────────────────────────┐
│ State 2: STREAMING              │
│ ─────────────────────────────── │
│ New Chat (loading)              │  ← 여전히 로딩 중
│ 이전 대화...               3d   │
└─────────────────────────────────┘
       │
       │ (done 이벤트 수신 - 제목 생성)
       ▼
┌─────────────────────────────────┐
│ State 3: TITLE_ANIMATING        │
│ ─────────────────────────────── │
│ 페트병 분리배█                  │  ← 타이핑 애니메이션
│ 이전 대화...               3d   │
└─────────────────────────────────┘
       │
       │ (애니메이션 완료)
       ▼
┌─────────────────────────────────┐
│ State 4: COMPLETE               │
│ ─────────────────────────────── │
│ 페트병 분리배출 방법...    방금   │  ← 최종 상태
│ 이전 대화...               3d   │
└─────────────────────────────────┘
```

### 11.2 AgentSidebarItem 상태 타입

```typescript
// types/agent.ts

export type ChatItemStatus =
  | 'idle'              // 일반 상태
  | 'creating'          // 생성 중 (API 호출)
  | 'streaming'         // 응답 스트리밍 중
  | 'title_animating'   // 제목 타이핑 애니메이션 중
  | 'complete';         // 완료

export interface AgentSidebarItem {
  id: string;
  title: string;                  // "New Chat" → "페트병 분리배출..."
  preview: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;

  // 애니메이션 상태
  status: ChatItemStatus;
  animatingTitle?: string;        // 타이핑 중인 제목 (부분 문자열)
}
```

### 11.3 AgentSidebarItem 컴포넌트 (애니메이션 지원)

```typescript
// components/agent/sidebar/AgentSidebarItem.tsx

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { MessageIcon, SpinnerIcon } from '@/assets/icons';
import type { AgentSidebarItem as AgentSidebarItemType } from '@/types/agent';

interface AgentSidebarItemProps {
  item: AgentSidebarItemType;
  isActive: boolean;
  onClick: () => void;
}

export const AgentSidebarItem = ({
  item,
  isActive,
  onClick,
}: AgentSidebarItemProps) => {
  const isLoading = item.status === 'creating' || item.status === 'streaming';
  const isAnimating = item.status === 'title_animating';

  // 표시할 제목 결정
  const displayTitle = isAnimating
    ? item.animatingTitle || ''
    : item.title;

  const relativeTime = formatRelativeTime(item.lastMessageAt || item.createdAt);

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-200 ${
        isActive
          ? 'bg-[#333] text-white'
          : 'text-[#ccc] hover:bg-[#2a2a2a] hover:text-white'
      } ${item.status === 'creating' ? 'animate-slide-in' : ''}`}
    >
      {/* 아이콘 */}
      <MessageIcon className="h-5 w-5 flex-shrink-0 text-[#666]" />

      {/* 제목 + 타이핑 커서 */}
      <span className="flex-1 truncate text-sm">
        {displayTitle}
        {isAnimating && (
          <span className="animate-pulse text-[#888]">▊</span>
        )}
      </span>

      {/* 로딩 스피너 또는 시간 */}
      {isLoading ? (
        <SpinnerIcon className="h-4 w-4 flex-shrink-0 animate-spin text-[#666]" />
      ) : (
        <span className="flex-shrink-0 text-xs text-[#666]">
          {relativeTime}
        </span>
      )}
    </button>
  );
};
```

### 11.4 타이핑 애니메이션 Hook

```typescript
// hooks/useTypingAnimation.ts

import { useState, useEffect, useCallback } from 'react';

interface UseTypingAnimationOptions {
  text: string;
  speed?: number;           // ms per character (default: 30)
  startDelay?: number;      // 시작 전 딜레이 (default: 0)
  onComplete?: () => void;
}

interface UseTypingAnimationReturn {
  displayText: string;
  isAnimating: boolean;
  start: () => void;
  reset: () => void;
}

export const useTypingAnimation = ({
  text,
  speed = 30,
  startDelay = 0,
  onComplete,
}: UseTypingAnimationOptions): UseTypingAnimationReturn => {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  const start = useCallback(() => {
    setDisplayText('');
    setCharIndex(0);
    setIsAnimating(true);
  }, []);

  const reset = useCallback(() => {
    setDisplayText('');
    setCharIndex(0);
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;

    // 시작 딜레이
    if (charIndex === 0 && startDelay > 0) {
      const delayTimer = setTimeout(() => {
        setCharIndex(1);
      }, startDelay);
      return () => clearTimeout(delayTimer);
    }

    // 타이핑 완료
    if (charIndex >= text.length) {
      setIsAnimating(false);
      setDisplayText(text);
      onComplete?.();
      return;
    }

    // 한 글자씩 추가
    const timer = setTimeout(() => {
      setDisplayText(text.slice(0, charIndex + 1));
      setCharIndex((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isAnimating, charIndex, text, speed, startDelay, onComplete]);

  return { displayText, isAnimating, start, reset };
};
```

### 11.5 사이드바 상태 관리 (새 채팅 애니메이션)

```typescript
// hooks/useAgentSidebar.ts (확장)

import { useState, useCallback } from 'react';
import { useTypingAnimation } from './useTypingAnimation';
import type { AgentSidebarItem, ChatItemStatus } from '@/types/agent';

export const useAgentSidebar = () => {
  const [chats, setChats] = useState<AgentSidebarItem[]>([]);
  const [newChatId, setNewChatId] = useState<string | null>(null);

  /**
   * 새 채팅 생성 시작 - "New Chat" + 로딩 상태로 상단에 추가
   */
  const startNewChat = useCallback((chatId: string) => {
    const newChat: AgentSidebarItem = {
      id: chatId,
      title: 'New Chat',
      preview: null,
      messageCount: 0,
      lastMessageAt: null,
      createdAt: new Date(),
      status: 'creating',
    };

    // 상단에 추가 (애니메이션과 함께)
    setChats((prev) => [newChat, ...prev]);
    setNewChatId(chatId);
  }, []);

  /**
   * 스트리밍 시작 - 상태 변경
   */
  const setStreaming = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, status: 'streaming' } : chat
      )
    );
  }, []);

  /**
   * 응답 완료 - 제목 애니메이션 시작
   */
  const setTitleWithAnimation = useCallback(
    (chatId: string, title: string) => {
      // 1. 타이핑 애니메이션 상태로 변경
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, status: 'title_animating', title, animatingTitle: '' }
            : chat
        )
      );

      // 2. 타이핑 애니메이션 (30ms per char)
      let charIndex = 0;
      const interval = setInterval(() => {
        charIndex++;
        if (charIndex > title.length) {
          clearInterval(interval);
          // 애니메이션 완료
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, status: 'complete', animatingTitle: undefined }
                : chat
            )
          );
          setNewChatId(null);
          return;
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, animatingTitle: title.slice(0, charIndex) }
              : chat
          )
        );
      }, 30);
    },
    []
  );

  /**
   * 에러 발생 - 로딩 상태 해제
   */
  const setError = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, status: 'idle', title: 'New Chat (오류)' }
          : chat
      )
    );
    setNewChatId(null);
  }, []);

  return {
    chats,
    newChatId,
    startNewChat,
    setStreaming,
    setTitleWithAnimation,
    setError,
    // ... 기존 메서드들
  };
};
```

### 11.6 Chat 페이지 통합

```typescript
// pages/Chat/Chat.tsx (핵심 부분)

const Chat = () => {
  const {
    chats,
    startNewChat,
    setStreaming,
    setTitleWithAnimation,
    setError,
  } = useAgentSidebar();

  const handleSend = async (text: string, imageUrl?: string) => {
    let chatId = currentChatId;

    // 1. 세션이 없으면 새로 생성
    if (!chatId) {
      const newChat = await ChatService.createChat();
      chatId = newChat.id;
      setCurrentChatId(chatId);

      // [Animation] 사이드바에 "New Chat" + 로딩 상태로 추가
      startNewChat(chatId);
    }

    // 2. 메시지 전송
    const { job_id, stream_url } = await ChatService.submitMessage(chatId, {
      message: text,
      image_url: imageUrl,
    });

    // [Animation] 스트리밍 상태로 변경
    setStreaming(chatId);

    // 3. SSE 연결
    const eventSource = new EventSource(stream_url);

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      const answer = data.result?.answer || '';

      // [Animation] 제목 생성 및 타이핑 애니메이션
      // 첫 메시지를 기반으로 제목 생성 (30자 제한)
      const title = generateTitle(text, answer);
      setTitleWithAnimation(chatId, title);

      eventSource.close();
    });

    eventSource.addEventListener('error', () => {
      setError(chatId);
      eventSource.close();
    });
  };

  // ...
};

/**
 * 대화 제목 생성 (첫 질문 기반)
 */
function generateTitle(userMessage: string, _answer?: string): string {
  // 방법 1: 첫 질문 자체를 제목으로 (단순)
  const maxLength = 25;
  if (userMessage.length <= maxLength) {
    return userMessage;
  }
  return userMessage.slice(0, maxLength - 3) + '...';

  // 방법 2: 백엔드에서 LLM으로 요약 제목 생성 (고급)
  // return await ChatService.generateTitle(chatId);
}
```

### 11.7 CSS 애니메이션

```css
/* styles/animations.css 또는 tailwind.config.js */

/* 슬라이드 인 애니메이션 (새 아이템 추가) */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.2s ease-out;
}

/* 프로그레스 링 (스피너) */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* 타이핑 커서 깜빡임 */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.animate-cursor-blink {
  animation: blink 0.8s step-end infinite;
}
```

### 11.8 SpinnerIcon 컴포넌트

```typescript
// assets/icons/SpinnerIcon.tsx

interface SpinnerIconProps {
  className?: string;
}

export const SpinnerIcon = ({ className }: SpinnerIconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="31.4 31.4"
      strokeDashoffset="10"
    />
  </svg>
);
```

### 11.9 전체 타임라인 요약

| 시점 | 사이드바 상태 | UI 표시 |
|------|-------------|---------|
| **T+0ms** | `creating` | "New Chat" (loading), 상단에 슬라이드 인 |
| **T+100ms** | `streaming` | "New Chat" (loading) |
| **T+3000ms** | `title_animating` | "페█" → "페트█" → "페트병█" ... |
| **T+4000ms** | `complete` | "페트병 분리배출 방법..." + "방금" |

### 11.10 제목 생성 전략

| 방법 | 설명 | 장단점 |
|------|------|--------|
| **첫 질문 truncate** | `userMessage.slice(0, 25)` | 간단, 즉시 표시 |
| **백엔드 preview** | `done.result.persistence.user_message` | 백엔드 일관성 |
| **LLM 요약** | 별도 API로 제목 요약 생성 | 고품질, 추가 API 필요 |

현재 설계는 **첫 질문 truncate** 방식을 기본으로 하고, 추후 백엔드에서 제목 요약 기능 추가 가능합니다.

---

## 12. 모델 선택 드롭다운

입력창 하단에 LLM 모델을 선택할 수 있는 드롭다운을 제공합니다.

### 12.1 UI 레이아웃

```
기본 상태:
┌─────────────────────────────────────────────────────┐
│  무엇이든 부탁하세요                                  │
├─────────────────────────────────────────────────────┤
│  +  (icons...)                        GPT-5.2       │
└─────────────────────────────────────────────────────┘

클릭 시 (상단으로 메뉴 표시):
                              ┌─────────────────────┐
                              │ GPT-5.2           ✓ │
                              │ Gemini 3 Flash      │
                              └─────────────────────┘
┌─────────────────────────────────────────────────────┐
│  무엇이든 부탁하세요                                  │
├─────────────────────────────────────────────────────┤
│  +  (icons...)                        GPT-5.2       │
└─────────────────────────────────────────────────────┘
```

### 12.2 지원 모델 목록

| 모델 ID | 표시 이름 | 설명 |
|---------|----------|------|
| `gpt-5.2` | GPT-5.2 | OpenAI GPT-5.2 |
| `gemini-3-flash` | Gemini 3 Flash | Google Gemini 3.0 Flash |

### 12.3 TypeScript Types

```typescript
// types/chat.ts

export type ModelId = 'gpt-5.2' | 'gemini-3-flash';

export interface ModelOption {
  id: ModelId;
  name: string;
  description?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gpt-5.2', name: 'GPT-5.2' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
];

export const DEFAULT_MODEL: ModelId = 'gpt-5.2';
```

### 12.4 ModelSelector 컴포넌트

```typescript
// components/chat/ModelSelector.tsx

import { useState, useRef, useEffect } from 'react';
import { AVAILABLE_MODELS } from '@/types/chat';
import type { ModelId } from '@/types/chat';

interface ModelSelectorProps {
  value: ModelId;
  onChange: (modelId: ModelId) => void;
  disabled?: boolean;
}

export const ModelSelector = ({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === value);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelId: ModelId) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 선택 버튼 - 텍스트만, 화살표 없음 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`text-sm transition-colors ${
          disabled
            ? 'cursor-not-allowed text-[#666]'
            : 'text-[#888] hover:text-white'
        }`}
      >
        {selectedModel?.name || 'Model'}
      </button>

      {/* 팝업 메뉴 - 상단으로 표시 */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 min-w-[180px] rounded-xl border border-[#444] bg-[#2a2a2a] py-2 shadow-xl">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors text-[#ccc] hover:bg-[#333]"
            >
              <span>{model.name}</span>
              {model.id === value && (
                <CheckIcon className="h-4 w-4 text-white" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);
```

### 12.5 ChatInputBar 통합

```typescript
// components/chat/ChatInputBar.tsx

import { useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { DEFAULT_MODEL } from '@/types/chat';
import type { ModelId } from '@/types/chat';

interface ChatInputBarProps {
  onSend: (text: string, imageUrl?: string, model?: ModelId) => Promise<void>;
  isDisabled: boolean;
}

const ChatInputBar = ({ onSend, isDisabled }: ChatInputBarProps) => {
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);

  const handleSend = async () => {
    if (isDisabled || !text.trim()) return;
    const currentText = text;
    setText('');
    await onSend(currentText, undefined, selectedModel);
  };

  return (
    <div className="border-t border-[#333] bg-[#1a1a1a]">
      {/* 입력 영역 */}
      <div className="px-4 py-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="무엇이든 부탁하세요"
          disabled={isDisabled}
          className="w-full bg-transparent text-white placeholder-[#666] outline-none"
        />
      </div>

      {/* 하단 툴바 */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* 좌측: 기타 아이콘들 (추후 확장) */}
        <div className="flex items-center gap-3">
          {/* + 버튼, 웹검색 등 */}
        </div>

        {/* 우측: 모델 선택 (텍스트만) */}
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
};
```

### 12.6 API 요청에 모델 포함

```typescript
// api/services/chat/chat.service.ts

export interface SubmitMessageRequest {
  message: string;
  image_url?: string;
  model?: string;  // 모델 ID 추가
}

export class ChatService {
  static async submitMessage(
    chatId: string,
    request: SubmitMessageRequest
  ) {
    return api
      .post(`/api/v1/chat/${chatId}/messages`, request)
      .then((res) => res.data);
  }
}
```

### 12.7 상태 관리 (선택된 모델 유지)

```typescript
// hooks/useModelSelection.ts

import { useState, useCallback } from 'react';
import { DEFAULT_MODEL } from '@/types/chat';
import type { ModelId } from '@/types/chat';

const STORAGE_KEY = 'chat_selected_model';

export const useModelSelection = () => {
  // 로컬 스토리지에서 초기값 로드
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ModelId) || DEFAULT_MODEL;
  });

  const changeModel = useCallback((modelId: ModelId) => {
    setSelectedModel(modelId);
    localStorage.setItem(STORAGE_KEY, modelId);
  }, []);

  return {
    selectedModel,
    changeModel,
  };
};
```

### 12.8 백엔드 연동

백엔드 `SubmitChatRequest`에 `model` 필드가 이미 존재합니다:

```python
# apps/chat/presentation/http/controllers/chat.py

class SendMessageRequest(BaseModel):
    message: str
    image_url: HttpUrl | None = None
    user_location: UserLocation | None = None
    model: str | None = None  # LLM 모델 override
```

프론트엔드에서 전송 시:

```typescript
await ChatService.submitMessage(chatId, {
  message: text,
  model: selectedModel,  // 'gpt-5.2' or 'gemini-3-flash'
});
```

---

**작성일**: 2026-01-19
**상태**: 설계 완료
