/**
 * IndexedDB 스키마 정의
 * Agent Message DB v1
 */

import type { DBSchema } from 'idb';
import type { AgentMessage } from '@/api/services/agent';

/**
 * 메시지 레코드 (IndexedDB 저장용)
 * Backend 스키마와 동일한 계층 구조:
 * users_accounts.id → chat_conversations.id → chat_messages.id
 */
export interface MessageRecord extends AgentMessage {
  /** 사용자 ID (Backend: users_accounts.id) */
  user_id: string;
  /** 세션 ID (Backend: chat_conversations.id, Frontend 호출 시 chatId) */
  session_id: string;
  /**
   * 서버 동기화 완료 여부
   * IndexedDB는 boolean을 0/1로 저장하므로 number 타입 사용
   */
  synced: 0 | 1;
  /** 로컬 저장 시간 (cleanup용) */
  local_timestamp: number;
}

/**
 * 동기화 메타데이터
 */
export interface SyncMetadata {
  /** 세션 ID (PK, Backend: chat_conversations.id) */
  session_id: string;
  /** 마지막 서버 동기화 시간 */
  last_sync_at: string;
  /** 페이지네이션 커서 */
  last_cursor: string | null;
  /** 더 불러올 메시지 있는지 */
  has_more: boolean;
  /** 캐시된 메시지 수 */
  message_count: number;
}

/**
 * IndexedDB 스키마
 */
export interface AgentDBSchema extends DBSchema {
  /**
   * 메시지 저장소
   */
  messages: {
    key: string; // client_id (PK)
    value: MessageRecord;
    indexes: {
      /** 사용자별 조회 (users_accounts.id) */
      'by-user': string;
      /** 사용자 + 세션별 조회 (chat_conversations.id) */
      'by-user-session': [string, string];
      /** 사용자 + 세션 + 시간순 조회 (정렬된 격리 조회) */
      'by-user-session-created': [string, string, string];
      /** 세션별 조회 (레거시 호환, session_id) */
      'by-session': string;
      /** 세션별 + 시간순 조회 (레거시 호환) */
      'by-session-created': [string, string];
      /** 상태별 필터 */
      'by-status': string; // MessageStatus
      /** 동기화 여부 */
      'by-synced': number; // boolean (0/1)
      /** 로컬 저장 시간 (TTL cleanup용) */
      'by-local-timestamp': number;
    };
  };

  /**
   * 동기화 메타데이터
   */
  sync_metadata: {
    key: string; // session_id (Backend: chat_conversations.id)
    value: SyncMetadata;
  };
}

/** DB 이름 */
export const DB_NAME = 'agent-chat-db';

/** DB 버전 (v3: session_id 명확한 계층화) */
export const DB_VERSION = 3;

/** TTL (기본 7일) */
export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Committed 메시지 retention (기본 30초) */
export const DEFAULT_COMMITTED_RETENTION_MS = 30000;
