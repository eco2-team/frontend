/**
 * IndexedDB 스키마 정의
 * Agent Message DB v1
 */

import type { DBSchema } from 'idb';
import type { AgentMessage } from '@/api/services/agent';

/**
 * 메시지 레코드 (IndexedDB 저장용)
 */
export interface MessageRecord extends AgentMessage {
  /** 채팅 ID (FK) */
  chat_id: string;
  /** 서버 동기화 완료 여부 */
  synced: boolean;
  /** 로컬 저장 시간 (cleanup용) */
  local_timestamp: number;
}

/**
 * 동기화 메타데이터
 */
export interface SyncMetadata {
  /** 채팅 ID (PK) */
  chat_id: string;
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
    key: string; // client_id
    value: MessageRecord;
    indexes: {
      /** 채팅별 조회 */
      'by-chat': string;
      /** 채팅별 + 시간순 조회 (복합 인덱스) */
      'by-chat-created': [string, string];
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
    key: string; // chat_id
    value: SyncMetadata;
  };
}

/** DB 이름 */
export const DB_NAME = 'agent-chat-db';

/** DB 버전 */
export const DB_VERSION = 1;

/** TTL (기본 7일) */
export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Committed 메시지 retention (기본 30초) */
export const DEFAULT_COMMITTED_RETENTION_MS = 30000;
