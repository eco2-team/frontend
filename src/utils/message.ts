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
 * 메시지 목록 reconcile (서버 데이터와 로컬 데이터 병합)
 * - 서버에 있는 메시지: committed로 업데이트
 * - 로컬에만 있는 pending/streaming 메시지: 유지
 * - 중복 제거 (server_id 또는 client_id 기준)
 */
export const reconcileMessages = (
  localMessages: AgentMessage[],
  serverMessages: ServerMessage[],
): AgentMessage[] => {
  // 서버 메시지를 client 메시지로 변환
  const serverConverted = serverMessages.map(serverToClientMessage);

  // 서버 메시지 ID Set (빠른 조회용)
  const serverIdSet = new Set(serverMessages.map((m) => m.id));

  // 로컬에만 있는 pending/streaming 메시지 필터링
  // (아직 서버에 커밋되지 않은 메시지)
  const pendingLocal = localMessages.filter(
    (local) =>
      (local.status === 'pending' || local.status === 'streaming') &&
      !local.server_id &&
      !serverIdSet.has(local.client_id),
  );

  // 서버 메시지 + 로컬 pending 메시지 병합
  // 시간순 정렬
  const merged = [...serverConverted, ...pendingLocal].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return merged;
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
