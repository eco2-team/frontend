/**
 * 메시지 관련 유틸리티
 * - UUID 생성
 * - 서버 메시지 → 클라이언트 메시지 변환
 * - Reconcile 로직
 */

import type { AgentMessage, ServerMessage, MessageStatus } from '@/api/services/agent';

/**
 * UUID v4 생성
 * crypto.randomUUID() 지원 시 사용, 미지원 시 폴백
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 서버 메시지를 클라이언트 메시지로 변환 (committed 상태)
 */
export const serverToClientMessage = (serverMsg: ServerMessage): AgentMessage => ({
  client_id: serverMsg.id, // 서버 ID를 client_id로 사용 (서버에서 온 메시지)
  server_id: serverMsg.id,
  id: serverMsg.id,
  role: serverMsg.role,
  content: serverMsg.content,
  created_at: serverMsg.created_at,
  image_url: serverMsg.image_url,
  status: 'committed',
});

/**
 * 새 사용자 메시지 생성 (pending 상태)
 */
export const createUserMessage = (
  content: string,
  imageUrl?: string,
): AgentMessage => {
  const clientId = generateUUID();
  return {
    client_id: clientId,
    id: clientId,
    role: 'user',
    content,
    created_at: new Date().toISOString(),
    image_url: imageUrl,
    status: 'pending',
  };
};

/**
 * 새 어시스턴트 메시지 생성 (streaming 상태)
 */
export const createAssistantMessage = (
  content: string,
  jobId?: string,
): AgentMessage => {
  const clientId = jobId || generateUUID();
  return {
    client_id: clientId,
    id: clientId,
    role: 'assistant',
    content,
    created_at: new Date().toISOString(),
    status: 'streaming',
  };
};

/**
 * 메시지 상태 업데이트
 */
export const updateMessageStatus = (
  message: AgentMessage,
  status: MessageStatus,
  serverId?: string,
): AgentMessage => ({
  ...message,
  status,
  server_id: serverId ?? message.server_id,
  id: serverId ?? message.id,
});

/**
 * 메시지 목록 reconcile (Eventual Consistency 대응)
 * - 서버 메시지: committed로 변환
 * - 로컬 pending/streaming: 항상 유지
 * - 로컬 committed (서버 없음): retention 기간 내 유지
 * - 중복 제거: server_id 우선, client_id 대체
 */
export const reconcileMessages = (
  localMessages: AgentMessage[],
  serverMessages: ServerMessage[],
  options: {
    /** Committed 메시지 유지 기간 (ms) - 기본 30초 */
    committedRetentionMs?: number;
  } = {},
): AgentMessage[] => {
  const { committedRetentionMs = 30000 } = options;

  // 서버 메시지 변환
  const serverConverted = serverMessages.map(serverToClientMessage);

  // 서버 메시지 ID Map (중복 체크용)
  const serverIdMap = new Map(serverMessages.map((m) => [m.id, m]));

  // 서버 메시지 content 기반 매칭 (role + content → timestamp)
  // SSE 실패 후 복귀 시 local pending/failed 메시지와 서버 메시지 중복 방지
  const CONTENT_MATCH_WINDOW_MS = 120000; // 2분 이내 같은 내용이면 동일 메시지로 판단
  const serverContentIndex = new Map<string, number>();
  serverMessages.forEach((m) => {
    const key = `${m.role}:${m.content}`;
    const ts = new Date(m.created_at).getTime();
    // 같은 content가 여러 개면 가장 최신 timestamp 사용
    const existing = serverContentIndex.get(key);
    if (!existing || ts > existing) {
      serverContentIndex.set(key, ts);
    }
  });

  // 현재 시간
  const now = new Date().getTime();

  // 로컬 메시지 분류
  const localToKeep = localMessages.filter((local) => {
    // 서버에 있으면 제외 (서버 버전 사용)
    if (local.server_id && serverIdMap.has(local.server_id)) {
      return false;
    }
    if (serverIdMap.has(local.client_id)) {
      return false;
    }

    // server_id 없는 로컬 메시지: content 기반 매칭으로 중복 확인
    if (!local.server_id) {
      const contentKey = `${local.role}:${local.content}`;
      const serverTs = serverContentIndex.get(contentKey);
      if (serverTs !== undefined) {
        const localTs = new Date(local.created_at).getTime();
        if (Math.abs(localTs - serverTs) < CONTENT_MATCH_WINDOW_MS) {
          // 서버에 동일 메시지 존재 → 로컬 드롭 (서버 버전 사용)
          return false;
        }
      }
    }

    // pending/streaming은 유지 (위 content 매칭에서 걸리지 않은 경우)
    if (local.status === 'pending' || local.status === 'streaming') {
      return true;
    }

    // server_id 있는 committed: 서버에서 확인된 메시지 → 유지
    // (다른 페이지에서 로드된 메시지일 수 있으므로 드롭하면 안 됨)
    if (local.status === 'committed' && local.server_id) {
      return true;
    }

    // committed without server_id: retention 기간 내 유지 (Eventual Consistency 버퍼)
    if (local.status === 'committed' && !local.server_id) {
      const age = now - new Date(local.created_at).getTime();
      return age < committedRetentionMs;
    }

    // failed는 유지 (사용자가 재시도 가능) - 위 content 매칭에서 안 걸린 경우만
    if (local.status === 'failed') {
      return true;
    }

    return false;
  });

  // 병합
  const merged = [...serverConverted, ...localToKeep];

  // 중복 제거 (server_id 우선, 로컬 image_url 보존)
  // 삽입 순서(= 서버 응답 순서)를 tiebreaker로 보존
  const deduped = new Map<string, { msg: AgentMessage; order: number }>();
  merged.forEach((msg, idx) => {
    const key = msg.server_id || msg.client_id;
    if (!deduped.has(key)) {
      deduped.set(key, { msg, order: idx });
    } else {
      const existing = deduped.get(key)!;
      if (msg.server_id && !existing.msg.server_id) {
        // 서버 버전 우선, 단 로컬에만 image_url이 있으면 보존
        const mergedMsg = existing.msg.image_url && !msg.image_url
          ? { ...msg, image_url: existing.msg.image_url }
          : msg;
        deduped.set(key, { msg: mergedMsg, order: existing.order });
      }
    }
  });

  // 시간순 정렬 (동일 timestamp 시 삽입 순서로 안정 정렬)
  const entries = Array.from(deduped.values());
  // Date 파싱을 sort 외부에서 1회만 수행 (O(N) vs O(N·logN))
  const withTs = entries.map((entry) => ({
    ...entry,
    ts: new Date(entry.msg.created_at).getTime(),
  }));
  withTs.sort((a, b) => {
    const timeDiff = a.ts - b.ts;
    if (timeDiff !== 0) return timeDiff;
    return a.order - b.order;
  });
  return withTs.map(({ msg }) => msg);
};

/**
 * 특정 메시지 찾기 (client_id 또는 server_id로)
 */
export const findMessageById = (
  messages: AgentMessage[],
  id: string,
): AgentMessage | undefined => {
  return messages.find((m) => m.client_id === id || m.server_id === id || m.id === id);
};

/**
 * 특정 메시지 업데이트 (불변성 유지)
 */
export const updateMessageInList = (
  messages: AgentMessage[],
  id: string,
  updater: (msg: AgentMessage) => AgentMessage,
): AgentMessage[] => {
  return messages.map((msg) =>
    msg.client_id === id || msg.server_id === id || msg.id === id
      ? updater(msg)
      : msg,
  );
};
