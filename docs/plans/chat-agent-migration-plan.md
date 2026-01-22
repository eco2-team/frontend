# Chat Agent 마이그레이션 계획

> 백엔드 Chat 에이전트화에 따른 프론트엔드 Chat 파트 전면 개편
> UI는 ChatGPT처럼 단순하게 구성

---

## 0. Executive Summary

### Backend Reference

> **SSE Event Format 상세**: [`backend-token-streaming/.claude/skills/chat-agent-flow/references/sse-event-format.md`](../../../backend-token-streaming/.claude/skills/chat-agent-flow/references/sse-event-format.md)
>
> **Token Streaming Fix Report**: [`backend-token-streaming/docs/reports/token-streaming-fix-report.md`](../../../backend-token-streaming/docs/reports/token-streaming-fix-report.md)

### 핵심 의사결정

| 항목 | 결정 | 근거 |
|------|------|------|
| **SSE 스트리밍** | EventSource 기반 구현 | 백엔드 SSE Gateway 활용, 실시간 응답 |
| **상태 관리** | React Query + 커스텀 Hook | 기존 scan 패턴과 일관성 유지 |
| **UI 디자인** | ChatGPT 5.2 스타일 (미니멀) | 텍스트 기반, 아이콘 최소화 |
| **Thinking UI** | Expandable 텍스트 | 처리 중 상태 텍스트 + 펼침/접힘 상세 |
| **로딩 표시** | 단계별 자연어 메시지 | "질문을 분석하고 있어요" 스타일 |
| **에러 처리** | 인라인 메시지 | 모달 없이 채팅창 내 표시 |
| **세션 히스토리** | 서버 저장 + 무한 스크롤 | 이전 대화 기록 조회 지원 |
| **사이드바** | 우측 스와이프 Drawer | 세션 목록 네비게이션 |

### 아키텍처 변경: REST Polling → SSE Streaming

**변경 이유:**
1. **실시간 응답**: LLM 토큰 스트리밍으로 즉각적인 피드백
2. **UX 개선**: ChatGPT처럼 글자가 타이핑되는 효과
3. **백엔드 호환**: chat_worker LangGraph + SSE Gateway 인프라 활용

### API 흐름 변경

```
AS-IS (REST Polling)
====================
Client -> POST /chat/messages -> 응답 대기 (10-30초) -> JSON Response


TO-BE (SSE Streaming) - 2026-01-19 검증 완료
=============================================
Client -> POST /chat -> { job_id } (즉시)
       -> EventSource(/chat/{job_id}/events)
          <- event: intent          (의도 분류됨)
          <- event: router          (라우팅 완료)
          <- event: answer          (답변 생성 시작)
          <- event: token           (토큰 스트리밍 - seq: 1001, 1002, ...)
          <- event: token           (토큰 스트리밍)
          <- event: answer          (답변 생성 완료)
          <- event: done            (완료 + 최종 결과)

※ 늦은 구독 시:
       -> EventSource(/chat/{job_id}/events)  (늦게 연결)
          <- event: token_recovery  (누적 텍스트 스냅샷 - 한 번에 전체 답변)
```

### UI 변경: ChatGPT 5.2 스타일 (미니멀 Thinking UI)

```
처리 중 (텍스트가 단계별로 변경)
================================
┌────────────────────────────┐
│ User: 페트병 어떻게 버려?   │
├────────────────────────────┤
│ 질문을 분석하고 있어요      │  ← 자연어 상태 메시지
└────────────────────────────┘

       ↓ (단계 진행)

┌────────────────────────────┐
│ 관련 규정을 찾고 있어요     │
└────────────────────────────┘

       ↓ (토큰 스트리밍 시작)

┌────────────────────────────┐
│ 페트병은 내용물을 비우고█   │
└────────────────────────────┘


완료 후 (펼침/접힘 가능)
================================
┌────────────────────────────┐
│ User: 페트병 어떻게 버려?   │
├────────────────────────────┤
│ ▶ 3초간 생각함             │  ← 접힌 상태 (기본)
│                            │
│ 페트병은 내용물을 비우고    │
│ 라벨을 제거한 후 분리수거   │
│ 함에 넣으시면 됩니다.       │
└────────────────────────────┘

탭하면 펼침:
┌────────────────────────────┐
│ ▼ 3초간 생각함             │
│ ┌────────────────────────┐ │
│ │ 분리배출 안내로 판단    │ │
│ │ KECO 규정 1건 참조      │ │
│ └────────────────────────┘ │
│                            │
│ 페트병은 내용물을 비우고... │
└────────────────────────────┘
```

### 세션 히스토리 + 사이드바 네비게이션

```
┌──────────────────────────────────────────────────────────────┐
│  [☰]  Eco² Chat                                    [≡]      │  <- 우측 상단 햄버거 메뉴
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────┐                            │
│  │ 이전 메시지들...              │  ← 스크롤 올리면 이전 기록  │
│  │ ↑ 로딩 (무한 스크롤)          │                            │
│  └──────────────────────────────┘                            │
│                                                              │
│  User: 페트병 어떻게 버려?                                    │
│  Eco: 페트병은...                                            │
│                                                              │
│  [입력창]                                                    │
└──────────────────────────────────────────────────────────────┘

우→좌 스와이프 시 사이드바 오픈:

┌─────────────────────────────────────────┬───────────────────┐
│                                         │  세션 목록        │
│  (채팅 영역 - 어두워짐)                   │                   │
│                                         │  [+] 새 대화      │
│                                         │  ─────────────    │
│                                         │  📅 오늘          │
│                                         │  • 페트병 분리...  │
│                                         │  • 음식물 쓰레...  │
│                                         │                   │
│                                         │  📅 어제          │
│                                         │  • 캔 분류 방법   │
│                                         │  • 종이팩 처리    │
│                                         │                   │
│                                         │  📅 지난 7일      │
│                                         │  • ...            │
└─────────────────────────────────────────┴───────────────────┘
```

---

## 1. 현재 구조 분석 (AS-IS)

### 1.1 파일 구조

```
src/
├── pages/Chat/
│   └── Chat.tsx              # 페이지 컴포넌트 (로컬 상태 관리)
├── components/chat/
│   ├── ChatMessageList.tsx   # 메시지 렌더링
│   ├── ChatInputBar.tsx      # 입력 + API 호출 (문제: 컴포넌트에 비즈니스 로직)
│   └── ChatEndWarningDialog.tsx
└── constants/
    └── ChatConfig.ts         # 상수 정의
```

### 1.2 현재 API 흐름

```typescript
// ChatInputBar.tsx - 현재 구현
const handleSend = async () => {
  // 1. 이미지 업로드 (선택)
  if (imageFile) {
    const { data } = await api.post('/api/v1/images/chat', fileMeta);
    await axios.put(presignedUrl, imageFile);
    cdnUrl = data.cdn_url;
  }

  // 2. 메시지 전송 (Polling - 응답 대기)
  const response = await api.post('/api/v1/chat/messages', {
    session_id: sessionId,
    message: text,
    image_url: cdnUrl,
  });

  // 3. 응답 처리
  addMessage('assistant', response.data.user_answer, 'text');
};
```

### 1.3 현재 문제점

| 문제 | 설명 | 영향 |
|------|------|------|
| **긴 대기 시간** | LLM 응답 10-30초 동안 로딩 표시만 | UX 저하 |
| **비즈니스 로직 위치** | ChatInputBar에 API 호출 직접 구현 | 유지보수 어려움 |
| **상태 관리 불일치** | useState만 사용 (React Query 미사용) | scan과 패턴 불일치 |
| **에러 처리 미흡** | try-catch만, 사용자 피드백 부족 | 오류 시 혼란 |

---

## 2. 목표 구조 (TO-BE)

### 2.1 파일 구조

```
src/
├── api/services/chat/
│   ├── chat.service.ts       # API 호출 (submit, input, sessions, messages)
│   ├── chat.mutation.ts      # React Query mutation
│   ├── chat.queries.ts       # React Query queries (세션/메시지 조회)
│   └── chat.type.ts          # 타입 정의
│
├── hooks/
│   ├── useSSE.ts             # SSE 연결 관리 (범용)
│   ├── useChatStream.ts      # Chat 전용 SSE + 메시지 상태
│   ├── useChatSessions.ts    # 세션 목록 관리
│   ├── useChatHistory.ts     # 메시지 히스토리 (무한 스크롤)
│   └── useSwipeDrawer.ts     # 스와이프 제스처 (범용)
│
├── components/chat/
│   ├── ChatMessageList.tsx   # 메시지 렌더링 (수정 - 무한 스크롤)
│   ├── ChatInputBar.tsx      # 입력 UI만 (로직 분리)
│   ├── ChatStreamingText.tsx # 스트리밍 텍스트 + 커서
│   ├── ChatTypingIndicator.tsx # 타이핑 인디케이터
│   ├── ChatSessionDrawer.tsx # 우측 사이드바 (세션 목록)
│   ├── ChatSessionItem.tsx   # 세션 목록 아이템
│   └── ChatHeader.tsx        # 헤더 (햄버거 메뉴 버튼)
│
├── pages/Chat/
│   └── Chat.tsx              # 페이지 (훅 조합)
│
└── types/
    └── chat.ts               # 공통 타입
```

### 2.2 계층별 책임

| 계층 | 파일 | 책임 |
|------|------|------|
| **API Service** | `chat.service.ts` | HTTP 요청 (submit, input) |
| **React Query** | `chat.mutation.ts` | 비동기 상태 관리, 캐싱 |
| **Custom Hook** | `useChatStream.ts` | SSE 연결 + 메시지 상태 통합 |
| **Component** | `ChatInputBar.tsx` | UI만 담당, 로직 없음 |
| **Page** | `Chat.tsx` | 훅 조합, 레이아웃 |

---

## 3. 핵심 설계

### 3.1 타입 정의

```typescript
// types/chat.ts
export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'image' | 'generated_image';

// SSE 이벤트 타입 (2026-01-19 검증 완료)
export type SSEEventType =
  | 'token'           // 실시간 토큰 스트리밍 (seq: 1001~)
  | 'token_recovery'  // 늦은 구독자용 스냅샷 (accumulated 텍스트)
  | 'intent'          // Intent 분류
  | 'router'          // 라우팅 완료
  | 'answer'          // 답변 생성 시작/완료
  | 'done'            // 처리 완료 + 최종 결과
  | 'error'           // 에러
  | 'keepalive';      // 연결 유지

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  image_url?: string;     // 이미지 URL (type이 image 또는 generated_image일 때)
  timestamp: string;
  isStreaming?: boolean;  // 스트리밍 중 여부
}

export interface ChatSubmitRequest {
  session_id: string;     // 세션 ID (필수)
  message: string;
  image_url?: string;
  user_location?: { lat: number; lng: number };
}

export interface ChatSubmitResponse {
  job_id: string;
  session_id: string;
  stream_url: string;
  status: 'queued' | 'processing';
}

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Token Streaming 이벤트 (2026-01-19 검증 완료)
// ─────────────────────────────────────────────────────────────

/**
 * 실시간 토큰 스트리밍 이벤트
 *
 * 예시:
 * event: token
 * data: {"content":"유","seq":1001,"node":"answer"}
 */
export interface TokenEventData {
  content: string;    // 토큰 텍스트 (UTF-8)
  seq: number;        // 시퀀스 번호 (1001부터 시작, 연속 증가)
  node: string;       // 생성 노드 ("answer")
}

/**
 * 토큰 복구 이벤트 (늦은 구독자용)
 *
 * SSE 연결이 늦어진 경우 지금까지 누적된 전체 답변을 스냅샷으로 전달
 *
 * 예시:
 * event: token_recovery
 * data: {"stage":"token_recovery","status":"snapshot","accumulated":"전체 답변...","last_seq":1175,"completed":true}
 */
export interface TokenRecoveryEventData {
  stage: 'token_recovery';
  status: 'snapshot';
  accumulated: string;  // 누적된 전체 답변 텍스트
  last_seq: number;     // 마지막 토큰의 seq 번호
  completed: boolean;   // 답변 생성 완료 여부
}

/** @deprecated delta 대신 token 사용 */
export interface DeltaEventData {
  content: string;
}

/**
 * Done 이벤트 result 데이터 (2026-01-19 검증)
 *
 * done 이벤트 전체 구조:
 * {
 *   "job_id": "...",
 *   "stage": "done",
 *   "status": "completed",
 *   "seq": 171,
 *   "progress": 100,
 *   "result": { // ← 이 부분
 *     "intent": "waste",
 *     "answer": "무색 **음료/생수 페트병(PET)**이라면...",
 *     "persistence": { ... }
 *   }
 * }
 */
export interface DoneEventData {
  intent?: string;               // 최종 intent
  answer: string;                // 전체 답변 텍스트 (권장)
  user_answer?: string;          // 레거시 호환용
  generated_image_url?: string;  // AI 생성 이미지 URL (있는 경우)
  persistence?: {
    conversation_id: string;
    user_id: string;
    user_message: string;
    assistant_message: string;
  };
}

// ─────────────────────────────────────────────────────────────
// 세션 & 히스토리 타입 (백엔드 API 추가 필요)
// ─────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;                    // 세션 ID (UUID)
  title: string;                 // 첫 메시지 요약 또는 자동 생성
  created_at: string;            // ISO 8601
  updated_at: string;            // 마지막 메시지 시간
  message_count: number;         // 메시지 수
  preview?: string;              // 마지막 메시지 미리보기
}

export interface ChatSessionsResponse {
  items: ChatSession[];
  total: number;
  has_more: boolean;
  next_cursor?: string;          // 커서 기반 페이지네이션
}

export interface ChatMessagesResponse {
  items: ChatMessage[];
  total: number;
  has_more: boolean;
  next_cursor?: string;          // 위로 스크롤 시 이전 메시지 로드
}

// ─────────────────────────────────────────────────────────────
// Thinking UI 타입 (처리 과정 표시)
// ─────────────────────────────────────────────────────────────

// Intent 타입 (백엔드 9가지 의도)
export type IntentType =
  | 'waste'              // 분리배출
  | 'character'          // 캐릭터
  | 'location'           // 위치 검색
  | 'bulk_waste'         // 대형폐기물
  | 'recyclable_price'   // 시세 조회
  | 'collection_point'   // 수거함 위치
  | 'web_search'         // 웹 검색
  | 'image_generation'   // 이미지 생성
  | 'general';           // 일반 대화

// Intent 한글 라벨
export const INTENT_LABELS: Record<IntentType, string> = {
  waste: '분리배출 안내',
  character: '캐릭터 정보',
  location: '위치 검색',
  bulk_waste: '대형폐기물 안내',
  recyclable_price: '시세 조회',
  collection_point: '수거함 위치',
  web_search: '웹 검색',
  image_generation: '이미지 생성',
  general: '일반 대화',
};

// SSE Stage 이벤트 데이터
export interface StageEventData {
  stage: string;
  status: 'started' | 'completed' | 'failed';
  progress?: string;
  result?: IntentResultData | RagResultData | unknown;
}

// Intent 분류 결과 (stage: intent)
export interface IntentResultData {
  intent: IntentType;
  complexity: 'simple' | 'complex';
  confidence: number;
  has_multi_intent: boolean;
  additional_intents: IntentType[];
  decomposed_queries?: string[];
}

// RAG 검색 결과 (stage: rag)
export interface RagResultData {
  found: boolean;
  count?: number;
  method?: string;
}

// Thinking Summary (펼침 영역에 표시)
export interface ThinkingSummary {
  totalSeconds: number;
  intentLabel: string;              // "분리배출 안내로 판단"
  isMultiIntent: boolean;
  decomposedQueries?: Array<{
    query: string;
    intentLabel: string;
  }>;
  sources?: string;                 // "KECO 규정 2건 참조"
}
```

### 3.2 API Service

```typescript
// api/services/chat/chat.service.ts
import api from '@/api/axiosInstance';
import type {
  ChatSubmitRequest,
  ChatSubmitResponse,
  ChatSessionsResponse,
  ChatMessagesResponse,
  ChatSession,
} from './chat.type';

const BASE_URL = '/api/v1/chat';

export class ChatService {
  /**
   * 채팅 제출 - job_id 획득
   */
  static async submitChat(request: ChatSubmitRequest) {
    return api
      .post<ChatSubmitResponse>(BASE_URL, request)
      .then((res) => res.data);
  }

  /**
   * Human-in-the-Loop 입력 (위치 확인 등)
   */
  static async submitInput(jobId: string, input: Record<string, unknown>) {
    return api
      .post(`${BASE_URL}/${jobId}/input`, input)
      .then((res) => res.data);
  }

  /**
   * SSE 스트림 URL 생성
   */
  static getStreamUrl(jobId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}${BASE_URL}/${jobId}/events`;
  }

  // ─────────────────────────────────────────────────────────────
  // 세션 & 히스토리 API (백엔드 구현 필요)
  // ─────────────────────────────────────────────────────────────

  /**
   * 세션 목록 조회
   * GET /api/v1/chat/sessions?cursor={cursor}&limit={limit}
   */
  static async getSessions(cursor?: string, limit = 20) {
    return api
      .get<ChatSessionsResponse>(`${BASE_URL}/sessions`, {
        params: { cursor, limit },
      })
      .then((res) => res.data);
  }

  /**
   * 새 세션 생성
   * POST /api/v1/chat/sessions
   */
  static async createSession() {
    return api
      .post<ChatSession>(`${BASE_URL}/sessions`)
      .then((res) => res.data);
  }

  /**
   * 세션 삭제
   * DELETE /api/v1/chat/sessions/{sessionId}
   */
  static async deleteSession(sessionId: string) {
    return api.delete(`${BASE_URL}/sessions/${sessionId}`);
  }

  /**
   * 세션별 메시지 조회 (이전 메시지 로드)
   * GET /api/v1/chat/sessions/{sessionId}/messages?cursor={cursor}&limit={limit}
   */
  static async getMessages(sessionId: string, cursor?: string, limit = 50) {
    return api
      .get<ChatMessagesResponse>(`${BASE_URL}/sessions/${sessionId}/messages`, {
        params: { cursor, limit },
      })
      .then((res) => res.data);
  }
}
```

### 3.3 React Query Mutation & Queries

```typescript
// api/services/chat/chat.mutation.ts
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { ChatService } from './chat.service';
import type { ChatSubmitRequest, ChatSubmitResponse, ChatSession } from './chat.type';

export const useChatSubmitMutation = (
  options?: Omit<
    UseMutationOptions<ChatSubmitResponse, Error, ChatSubmitRequest>,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation({
    mutationKey: ['chat', 'submit'],
    mutationFn: ChatService.submitChat,
    ...options,
  });
};

export const useCreateSessionMutation = (
  options?: Omit<
    UseMutationOptions<ChatSession, Error, void>,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation({
    mutationKey: ['chat', 'sessions', 'create'],
    mutationFn: ChatService.createSession,
    ...options,
  });
};

export const useDeleteSessionMutation = (
  options?: Omit<
    UseMutationOptions<void, Error, string>,
    'mutationKey' | 'mutationFn'
  >,
) => {
  return useMutation({
    mutationKey: ['chat', 'sessions', 'delete'],
    mutationFn: ChatService.deleteSession,
    ...options,
  });
};
```

```typescript
// api/services/chat/chat.queries.ts
import { useInfiniteQuery, queryOptions } from '@tanstack/react-query';
import { ChatService } from './chat.service';

export class ChatQueries {
  static readonly keys = {
    sessions: ['chat', 'sessions'] as const,
    messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
  };

  /**
   * 세션 목록 (무한 스크롤)
   */
  static sessionsInfinite() {
    return {
      queryKey: this.keys.sessions,
      queryFn: ({ pageParam }: { pageParam?: string }) =>
        ChatService.getSessions(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.has_more ? lastPage.next_cursor : undefined,
      initialPageParam: undefined as string | undefined,
    };
  }

  /**
   * 세션별 메시지 (무한 스크롤 - 위로)
   */
  static messagesInfinite(sessionId: string) {
    return {
      queryKey: this.keys.messages(sessionId),
      queryFn: ({ pageParam }: { pageParam?: string }) =>
        ChatService.getMessages(sessionId, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.has_more ? lastPage.next_cursor : undefined,
      initialPageParam: undefined as string | undefined,
      enabled: !!sessionId,
    };
  }
}

// 훅으로 사용
export const useChatSessionsInfinite = () => {
  return useInfiniteQuery(ChatQueries.sessionsInfinite());
};

export const useChatMessagesInfinite = (sessionId: string) => {
  return useInfiniteQuery(ChatQueries.messagesInfinite(sessionId));
};
```

### 3.4 SSE Hook (범용)

```typescript
// hooks/useSSE.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

interface UseSSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

interface UseSSEReturn {
  status: SSEStatus;
  connect: (url: string) => void;
  disconnect: () => void;
}

export const useSSE = (options?: UseSSEOptions): UseSSEReturn => {
  const [status, setStatus] = useState<SSEStatus>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus('closed');
    }
  }, []);

  const connect = useCallback(
    (url: string) => {
      // 기존 연결 정리
      disconnect();

      setStatus('connecting');
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setStatus('connected');
        options?.onOpen?.();
      };

      eventSource.onmessage = (event) => {
        options?.onMessage?.(event);
      };

      eventSource.onerror = (error) => {
        setStatus('error');
        options?.onError?.(error);
        disconnect();
      };
    },
    [disconnect, options],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { status, connect, disconnect };
};
```

> **Alternative: addEventListener 패턴 (권장)**
>
> SSE의 `event:` 헤더를 직접 구분하려면 `addEventListener`를 사용:
>
> ```typescript
> const eventSource = new EventSource(url, { withCredentials: true });
>
> eventSource.addEventListener('token', (e) => {
>   const data: TokenEventData = JSON.parse(e.data);
>   appendContent(data.content);
> });
>
> eventSource.addEventListener('token_recovery', (e) => {
>   const data: TokenRecoveryEventData = JSON.parse(e.data);
>   setContent(data.accumulated);
> });
>
> eventSource.addEventListener('done', (e) => {
>   const data = JSON.parse(e.data);
>   finalize(data.result.answer);
>   eventSource.close();
> });
> ```

### 3.5 Chat Stream Hook (ChatGPT 스타일)

```typescript
// hooks/useChatStream.ts
import { useState, useCallback, useRef } from 'react';
import { useSSE, type SSEStatus } from './useSSE';
import { useChatSubmitMutation } from '@/api/services/chat/chat.mutation';
import { ChatService } from '@/api/services/chat/chat.service';
import type {
  ChatMessage,
  ChatSubmitRequest,
  TokenEventData,
  TokenRecoveryEventData,
  DoneEventData,
} from '@/types/chat';

interface UseChatStreamReturn {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  status: SSEStatus;
  sendMessage: (request: ChatSubmitRequest) => Promise<void>;
  addUserMessage: (content: string, type?: 'text' | 'image') => void;
}

export const useChatStream = (): UseChatStreamReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const currentJobIdRef = useRef<string | null>(null);

  const submitMutation = useChatSubmitMutation();

  // SSE 이벤트 핸들러 (2026-01-19 업데이트 - token/token_recovery 지원)
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      // SSE 이벤트 타입은 event.type으로 구분 (아래 addEventListener 참조)
      // 여기서는 data 구조로 판별

      // token 이벤트: {"content":"유","seq":1001,"node":"answer"}
      if ('content' in data && 'seq' in data) {
        const tokenData = data as TokenEventData;
        setStreamingContent((prev) => prev + tokenData.content);
        return;
      }

      // token_recovery 이벤트: 늦은 구독자용 스냅샷
      if (data.stage === 'token_recovery') {
        const recoveryData = data as TokenRecoveryEventData;
        setStreamingContent(recoveryData.accumulated);
        if (recoveryData.completed) {
          // 이미 완료된 경우 바로 메시지로 전환
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: recoveryData.accumulated,
              type: 'text',
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamingContent('');
          setIsStreaming(false);
        }
        return;
      }

      // done 이벤트
      if (data.stage === 'done') {
        const doneData = data.result as DoneEventData;
        // 스트리밍 완료 - 최종 메시지로 교체
        const newMessages: ChatMessage[] = [];

        // 텍스트 응답 (done.result.answer)
        const answer = doneData?.answer || doneData?.user_answer;
        if (answer) {
          newMessages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: answer,
            type: 'text',
            timestamp: new Date().toISOString(),
          });
        }

        // 생성된 이미지가 있는 경우
        if (doneData?.generated_image_url) {
          newMessages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',  // 캡션 (필요시 백엔드에서 제공)
            type: 'generated_image',
            image_url: doneData.generated_image_url,
            timestamp: new Date().toISOString(),
          });
        }

        setMessages((prev) => [...prev, ...newMessages]);
        setStreamingContent('');
        setIsStreaming(false);
        return;
      }

      // error 이벤트
      if (data.stage === 'error' || data.status === 'error') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
            type: 'text',
            timestamp: new Date().toISOString(),
          },
        ]);
        setStreamingContent('');
        setIsStreaming(false);
        return;
      }

      // intent, router, answer 등 stage 이벤트는 무시 (ChatGPT 스타일 - 단순)
      // 필요시 Thinking UI 구현할 때 처리
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  }, []);

  const { status, connect, disconnect } = useSSE({
    onMessage: handleSSEMessage,
    onError: () => {
      setIsStreaming(false);
      setStreamingContent('');
    },
  });

  // 사용자 메시지 추가
  const addUserMessage = useCallback(
    (content: string, type: 'text' | 'image' = 'text') => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          type,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  // 메시지 전송
  const sendMessage = useCallback(
    async (request: ChatSubmitRequest) => {
      try {
        // 1. 채팅 제출 - job_id 획득
        const { job_id } = await submitMutation.mutateAsync(request);
        currentJobIdRef.current = job_id;

        // 2. SSE 연결
        setIsStreaming(true);
        setStreamingContent('');
        const streamUrl = ChatService.getStreamUrl(job_id);
        connect(streamUrl);
      } catch (error) {
        console.error('Chat submit error:', error);
        setIsStreaming(false);
      }
    },
    [submitMutation, connect],
  );

  return {
    messages,
    streamingContent,
    isStreaming,
    status,
    sendMessage,
    addUserMessage,
  };
};
```

### 3.6 스트리밍 텍스트 컴포넌트

```typescript
// components/chat/ChatStreamingText.tsx
interface ChatStreamingTextProps {
  content: string;
  showCursor?: boolean;
}

export const ChatStreamingText = ({
  content,
  showCursor = true,
}: ChatStreamingTextProps) => {
  return (
    <span>
      {content}
      {showCursor && (
        <span className='animate-pulse text-brand-primary'>█</span>
      )}
    </span>
  );
};
```

### 3.7 타이핑 인디케이터

```typescript
// components/chat/ChatTypingIndicator.tsx
export const ChatTypingIndicator = () => {
  return (
    <div className='flex items-center gap-1 px-4 py-2'>
      <span className='h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.3s]' />
      <span className='h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.15s]' />
      <span className='h-2 w-2 animate-bounce rounded-full bg-text-secondary' />
    </div>
  );
};
```

### 3.8 스와이프 드로어 Hook

```typescript
// hooks/useSwipeDrawer.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSwipeDrawerOptions {
  direction?: 'left' | 'right';  // 스와이프 방향 (right = 우→좌로 열기)
  threshold?: number;            // 스와이프 감지 임계값 (px)
  drawerWidth?: number;          // 드로어 너비 (px)
}

interface UseSwipeDrawerReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  drawerRef: React.RefObject<HTMLDivElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  translateX: number;  // 드래그 중 위치
}

export const useSwipeDrawer = (
  options: UseSwipeDrawerOptions = {},
): UseSwipeDrawerReturn => {
  const { direction = 'right', threshold = 50, drawerWidth = 280 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current) return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - startXRef.current;

      // 우→좌 스와이프 (direction === 'right')
      if (direction === 'right') {
        if (!isOpen && diff < 0) {
          // 닫힌 상태에서 좌로 스와이프 → 열기
          setTranslateX(Math.max(diff, -drawerWidth));
        } else if (isOpen && diff > 0) {
          // 열린 상태에서 우로 스와이프 → 닫기
          setTranslateX(Math.min(diff, drawerWidth));
        }
      }
    },
    [direction, isOpen, drawerWidth],
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;

    if (Math.abs(translateX) > threshold) {
      if (direction === 'right') {
        setIsOpen(translateX < 0);
      }
    }
    setTranslateX(0);
  }, [translateX, threshold, direction]);

  return {
    isOpen,
    open,
    close,
    toggle,
    drawerRef,
    overlayRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    translateX,
  };
};
```

### 3.9 세션 사이드바 드로어

```typescript
// components/chat/ChatSessionDrawer.tsx
import { useSwipeDrawer } from '@/hooks/useSwipeDrawer';
import { useChatSessionsInfinite } from '@/api/services/chat/chat.queries';
import { useCreateSessionMutation } from '@/api/services/chat/chat.mutation';
import { ChatSessionItem } from './ChatSessionItem';
import type { ChatSession } from '@/types/chat';

interface ChatSessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onNewSession: () => void;
}

export const ChatSessionDrawer = ({
  isOpen,
  onClose,
  currentSessionId,
  onSelectSession,
  onNewSession,
}: ChatSessionDrawerProps) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatSessionsInfinite();

  const sessions = data?.pages.flatMap((page) => page.items) ?? [];

  // 날짜별 그룹화
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 드로어 */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[280px] transform bg-white shadow-xl transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더 */}
        <div className='flex items-center justify-between border-b border-stroke-default p-4'>
          <h2 className='text-lg font-semibold text-text-primary'>대화 목록</h2>
          <button
            onClick={onClose}
            className='text-text-secondary hover:text-text-primary'
          >
            ✕
          </button>
        </div>

        {/* 새 대화 버튼 */}
        <button
          onClick={onNewSession}
          className='m-4 flex w-[calc(100%-32px)] items-center justify-center gap-2 rounded-lg border border-dashed border-brand-primary py-3 text-brand-primary hover:bg-brand-secondary'
        >
          <span>+</span>
          <span>새 대화</span>
        </button>

        {/* 세션 목록 */}
        <div className='no-scrollbar flex-1 overflow-y-auto px-4'>
          {Object.entries(groupedSessions).map(([dateLabel, items]) => (
            <div key={dateLabel} className='mb-4'>
              <h3 className='mb-2 text-xs font-medium text-text-secondary'>
                {dateLabel}
              </h3>
              {items.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                />
              ))}
            </div>
          ))}

          {/* 더 불러오기 */}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className='w-full py-2 text-sm text-text-secondary'
            >
              {isFetchingNextPage ? '로딩 중...' : '더 보기'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// 날짜별 그룹화 유틸
function groupSessionsByDate(sessions: ChatSession[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, ChatSession[]> = {
    오늘: [],
    어제: [],
    '지난 7일': [],
    이전: [],
  };

  sessions.forEach((session) => {
    const date = new Date(session.updated_at);
    if (isSameDay(date, today)) {
      groups['오늘'].push(session);
    } else if (isSameDay(date, yesterday)) {
      groups['어제'].push(session);
    } else if (date > weekAgo) {
      groups['지난 7일'].push(session);
    } else {
      groups['이전'].push(session);
    }
  });

  // 빈 그룹 제거
  return Object.fromEntries(
    Object.entries(groups).filter(([, items]) => items.length > 0),
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
```

### 3.10 세션 아이템 컴포넌트

```typescript
// components/chat/ChatSessionItem.tsx
import type { ChatSession } from '@/types/chat';

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
}

export const ChatSessionItem = ({
  session,
  isActive,
  onClick,
}: ChatSessionItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`mb-2 w-full rounded-lg p-3 text-left transition-colors ${
        isActive
          ? 'bg-brand-secondary text-brand-primary'
          : 'hover:bg-gray-50'
      }`}
    >
      <p className='truncate text-sm font-medium text-text-primary'>
        {session.title}
      </p>
      {session.preview && (
        <p className='mt-1 truncate text-xs text-text-secondary'>
          {session.preview}
        </p>
      )}
    </button>
  );
};
```

### 3.11 Chat 헤더 (햄버거 메뉴)

```typescript
// components/chat/ChatHeader.tsx
import menuIcon from '@/assets/icons/icon_menu.svg';

interface ChatHeaderProps {
  onMenuClick: () => void;
}

export const ChatHeader = ({ onMenuClick }: ChatHeaderProps) => {
  return (
    <header className='flex h-[60px] items-center justify-between border-b border-stroke-default px-4'>
      <h1 className='text-lg font-semibold text-text-primary'>Eco² Chat</h1>
      <button
        onClick={onMenuClick}
        className='flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100'
      >
        <img src={menuIcon} alt='menu' className='h-6 w-6' />
      </button>
    </header>
  );
};
```

---

## 4. 컴포넌트 수정

### 4.1 Chat 페이지 (전면 수정)

```typescript
// pages/Chat/Chat.tsx
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ChatMessageList from '@/components/chat/ChatMessageList';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatSessionDrawer } from '@/components/chat/ChatSessionDrawer';
import { useChatStream } from '@/hooks/useChatStream';
import { useSwipeDrawer } from '@/hooks/useSwipeDrawer';
import { useChatMessagesInfinite } from '@/api/services/chat/chat.queries';
import { useCreateSessionMutation } from '@/api/services/chat/chat.mutation';
import type { ChatSession } from '@/types/chat';

const Chat = () => {
  const queryClient = useQueryClient();

  // 현재 세션 ID
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // 사이드바 드로어
  const { isOpen: isDrawerOpen, open: openDrawer, close: closeDrawer, handlers } =
    useSwipeDrawer({ direction: 'right' });

  // 세션 생성
  const createSessionMutation = useCreateSessionMutation({
    onSuccess: (newSession) => {
      setCurrentSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });

  // 스트리밍 (현재 세션)
  const {
    messages: streamMessages,
    streamingContent,
    isStreaming,
    sendMessage,
    addUserMessage,
    setMessages,
  } = useChatStream();

  // 이전 메시지 (무한 스크롤)
  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessagesInfinite(currentSessionId ?? '');

  // 히스토리 + 스트리밍 메시지 병합
  const historyMessages = historyData?.pages.flatMap((page) => page.items) ?? [];
  const allMessages = [...historyMessages.reverse(), ...streamMessages];

  // 새 대화 시작
  const handleNewSession = useCallback(async () => {
    await createSessionMutation.mutateAsync();
    setMessages([]); // 스트리밍 메시지 초기화
    closeDrawer();
  }, [createSessionMutation, setMessages, closeDrawer]);

  // 세션 선택
  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      setCurrentSessionId(session.id);
      setMessages([]); // 스트리밍 메시지 초기화 (히스토리로 교체)
    },
    [setMessages],
  );

  // 메시지 전송
  const handleSend = async (text: string, cdnUrl?: string) => {
    // 세션이 없으면 새로 생성
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createSessionMutation.mutateAsync();
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
    }

    // 사용자 메시지 추가 (즉시 표시)
    if (cdnUrl) addUserMessage(cdnUrl, 'image');
    if (text) addUserMessage(text, 'text');

    // 채팅 전송 + SSE 구독
    await sendMessage({
      session_id: sessionId,
      message: text,
      image_url: cdnUrl,
    });
  };

  // 위로 스크롤 시 이전 메시지 로드
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      className='flex h-full w-full flex-col bg-white'
      {...handlers} // 스와이프 제스처
    >
      {/* 헤더 */}
      <ChatHeader onMenuClick={openDrawer} />

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={allMessages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />

      {/* 입력창 */}
      <ChatInputBar
        onSend={handleSend}
        isDisabled={isStreaming}
        imageFile={imageFile}
        setImageFile={setImageFile}
      />

      {/* 세션 사이드바 */}
      <ChatSessionDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />
    </div>
  );
};

export default Chat;
```

### 4.2 ChatMessageList (수정)

```typescript
// components/chat/ChatMessageList.tsx
import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/chat';
import { ChatStreamingText } from './ChatStreamingText';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import ecoProfileIcon from '@/assets/icons/icon_eco_profile.svg';

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
}

const ChatMessageList = ({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div
      ref={containerRef}
      className='no-scrollbar flex-1 overflow-y-auto px-4 pb-4'
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* 스트리밍 중인 메시지 */}
      {isStreaming && (
        <div className='flex w-full flex-row justify-start gap-2 pt-4'>
          <img
            src={ecoProfileIcon}
            alt='eco'
            className='h-8 w-8 flex-shrink-0'
          />
          <div className='max-w-[80%] rounded-2xl bg-gray-100 p-4'>
            {streamingContent ? (
              <ChatStreamingText content={streamingContent} />
            ) : (
              <ChatTypingIndicator />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 메시지 버블 컴포넌트
const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  const isImage = message.type === 'image' || message.type === 'generated_image';

  // 이미지 메시지 (user: 업로드 이미지, assistant: 생성 이미지)
  if (isImage && message.image_url) {
    return (
      <div
        className={`flex w-full pt-4 ${isUser ? 'justify-end' : 'justify-start gap-2'}`}
      >
        {!isUser && (
          <img
            src={ecoProfileIcon}
            alt='eco'
            className='h-8 w-8 flex-shrink-0'
          />
        )}
        <div className='flex flex-col gap-2'>
          <img
            src={message.image_url}
            alt={message.type === 'generated_image' ? 'generated' : 'uploaded'}
            className='max-h-48 max-w-[70%] rounded-lg object-cover'
          />
          {/* 생성 이미지에 캡션이 있는 경우 */}
          {message.type === 'generated_image' && message.content && (
            <p className='text-sm text-text-secondary'>{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  // 텍스트 메시지
  return (
    <div
      className={`flex w-full pt-4 ${isUser ? 'justify-end' : 'justify-start gap-2'}`}
    >
      {!isUser && (
        <img
          src={ecoProfileIcon}
          alt='eco'
          className='h-8 w-8 flex-shrink-0'
        />
      )}
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          isUser
            ? 'bg-brand-primary text-white'
            : 'bg-gray-100 text-text-primary'
        }`}
        dangerouslySetInnerHTML={{ __html: message.content }}
      />
    </div>
  );
};

export default ChatMessageList;
```

### 4.3 ChatInputBar (로직 분리)

```typescript
// components/chat/ChatInputBar.tsx
import { useRef, useState } from 'react';
import cameraIcon from '@/assets/icons/icon_camera.svg';
import sendIcon from '@/assets/icons/icon_send.svg';
import api from '@/api/axiosInstance';
import axios from 'axios';

interface ChatInputBarProps {
  onSend: (text: string, cdnUrl?: string) => Promise<void>;
  isDisabled: boolean;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
}

const ChatInputBar = ({
  onSend,
  isDisabled,
  imageFile,
  setImageFile,
}: ChatInputBarProps) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (isDisabled || !(text.trim() || imageFile)) return;

    const currentText = text;
    const currentImage = imageFile;

    // 입력 초기화 (즉시 반응)
    setText('');
    setImageFile(null);

    try {
      let cdnUrl: string | undefined;

      // 이미지 업로드 (기존 로직 유지)
      if (currentImage) {
        const fileMeta = {
          filename: currentImage.name,
          content_type: currentImage.type,
        };

        const { data: presignedData } = await api.post(
          '/api/v1/images/chat',
          fileMeta,
        );

        await axios.put(presignedData.upload_url, currentImage, {
          headers: { 'Content-Type': currentImage.type },
        });

        cdnUrl = presignedData.cdn_url;
      }

      // 부모에게 전송 위임
      await onSend(currentText, cdnUrl);
    } catch (error) {
      console.error('Send error:', error);
      // 실패 시 복원
      setText(currentText);
      setImageFile(currentImage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='max-w-app absolute bottom-0 flex w-full flex-col gap-3 bg-white px-4 pt-3 pb-[23px] shadow-[0_-3px_25px_rgba(0,0,0,0.20)]'>
      {/* 이미지 미리보기 */}
      {imageFile && (
        <div className='relative inline-block'>
          <img
            src={URL.createObjectURL(imageFile)}
            alt='preview'
            className='h-16 w-16 rounded-lg object-cover'
          />
          <button
            onClick={() => setImageFile(null)}
            className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white'
          >
            ×
          </button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className='flex items-center gap-3'>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          capture='environment'
          className='hidden'
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className='flex-shrink-0 disabled:opacity-50'
        >
          <img src={cameraIcon} alt='camera' className='h-6 w-6' />
        </button>

        <input
          type='text'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='메시지를 입력하세요'
          disabled={isDisabled}
          className='flex-1 rounded-full border border-stroke-default px-4 py-2 text-sm outline-none focus:border-brand-primary disabled:bg-gray-50'
        />

        <button
          onClick={handleSend}
          disabled={isDisabled || !(text.trim() || imageFile)}
          className='flex-shrink-0 disabled:opacity-50'
        >
          <img src={sendIcon} alt='send' className='h-6 w-6' />
        </button>
      </div>
    </div>
  );
};

export default ChatInputBar;
```

---

## 5. 마이그레이션 단계

### Phase 1: 기반 구축 (타입 & API)

| 작업 | 파일 | 설명 |
|------|------|------|
| 1-1 | `types/chat.ts` | 타입 정의 (Message, Session, SSE) |
| 1-2 | `api/services/chat/chat.type.ts` | API 타입 |
| 1-3 | `api/services/chat/chat.service.ts` | API 서비스 (submit, sessions, messages) |
| 1-4 | `api/services/chat/chat.mutation.ts` | React Query mutations |
| 1-5 | `api/services/chat/chat.queries.ts` | React Query queries (무한 스크롤) |

### Phase 2: Hook 구현

| 작업 | 파일 | 설명 |
|------|------|------|
| 2-1 | `hooks/useSSE.ts` | 범용 SSE Hook |
| 2-2 | `hooks/useChatStream.ts` | Chat 전용 Hook (SSE + 메시지) |
| 2-3 | `hooks/useSwipeDrawer.ts` | 스와이프 제스처 Hook |

### Phase 3: 컴포넌트 - 기본 UI

| 작업 | 파일 | 설명 |
|------|------|------|
| 3-1 | `components/chat/ChatStreamingText.tsx` | 스트리밍 텍스트 + 커서 |
| 3-2 | `components/chat/ChatTypingIndicator.tsx` | 타이핑 표시 (●●●) |
| 3-3 | `components/chat/ChatHeader.tsx` | 헤더 (메뉴 버튼) |

### Phase 4: 컴포넌트 - 세션 관리

| 작업 | 파일 | 설명 |
|------|------|------|
| 4-1 | `components/chat/ChatSessionDrawer.tsx` | 우측 사이드바 드로어 |
| 4-2 | `components/chat/ChatSessionItem.tsx` | 세션 목록 아이템 |

### Phase 5: 기존 컴포넌트 수정

| 작업 | 파일 | 설명 |
|------|------|------|
| 5-1 | `components/chat/ChatMessageList.tsx` | 수정 (무한 스크롤, 스트리밍) |
| 5-2 | `components/chat/ChatInputBar.tsx` | 수정 (로직 분리) |

### Phase 6: 페이지 통합

| 작업 | 파일 | 설명 |
|------|------|------|
| 6-1 | `pages/Chat/Chat.tsx` | 전면 수정 (세션 + 스트리밍 통합) |

### Phase 7: 테스트 및 정리

| 작업 | 설명 |
|------|------|
| 7-1 | E2E 테스트 |
| 7-2 | 기존 코드 정리 (불필요 코드 제거) |
| 7-3 | 백엔드 API 연동 테스트 |

### 의존성 그래프

```
Phase 1 (타입 & API)
     ↓
Phase 2 (Hooks)
     ↓
Phase 3 (기본 UI) ──→ Phase 4 (세션 관리)
     ↓                      ↓
Phase 5 (기존 컴포넌트 수정) ←─┘
     ↓
Phase 6 (페이지 통합)
     ↓
Phase 7 (테스트 & 정리)
```

### 백엔드 API 의존성

⚠️ **주의**: Phase 4 (세션 관리)는 백엔드 API 추가가 필요합니다.

| 프론트엔드 기능 | 필요한 백엔드 API |
|---------------|-----------------|
| SSE 스트리밍 | ✅ 이미 구현됨 (`/chat/{job_id}/events`) |
| 세션 목록 | ❌ `GET /chat/sessions` 필요 |
| 세션 생성 | ❌ `POST /chat/sessions` 필요 |
| 세션 삭제 | ❌ `DELETE /chat/sessions/{id}` 필요 |
| 메시지 히스토리 | ❌ `GET /chat/sessions/{id}/messages` 필요 |

**병렬 개발 전략**:
1. Phase 1~3, 5: 백엔드 의존 없이 진행 가능 (SSE만 사용)
2. Phase 4, 6: 백엔드 API 완료 후 진행

---

## 6. 체크리스트

### 타입 정의
- [ ] `types/chat.ts` - ChatMessage, ChatSession, SSEEvent 등

### API 서비스
- [ ] `api/services/chat/chat.type.ts`
- [ ] `api/services/chat/chat.service.ts` (submit, sessions, messages)
- [ ] `api/services/chat/chat.mutation.ts`
- [ ] `api/services/chat/chat.queries.ts` (무한 스크롤)

### Hooks
- [ ] `hooks/useSSE.ts` (범용)
- [ ] `hooks/useChatStream.ts` (SSE + 메시지)
- [ ] `hooks/useSwipeDrawer.ts` (스와이프 제스처)

### 컴포넌트 - 신규
- [ ] `components/chat/ChatStreamingText.tsx`
- [ ] `components/chat/ChatTypingIndicator.tsx`
- [ ] `components/chat/ChatHeader.tsx`
- [ ] `components/chat/ChatSessionDrawer.tsx`
- [ ] `components/chat/ChatSessionItem.tsx`

### 컴포넌트 - 수정
- [ ] `components/chat/ChatMessageList.tsx` (무한 스크롤, 스트리밍)
- [ ] `components/chat/ChatInputBar.tsx` (로직 분리)

### 페이지
- [ ] `pages/Chat/Chat.tsx` (세션 + 스트리밍 통합)

### 정리
- [ ] 기존 session_id 로직 제거
- [ ] 불필요 import 정리
- [ ] 기존 API 호출 코드 제거 (ChatInputBar)

### 백엔드 API (별도 작업)
- [ ] `GET /api/v1/chat/sessions` - 세션 목록
- [ ] `POST /api/v1/chat/sessions` - 세션 생성
- [ ] `DELETE /api/v1/chat/sessions/{id}` - 세션 삭제
- [ ] `GET /api/v1/chat/sessions/{id}/messages` - 메시지 히스토리

---

## 7. 고려사항

### 7.1 SSE 연결 관리

- **재연결**: 네트워크 오류 시 자동 재연결 (최대 3회)
- **타임아웃**: 5분 무응답 시 연결 종료
- **정리**: 페이지 이탈 시 연결 정리

### 7.2 메시지 영속성

현재 설계는 **세션 기반** (새로고침 시 초기화):
- 메시지 히스토리 저장이 필요하면 별도 API 연동 필요
- Phase 2에서 고려

### 7.3 에러 처리

| 에러 유형 | 처리 방식 |
|----------|----------|
| 네트워크 오류 | 인라인 메시지 + 재시도 버튼 |
| 서버 오류 (5xx) | "잠시 후 다시 시도해주세요" |
| 인증 오류 (401) | 기존 인터셉터 처리 (리프레시) |

### 7.4 이미지 업로드

기존 Presigned URL 방식 유지:
1. POST /api/v1/images/chat → presigned URL
2. PUT S3 업로드
3. CDN URL을 chat 요청에 포함

---

## 8. Thinking UI 상세 설계

ChatGPT 5.2 스타일의 미니멀한 처리 과정 표시 UI

### 8.1 Stage 메시지 매핑

```typescript
// constants/stageMessages.ts

// 처리 중 표시 메시지 (자연어)
export const STAGE_MESSAGES: Record<string, string> = {
  'intent:started': '질문을 분석하고 있어요',
  'rag:started': '관련 규정을 찾고 있어요',
  'character:started': '캐릭터 정보를 확인하고 있어요',
  'location:started': '주변 센터를 검색하고 있어요',
  'bulk_waste:started': '대형폐기물 정보를 조회하고 있어요',
  'recyclable_price:started': '재활용 시세를 확인하고 있어요',
  'collection_point:started': '수거함 위치를 찾고 있어요',
  'web_search:started': '최신 정보를 검색하고 있어요',
  'answer:started': '', // 토큰 스트리밍으로 대체
};

// Stage 키 생성
export const getStageKey = (stage: string, status: string): string => {
  return `${stage}:${status}`;
};
```

### 8.2 Thinking UI 컴포넌트

```typescript
// components/chat/ChatThinkingIndicator.tsx
interface ChatThinkingIndicatorProps {
  message: string;        // "질문을 분석하고 있어요"
  elapsedSeconds: number;
}

export const ChatThinkingIndicator = ({
  message,
  elapsedSeconds,
}: ChatThinkingIndicatorProps) => {
  if (!message) return null;

  return (
    <div className="text-sm text-text-secondary py-2">
      {message}
      {elapsedSeconds > 0 && (
        <span className="ml-1 text-text-tertiary">
          {elapsedSeconds}초
        </span>
      )}
    </div>
  );
};
```

```typescript
// components/chat/ChatThinkingSummary.tsx
interface ChatThinkingSummaryProps {
  summary: ThinkingSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ChatThinkingSummary = ({
  summary,
  isExpanded,
  onToggle,
}: ChatThinkingSummaryProps) => {
  return (
    <div className="mb-2">
      {/* 토글 헤더 */}
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>{summary.totalSeconds}초간 생각함</span>
      </button>

      {/* 펼침 내용 */}
      {isExpanded && (
        <div className="mt-2 ml-4 p-3 bg-gray-50 rounded-lg text-sm">
          {summary.isMultiIntent && summary.decomposedQueries ? (
            // Multi-Intent 표시
            <>
              <p className="text-text-secondary mb-2">복합 질문으로 판단했어요</p>
              <ol className="space-y-1">
                {summary.decomposedQueries.map((q, i) => (
                  <li key={i} className="text-text-primary">
                    {i + 1}. {q.query}
                    <span className="text-text-secondary ml-2">
                      → {q.intentLabel}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            // Single Intent 표시
            <p className="text-text-primary">{summary.intentLabel}로 판단</p>
          )}

          {summary.sources && (
            <p className="mt-2 text-text-tertiary">{summary.sources}</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### 8.3 Thinking Hook

```typescript
// hooks/useChatThinking.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { STAGE_MESSAGES, getStageKey } from '@/constants/stageMessages';
import { INTENT_LABELS } from '@/types/chat';
import type {
  StageEventData,
  IntentResultData,
  RagResultData,
  ThinkingSummary,
} from '@/types/chat';

interface UseChatThinkingReturn {
  currentMessage: string;
  elapsedSeconds: number;
  summary: ThinkingSummary | null;
  isComplete: boolean;
  handleStageEvent: (event: StageEventData) => void;
  reset: () => void;
}

export const useChatThinking = (): UseChatThinkingReturn => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [summary, setSummary] = useState<ThinkingSummary | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const intentResultRef = useRef<IntentResultData | null>(null);
  const ragResultRef = useRef<RagResultData | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 타이머 시작
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }
    }, 1000);
  }, []);

  // 타이머 정지
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stage 이벤트 처리
  const handleStageEvent = useCallback((event: StageEventData) => {
    const stageKey = getStageKey(event.stage, event.status);

    // 메시지 업데이트
    const message = STAGE_MESSAGES[stageKey];
    if (message !== undefined) {
      setCurrentMessage(message);
    }

    // 타이머 시작 (첫 이벤트)
    if (!startTimeRef.current && event.status === 'started') {
      startTimer();
    }

    // Intent 결과 저장
    if (event.stage === 'intent' && event.status === 'completed') {
      intentResultRef.current = event.result as IntentResultData;
    }

    // RAG 결과 저장
    if (event.stage === 'rag' && event.status === 'completed') {
      ragResultRef.current = event.result as RagResultData;
    }

    // 완료 처리
    if (event.stage === 'done' && event.status === 'completed') {
      stopTimer();
      setIsComplete(true);
      setCurrentMessage('');

      // Summary 생성
      const intentResult = intentResultRef.current;
      const ragResult = ragResultRef.current;

      if (intentResult) {
        const summaryData: ThinkingSummary = {
          totalSeconds: elapsedSeconds,
          intentLabel: `${INTENT_LABELS[intentResult.intent]}로 판단`,
          isMultiIntent: intentResult.has_multi_intent,
        };

        // Multi-Intent인 경우
        if (intentResult.has_multi_intent && intentResult.decomposed_queries) {
          summaryData.decomposedQueries = intentResult.decomposed_queries.map(
            (query, i) => ({
              query,
              intentLabel: INTENT_LABELS[
                i === 0
                  ? intentResult.intent
                  : intentResult.additional_intents[i - 1]
              ],
            })
          );
        }

        // 소스 정보
        if (ragResult?.found && ragResult.count) {
          summaryData.sources = `KECO 규정 ${ragResult.count}건 참조`;
        }

        setSummary(summaryData);
      }
    }
  }, [startTimer, stopTimer, elapsedSeconds]);

  // 초기화
  const reset = useCallback(() => {
    stopTimer();
    setCurrentMessage('');
    setElapsedSeconds(0);
    setSummary(null);
    setIsComplete(false);
    startTimeRef.current = null;
    intentResultRef.current = null;
    ragResultRef.current = null;
  }, [stopTimer]);

  // Cleanup
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    currentMessage,
    elapsedSeconds,
    summary,
    isComplete,
    handleStageEvent,
    reset,
  };
};
```

### 8.4 Multi-Intent UI 예시

```
복합 질문 (펼친 상태):
┌────────────────────────────────────────┐
│ User: 페트병 버리고 근처 센터도 알려줘  │
├────────────────────────────────────────┤
│ ▼ 8초간 생각함                         │
│ ┌──────────────────────────────────┐   │
│ │ 복합 질문으로 판단했어요          │   │
│ │                                    │   │
│ │ 1. 페트병 어떻게 버려?             │   │
│ │    → 분리배출 안내                 │   │
│ │                                    │   │
│ │ 2. 근처 센터는?                    │   │
│ │    → 위치 검색                     │   │
│ │                                    │   │
│ │ KECO 규정 2건, 카카오맵 3건 참조   │   │
│ └──────────────────────────────────┘   │
│                                        │
│ 페트병은 내용물을 비우고...            │
│                                        │
│ 근처 재활용센터:                        │
│ • 강남구 재활용센터 (도보 5분)          │
└────────────────────────────────────────┘
```

### 8.5 파일 구조 추가

```
src/
├── constants/
│   └── stageMessages.ts         # Stage → 메시지 매핑 (신규)
│
├── hooks/
│   └── useChatThinking.ts       # Thinking 상태 관리 (신규)
│
└── components/chat/
    ├── ChatThinkingIndicator.tsx  # 처리 중 메시지 (신규)
    └── ChatThinkingSummary.tsx    # 펼침/접힘 상세 (신규)
```

---

## 9. 참고

**백엔드 문서:**
- `docs/plans/chat-clean-architecture-migration-plan.md` - Chat API 아키텍처
- `docs/plans/multi-intent-enhancement-adr.md` - Multi-Intent ADR
- `apps/sse_gateway/` - SSE Gateway 구현
- `apps/event_router/` - Redis Streams → Pub/Sub

**프론트엔드 컨벤션:**
- 컴포넌트: PascalCase, default export
- Hook: camelCase, `use` prefix
- 서비스: static 메서드, `.then(res => res.data)` 패턴
- 스타일: Tailwind + CSS 변수 (`text-text-primary` 등)

---

**작성일**: 2026-01-16
**최종 수정**: 2026-01-16 (Thinking UI 설계 추가)
**상태**: 계획 수립 완료

### 메시지 타입 설명

| type | role | 설명 |
|------|------|------|
| `text` | user | 사용자 텍스트 메시지 |
| `text` | assistant | AI 텍스트 응답 |
| `image` | user | 사용자가 업로드한 이미지 |
| `generated_image` | assistant | AI가 생성한 이미지 |

**참고**:
- 백엔드: `docs/plans/chat-clean-architecture-migration-plan.md`
- SSE Gateway: `apps/sse_gateway/`
- Event Router: `apps/event_router/`
