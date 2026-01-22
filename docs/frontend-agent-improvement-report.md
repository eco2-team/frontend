# Frontend Agent 아키텍처 개선안 리포트

**작성일**: 2026-01-22
**대상 코드**: `src/db/`, `src/hooks/agent/`, `src/utils/message.ts`, `src/components/agent/`
**작업 브랜치**: `fix/agent-data-integrity`

---

## 1. Executive Summary

Frontend Agent 시스템은 IndexedDB 기반 로컬 저장, Optimistic Update, SSE 스트리밍, Reconcile 기반 동기화를 지원하는 잘 설계된 구조이다. 그러나 몇 가지 **데이터 정합성** 및 **복구 시나리오** 관련 개선점이 있다.

### 발견된 이슈 요약

| 우선순위 | 이슈 | 위치 | 상태 |
|---------|------|------|------|
| **P1** | SSE `id:` 필드 미사용 (Last-Event-ID 표준) | `useAgentSSE.ts` | 개선 필요 |
| P1 | 스트리밍 중 브라우저 종료 시 pending 메시지 유실 | `useMessagePersistence.ts` | 개선 필요 |
| P1 | Message Queue IndexedDB 미저장 | `useMessageQueue.ts` | 개선 필요 |
| P2 | `synced` 필드 타입 불일치 (boolean vs number) | `messageDB.ts:92,114` | 수정 필요 |
| P2 | IndexedDB quota exceeded 에러 핸들링 없음 | `messageDB.ts` | 개선 필요 |
| P2 | Reconcile 시 `committedRetentionMs` 하드코딩 | 여러 파일 | 상수화 필요 |
| P3 | `getMessages()` 페이지네이션 미지원 | `messageDB.ts:127-138` | 개선 권장 |
| P3 | Backend `stream_id` 미활용 | `useAgentSSE.ts` | 연동 권장 |

### 잘 구현된 부분

| 항목 | 위치 | 설명 |
|------|------|------|
| Optimistic Update | `useAgentChat.ts` | ✅ client_id 기반 pending → committed 전환 |
| Reconcile 로직 | `message.ts:98-168` | ✅ 서버/로컬 병합, 중복 제거 |
| SSE 재연결 | `useAgentSSE.ts:285-306` | ✅ Exponential backoff (3회) |
| 이벤트 타임아웃 | `useAgentSSE.ts:134-153` | ✅ 60초/120초 stage별 타임아웃 |
| IndexedDB 스키마 | `schema.ts` | ✅ 복합 인덱스, TTL 지원 |
| Token Recovery | `useAgentSSE.ts:219-234` | ✅ `token_recovery` 이벤트 처리 |

---

## 2. Critical Issues

### 2.1 [P1] SSE `id:` 필드 미사용

**위치**: `useAgentSSE.ts` 전체

**현황**:
```typescript
// 현재: event의 data만 파싱
es.addEventListener('token', (e) => {
  const data: TokenEvent = JSON.parse((e as MessageEvent).data);
  // e.lastEventId 미사용
});
```

**SSE 표준**:
```
id: 1737415902456-0
event: token
data: {"content": "Hello", "seq": 100}
```

- 브라우저는 연결 끊김 시 `Last-Event-ID` 헤더로 자동 재연결
- 현재 구현은 `last_token_seq` 쿼리 파라미터로 대체 (비표준)

**문제점**:
1. 브라우저 자동 재연결 시 Last-Event-ID 무시됨
2. Token과 Stage 이벤트 모두 복구 안됨
3. Backend에서 `stream_id` 주입하지만 Frontend에서 미활용

**권장안**:

```typescript
// useAgentSSE.ts
// 1. lastEventId 추적
const lastEventIdRef = useRef<string>('');

es.addEventListener('token', (e) => {
  const messageEvent = e as MessageEvent;
  const data: TokenEvent = JSON.parse(messageEvent.data);

  // lastEventId 저장 (복구용)
  if (messageEvent.lastEventId) {
    lastEventIdRef.current = messageEvent.lastEventId;
  }
  // ...
});

// 2. 재연결 시 URL에 last_event_id 추가
const url = lastEventIdRef.current
  ? `${baseUrl}/api/v1/chat/${jobId}/events?last_event_id=${lastEventIdRef.current}`
  : `${baseUrl}/api/v1/chat/${jobId}/events`;
```

**Backend 연동 필요**:
- SSE Gateway가 `id:` 필드로 `stream_id` 반환하도록 수정 필요 (별도 리포트 참조)

---

### 2.2 [P1] 스트리밍 중 브라우저 종료 시 pending 메시지 유실

**위치**: `useMessagePersistence.ts:46-55`

```typescript
// 500ms throttle - 브라우저 종료 시 저장 안될 수 있음
saveTimerRef.current = setTimeout(() => {
  messageDB.saveMessages(chatId, messages)
    .catch(console.error);
}, 500);
```

**시나리오**:
1. 사용자가 메시지 전송 (status: pending)
2. 스트리밍 시작
3. 300ms 후 브라우저 닫기/새로고침
4. setTimeout 아직 실행 안됨 → **pending 메시지 유실**

**권장안**:

```typescript
// 1. 즉시 저장 (pending 메시지)
useEffect(() => {
  if (!chatId) return;

  const pendingMessages = messages.filter(m => m.status === 'pending');
  if (pendingMessages.length > 0) {
    // Pending은 즉시 저장 (throttle 무시)
    messageDB.saveMessages(chatId, pendingMessages)
      .catch(console.error);
  }
}, [chatId, messages]);

// 2. beforeunload 핸들러
useEffect(() => {
  const handleBeforeUnload = () => {
    if (chatId && messages.length > 0) {
      // 동기 저장 시도 (best effort)
      // IndexedDB는 비동기라 보장 안됨, 하지만 시도는 필요
      messageDB.saveMessages(chatId, messages).catch(() => {});
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [chatId, messages]);
```

---

### 2.3 [P1] Message Queue IndexedDB 미저장

**위치**: `useMessageQueue.ts`

```typescript
// 현재: React state만 사용
const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
```

**문제점**:
- 스트리밍 중 입력한 대기 메시지가 새로고침 시 유실
- 사용자가 여러 메시지 입력 후 새로고침하면 모두 사라짐

**권장안**:

```typescript
// 1. IndexedDB에 queue 저장소 추가 (schema.ts)
export interface AgentDBSchema extends DBSchema {
  messages: { ... };
  sync_metadata: { ... };
  message_queue: {
    key: string; // id
    value: QueuedMessage & { chat_id: string };
    indexes: {
      'by-chat': string;
    };
  };
}

// 2. useMessageQueue에서 IndexedDB 연동
const enqueue = useCallback(async (content: string, imageUrl?: string) => {
  const newMessage: QueuedMessage = { ... };
  setQueuedMessages((prev) => [...prev, newMessage]);

  // IndexedDB 저장
  if (chatId) {
    await messageDB.saveQueuedMessage(chatId, newMessage);
  }
}, [chatId]);
```

---

## 3. Data Integrity Issues

### 3.1 [P2] `synced` 필드 타입 불일치

**위치**: `messageDB.ts:92, 114`

```typescript
// 저장 시 boolean으로 설정
synced: (message.status === 'committed' && !!message.server_id) as any,

// 조회 시 number로 쿼리 (IndexedDB는 boolean을 0/1로 저장)
const allUnsynced = await this.db!.getAllFromIndex('messages', 'by-synced', 0);
```

**문제점**:
- `as any` 캐스팅으로 타입 안전성 훼손
- boolean → number 변환 의존이 암묵적

**수정안**:

```typescript
// schema.ts
export interface MessageRecord extends AgentMessage {
  chat_id: string;
  synced: 0 | 1;  // number로 명시
  local_timestamp: number;
}

// messageDB.ts
synced: (message.status === 'committed' && !!message.server_id) ? 1 : 0,
```

---

### 3.2 [P2] IndexedDB Quota Exceeded 미처리

**위치**: `messageDB.ts` 전체

```typescript
// 현재: catch만 하고 무시
await tx.store.put(record);
await tx.done;
```

**문제점**:
- 저장 공간 부족 시 조용히 실패
- 사용자에게 피드백 없음

**권장안**:

```typescript
// 1. Quota 체크 유틸리티
async function checkStorageQuota(): Promise<{ available: boolean; usage: string }> {
  if ('estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usageRatio = (estimate.usage || 0) / (estimate.quota || 1);
    return {
      available: usageRatio < 0.9, // 90% 미만이면 OK
      usage: `${((estimate.usage || 0) / 1024 / 1024).toFixed(2)} MB`,
    };
  }
  return { available: true, usage: 'Unknown' };
}

// 2. 저장 시 에러 핸들링
async saveMessages(chatId: string, messages: AgentMessage[]): Promise<void> {
  try {
    // ... 저장 로직
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      // 오래된 데이터 정리 후 재시도
      await this.cleanup(chatId, { ttlMs: 24 * 60 * 60 * 1000 }); // 1일
      await this._saveMessagesInternal(chatId, messages);
    } else {
      throw err;
    }
  }
}
```

---

### 3.3 [P2] committedRetentionMs 하드코딩

**위치**: 여러 파일

```typescript
// useAgentChat.ts:427
reconcileMessages(prev, response.messages, { committedRetentionMs: 30000 });

// useMessagePersistence.ts:70
messageDB.cleanup(chatId, { committedRetentionMs: 30000 });

// message.ts:106
const { committedRetentionMs = 30000 } = options;
```

**권장안**:

```typescript
// constants/agent.ts
export const AGENT_CONFIG = {
  /** Committed 메시지 로컬 유지 시간 (ms) */
  COMMITTED_RETENTION_MS: 30000,
  /** IndexedDB TTL (ms) */
  MESSAGE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  /** 자동 저장 throttle (ms) */
  SAVE_THROTTLE_MS: 500,
  /** Cleanup 주기 (ms) */
  CLEANUP_INTERVAL_MS: 60000,
} as const;
```

---

## 4. Performance Issues

### 4.1 [P3] getMessages() 페이지네이션 미지원

**위치**: `messageDB.ts:127-138`

```typescript
async getMessages(chatId: string): Promise<AgentMessage[]> {
  // 전체 메시지 로드 - 대화가 길면 메모리 이슈
  const messages = await this.db!.getAllFromIndex(
    'messages',
    'by-chat-created',
    IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']),
  );
  return messages.map(this.recordToMessage);
}
```

**권장안**:

```typescript
async getMessages(
  chatId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ messages: AgentMessage[]; nextCursor: string | null }> {
  const { limit = 50, cursor } = options;

  const range = cursor
    ? IDBKeyRange.bound([chatId, cursor], [chatId, '\uffff'], true, false)
    : IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);

  let count = 0;
  const messages: MessageRecord[] = [];

  const tx = this.db!.transaction('messages', 'readonly');
  let cursorObj = await tx.store.index('by-chat-created').openCursor(range);

  while (cursorObj && count < limit) {
    messages.push(cursorObj.value);
    count++;
    cursorObj = await cursorObj.continue();
  }

  const nextCursor = cursorObj ? cursorObj.value.created_at : null;
  return {
    messages: messages.map(this.recordToMessage),
    nextCursor,
  };
}
```

---

### 4.2 [P3] Backend stream_id 미활용

**위치**: `useAgentSSE.ts`

**Backend 제공**:
```typescript
// Backend event에 stream_id 포함
event["stream_id"] = msg_id  // consumer.py:187
```

**Frontend 미사용**:
```typescript
// TokenEvent 타입에 stream_id 없음
export interface TokenEvent {
  content: string;
  seq: number;
  node: string;
  // stream_id 없음
}
```

**권장안**:

```typescript
// agent.type.ts
export interface TokenEvent {
  content: string;
  seq: number;
  node: string;
  stream_id?: string;  // Backend에서 제공
}

// useAgentSSE.ts - stream_id 저장
es.addEventListener('token', (e) => {
  const data: TokenEvent = JSON.parse((e as MessageEvent).data);
  if (data.stream_id) {
    lastStreamIdRef.current = data.stream_id;
  }
  // ...
});
```

---

## 5. Backend-Frontend Contract 정합성

### 5.1 DoneEvent 타입 불일치 가능성

**Frontend 기대**:
```typescript
export interface DoneEventResult {
  intent: string;
  answer: string;
  persistence: {
    conversation_id: string;
    user_id: string;
    user_message: string;
    assistant_message: string;
    assistant_message_created_at: string;
  };
}
```

**확인 필요**:
- Backend `done` 이벤트가 위 구조와 일치하는지 검증
- `persistence` 필드 optional 여부 확인

---

## 6. 개선 우선순위 및 작업 항목

### Phase 1 (Data Integrity - 1주 내)

| 작업 | 예상 영향 | 위험도 |
|------|----------|--------|
| Pending 메시지 즉시 저장 | 데이터 유실 방지 | 낮음 |
| Message Queue IndexedDB 저장 | 대기 메시지 유지 | 낮음 |
| `synced` 타입 수정 (0/1) | 타입 안전성 | 낮음 |

### Phase 2 (Standards & Config - 2주 내)

| 작업 | 예상 영향 | 위험도 |
|------|----------|--------|
| SSE `id:` / Last-Event-ID 지원 | 표준 복구 지원 | 중간 (Backend 연동) |
| 상수 통합 (`AGENT_CONFIG`) | 유지보수성 | 낮음 |
| IndexedDB quota 핸들링 | 안정성 | 낮음 |

### Phase 3 (Performance - 필요 시)

| 작업 | 예상 영향 | 위험도 |
|------|----------|--------|
| getMessages 페이지네이션 | 메모리 최적화 | 낮음 |
| stream_id 활용 | 정밀 복구 | 낮음 (Backend와 협의) |

---

## 7. 결론

Frontend Agent 시스템은 Optimistic Update, Reconcile, Token Recovery 등 핵심 기능이 잘 구현되어 있다. 주요 개선 사항은:

1. **데이터 유실 방지**: Pending 메시지 즉시 저장, Message Queue 영속화
2. **표준 준수**: SSE Last-Event-ID 지원 (Backend 연동 필요)
3. **코드 품질**: 타입 안전성, 상수 통합

Backend Event Router 리포트의 수정 사항(SSE `id:` 필드 추가)과 함께 적용하면 End-to-End 복구 시나리오가 완성된다.

---

## Appendix: 관련 Backend 이슈

| Backend 이슈 | Frontend 영향 |
|-------------|--------------|
| SSE `id:` 필드 미사용 (`stream.py`) | Last-Event-ID 복구 불가 |
| Reclaimer stream_id 미주입 (`reclaimer.py`) | 재처리 이벤트 stream_id 없음 |
| process_event 실패 시 ACK (`consumer.py`) | 이벤트 누락 → 클라이언트 불완전 상태 |

**참조**: `docs/reports/event-router-improvement-report.md`
