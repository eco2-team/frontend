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

    // pending/streaming은 항상 유지
    if (local.status === 'pending' || local.status === 'streaming') {
      return true;
    }

    // committed는 retention 기간 내면 유지 (Eventual Consistency 버퍼)
    if (local.status === 'committed' && !local.server_id) {
      const age = now - new Date(local.created_at).getTime();
      return age < committedRetentionMs;
    }

    // failed는 유지 (사용자가 재시도 가능)
    if (local.status === 'failed') {
      return true;
    }

    return false;
  });

  // 병합
  const merged = [...serverConverted, ...localToKeep];

  // 중복 제거 (server_id 우선, 로컬 image_url 보존)
  const deduped = new Map<string, AgentMessage>();
  merged.forEach((msg) => {
    const key = msg.server_id || msg.client_id;
    if (!deduped.has(key)) {
      deduped.set(key, msg);
    } else {
      const existing = deduped.get(key)!;
      if (msg.server_id && !existing.server_id) {
        // 서버 버전 우선, 단 로컬에만 image_url이 있으면 보존
        const merged = existing.image_url && !msg.image_url
          ? { ...msg, image_url: existing.image_url }
          : msg;
        deduped.set(key, merged);
      }
    }
  });

  // 시간순 정렬
  return Array.from(deduped.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
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
