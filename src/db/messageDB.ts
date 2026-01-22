/**
 * IndexedDB Message Storage
 * - 메시지 영구 저장 (새로고침 대비)
 * - Eventual Consistency 버퍼
 * - 오프라인 캐시
 */

import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { AgentMessage, MessageStatus } from '@/api/services/agent';
import type {
  AgentDBSchema,
  MessageRecord,
  SyncMetadata,
} from './schema';
import {
  DB_NAME,
  DB_VERSION,
  DEFAULT_TTL_MS,
  DEFAULT_COMMITTED_RETENTION_MS,
} from './schema';

export class MessageDB {
  private db: IDBPDatabase<AgentDBSchema> | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * DB 초기화 (Singleton)
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const self = this;

      this.db = await openDB<AgentDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          console.log(`[MessageDB] Upgrading from ${oldVersion} to ${DB_VERSION}`);

          // v1: 초기 스키마
          if (oldVersion < 1) {
            // 메시지 저장소
            const msgStore = db.createObjectStore('messages', {
              keyPath: 'client_id',
            });
            msgStore.createIndex('by-chat', 'chat_id', { unique: false });
            msgStore.createIndex('by-chat-created', ['chat_id', 'created_at'], {
              unique: false,
            });
            msgStore.createIndex('by-status', 'status', { unique: false });
            msgStore.createIndex('by-synced', 'synced', { unique: false });
            msgStore.createIndex('by-local-timestamp', 'local_timestamp', {
              unique: false,
            });

            // 동기화 메타데이터
            db.createObjectStore('sync_metadata', { keyPath: 'chat_id' });

            console.log('[MessageDB] Schema created');
          }
        },
        blocked() {
          console.warn('[MessageDB] Upgrade blocked - close other tabs');
        },
        blocking() {
          console.warn('[MessageDB] Blocking other tabs');
          self.db?.close();
          self.db = null;
        },
        terminated() {
          console.error('[MessageDB] DB terminated unexpectedly');
          self.db = null;
        },
      });

      console.log('[MessageDB] Initialized');
    })();

    return this.initPromise;
  }

  /**
   * Helper: synced 값 계산 (타입 안전)
   */
  private getSyncedValue(message: AgentMessage): 0 | 1 {
    return message.status === 'committed' && !!message.server_id ? 1 : 0;
  }

  /**
   * 메시지 저장 (단일)
   */
  async saveMessage(chatId: string, message: AgentMessage): Promise<void> {
    await this.init();

    const record: MessageRecord = {
      ...message,
      chat_id: chatId,
      synced: this.getSyncedValue(message),
      local_timestamp: Date.now(),
    };

    const tx = this.db!.transaction('messages', 'readwrite');
    await tx.store.put(record);
    await tx.done;
  }

  /**
   * 메시지 저장 (일괄)
   */
  async saveMessages(chatId: string, messages: AgentMessage[]): Promise<void> {
    if (messages.length === 0) return;

    await this.init();
    const tx = this.db!.transaction('messages', 'readwrite');

    for (const msg of messages) {
      const record: MessageRecord = {
        ...msg,
        chat_id: chatId,
        synced: this.getSyncedValue(msg),
        local_timestamp: Date.now(),
      };
      await tx.store.put(record);
    }

    await tx.done;
    console.log(`[MessageDB] Saved ${messages.length} messages to ${chatId}`);
  }

  /**
   * 채팅별 메시지 조회 (시간순 정렬)
   */
  async getMessages(chatId: string): Promise<AgentMessage[]> {
    await this.init();

    // 복합 인덱스로 정렬된 결과 가져오기
    const messages = await this.db!.getAllFromIndex(
      'messages',
      'by-chat-created',
      IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']),
    );

    return messages.map(this.recordToMessage);
  }

  /**
   * 특정 메시지 조회 (client_id로)
   */
  async getMessage(clientId: string): Promise<AgentMessage | null> {
    await this.init();
    const record = await this.db!.get('messages', clientId);
    return record ? this.recordToMessage(record) : null;
  }

  /**
   * 동기화되지 않은 메시지 조회
   */
  async getUnsyncedMessages(chatId: string): Promise<AgentMessage[]> {
    await this.init();
    // boolean을 number로 변환 (false = 0)
    const allUnsynced = await this.db!.getAllFromIndex('messages', 'by-synced', 0);
    const chatUnsynced = allUnsynced.filter((r) => r.chat_id === chatId);
    return chatUnsynced.map(this.recordToMessage);
  }

  /**
   * 메시지 상태 업데이트
   */
  async updateMessageStatus(
    clientId: string,
    status: MessageStatus,
    serverId?: string,
  ): Promise<void> {
    await this.init();
    const record = await this.db!.get('messages', clientId);
    if (!record) {
      console.warn(`[MessageDB] Message not found: ${clientId}`);
      return;
    }

    record.status = status;
    if (serverId) {
      record.server_id = serverId;
      record.id = serverId;
      record.synced = 1;
    }
    record.local_timestamp = Date.now();

    const tx = this.db!.transaction('messages', 'readwrite');
    await tx.store.put(record);
    await tx.done;

    console.log(`[MessageDB] Updated message ${clientId} to ${status}`);
  }

  /**
   * 동기화 메타데이터 저장
   */
  async saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('sync_metadata', 'readwrite');
    await tx.store.put(metadata);
    await tx.done;
  }

  /**
   * 동기화 메타데이터 조회
   */
  async getSyncMetadata(chatId: string): Promise<SyncMetadata | null> {
    await this.init();
    return (await this.db!.get('sync_metadata', chatId)) || null;
  }

  /**
   * 오래된 메시지 정리
   * - synced=true && server_id 있음 && retention 시간 초과 → 삭제
   * - local_timestamp 기준 TTL 초과 → 삭제
   */
  async cleanup(
    chatId: string,
    options: {
      committedRetentionMs?: number;
      ttlMs?: number;
    } = {},
  ): Promise<number> {
    const {
      committedRetentionMs = DEFAULT_COMMITTED_RETENTION_MS,
      ttlMs = DEFAULT_TTL_MS,
    } = options;

    await this.init();
    const now = Date.now();
    const messages = await this.db!.getAllFromIndex('messages', 'by-chat', chatId);

    const toDelete: string[] = [];

    for (const record of messages) {
      const age = now - record.local_timestamp;

      // TTL 초과 (7일)
      if (age > ttlMs) {
        toDelete.push(record.client_id);
        continue;
      }

      // 동기화 완료된 committed 메시지 (30초)
      if (
        record.synced &&
        record.server_id &&
        record.status === 'committed' &&
        age > committedRetentionMs
      ) {
        toDelete.push(record.client_id);
      }
    }

    if (toDelete.length > 0) {
      const tx = this.db!.transaction('messages', 'readwrite');
      for (const id of toDelete) {
        await tx.store.delete(id);
      }
      await tx.done;

      console.log(`[MessageDB] Cleaned up ${toDelete.length} messages from ${chatId}`);
    }

    return toDelete.length;
  }

  /**
   * 채팅 전체 삭제 (채팅방 나가기 시)
   */
  async deleteChat(chatId: string): Promise<void> {
    await this.init();
    const messages = await this.db!.getAllFromIndex('messages', 'by-chat', chatId);

    const tx = this.db!.transaction(['messages', 'sync_metadata'], 'readwrite');

    // 메시지 삭제
    for (const msg of messages) {
      await tx.objectStore('messages').delete(msg.client_id);
    }

    // 메타데이터 삭제
    await tx.objectStore('sync_metadata').delete(chatId);
    await tx.done;

    console.log(`[MessageDB] Deleted chat ${chatId} (${messages.length} messages)`);
  }

  /**
   * DB 전체 초기화 (로그아웃 시)
   */
  async clear(): Promise<void> {
    await this.init();
    const tx = this.db!.transaction(['messages', 'sync_metadata'], 'readwrite');

    await tx.objectStore('messages').clear();
    await tx.objectStore('sync_metadata').clear();
    await tx.done;

    console.log('[MessageDB] Cleared all data');
  }

  /**
   * 통계 조회 (디버깅용)
   */
  async getStats(): Promise<{
    totalMessages: number;
    unsyncedMessages: number;
    chats: number;
    dbSizeEstimate: string;
  }> {
    await this.init();
    const totalMessages = await this.db!.count('messages');
    // boolean을 number로 변환 (false = 0)
    const unsyncedMessages = await this.db!.countFromIndex(
      'messages',
      'by-synced',
      0,
    );
    const chats = await this.db!.count('sync_metadata');

    // IndexedDB 크기 추정
    let dbSizeEstimate = 'Unknown';
    if ('estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
        dbSizeEstimate = `${usedMB} MB`;
      } catch (err) {
        console.warn('[MessageDB] Failed to estimate storage:', err);
      }
    }

    return {
      totalMessages,
      unsyncedMessages,
      chats,
      dbSizeEstimate,
    };
  }

  /**
   * Helper: Record → Message 변환
   */
  private recordToMessage(record: MessageRecord): AgentMessage {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { chat_id, synced, local_timestamp, ...message } = record;
    return message;
  }
}

// Singleton 인스턴스
export const messageDB = new MessageDB();
