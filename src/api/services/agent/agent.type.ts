/**
 * Agent API 타입 정의
 */

// ============================================================
// 위치 정보
// ============================================================

/** Frontend Position (useGeolocation 반환값) */
export interface Position {
  lat: number;
  lng: number;
}

/** Backend UserLocation (API 요청용) */
export interface UserLocation {
  latitude: number;
  longitude: number;
}

// ============================================================
// 대화 목록 (사이드바)
// ============================================================

/** 대화 요약 (사이드바 아이템) */
export interface ChatSummary {
  id: string;
  title: string | null;
  preview: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

/** 대화 목록 응답 */
export interface ChatListResponse {
  chats: ChatSummary[];
  next_cursor: string | null;
}

/** 대화 목록 요청 파라미터 */
export interface ChatListParams {
  limit?: number;
  cursor?: string;
}

// ============================================================
// 메시지
// ============================================================

/** 메시지 역할 */
export type MessageRole = 'user' | 'assistant';

/** 메시지 */
export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  image_url?: string;
}

/** 메시지 전송 요청 */
export interface SendMessageRequest {
  message: string;
  image_url?: string;
  user_location?: UserLocation;
  model?: string;
}

/** 메시지 전송 응답 */
export interface SendMessageResponse {
  job_id: string;
  stream_url: string;
  status: 'submitted' | 'queued' | 'failed';
}

// ============================================================
// SSE 이벤트
// ============================================================

/** 토큰 이벤트 */
export interface TokenEvent {
  content: string;
  seq: number;
  node: string;
}

/** 토큰 복구 이벤트 */
export interface TokenRecoveryEvent {
  stage: 'token_recovery';
  status: 'snapshot';
  accumulated: string;
  last_seq: number;
  completed: boolean;
}

/** 완료 이벤트 결과 */
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

/** 완료 이벤트 */
export interface DoneEvent {
  job_id: string;
  stage: 'done';
  status: 'completed' | 'failed';
  seq: number;
  progress: number;
  result: DoneEventResult;
  message: string;
}

/** 진행 단계 타입 */
export type StageType =
  | 'queued'
  | 'intent'
  | 'vision'
  | 'waste_rag'
  | 'character'
  | 'location'
  | 'bulk_waste'
  | 'weather'
  | 'collection_point'
  | 'recyclable_price'
  | 'web_search'
  | 'image_generation'
  | 'general'
  | 'aggregator'
  | 'summarize'
  | 'answer'
  | 'done';

/** 진행 상태 */
export type ProgressStatus = 'started' | 'completed' | 'failed';

/** Stage별 결과 타입 (확장 가능) */
export interface StageResult {
  [key: string]: unknown;
}

/** 진행 이벤트 */
export interface ProgressEvent {
  job_id: string;
  stage: StageType;
  status: ProgressStatus;
  seq: number;
  progress: number;
  result?: StageResult;
  message?: string;
}

/** 현재 진행 상태 */
export interface CurrentStage {
  stage: StageType;
  status: ProgressStatus;
  progress: number;
  message: string;
}

// ============================================================
// 대화 관리
// ============================================================

/** 대화 생성 요청 */
export interface CreateChatRequest {
  title?: string;
}

/** 대화 생성 응답 */
export interface CreateChatResponse {
  id: string;
  title: string | null;
  created_at: string;
}

/** 대화 제목 수정 요청 */
export interface UpdateChatTitleRequest {
  title: string;
}

// ============================================================
// 채팅 상세 (메시지 히스토리 포함)
// ============================================================

/** 채팅 상세 요청 파라미터 */
export interface ChatDetailParams {
  limit?: number;
  cursor?: string;
}

/** 채팅 상세 응답 (메시지 히스토리 포함) */
export interface ChatDetailResponse {
  id: string;
  title: string | null;
  messages: AgentMessage[];
  has_more: boolean;
  next_cursor: string | null;
  created_at: string;
}
