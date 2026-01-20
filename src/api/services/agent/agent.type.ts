/**
 * Agent API 타입 정의
 */

// ============================================================
// 모델 선택
// ============================================================

/** LLM Provider */
export type LLMProvider = 'openai' | 'google';

/** 모델 옵션 */
export interface ModelOption {
  id: string;
  provider: LLMProvider;
  label: string;
  description?: string;
}

/** 사용 가능한 모델 목록 */
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt-5.2',
    provider: 'openai',
    label: 'GPT-5.2',
    description: '빠르고 정확한 응답',
  },
  {
    id: 'gemini-3-flash-preview',
    provider: 'google',
    label: 'Gemini 3 Flash',
    description: '빠른 멀티모달 처리',
  },
];

/** 기본 모델 */
export const DEFAULT_MODEL = AVAILABLE_MODELS[0];

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

/** 메시지 상태 (Optimistic Update 지원) */
export type MessageStatus = 'pending' | 'streaming' | 'committed' | 'failed';

/** 메시지 */
export interface AgentMessage {
  /** 클라이언트 생성 ID (UUID) - 항상 존재 */
  client_id: string;
  /** 서버 DB ID - committed 후에만 존재 */
  server_id?: string;
  /** 레거시 호환용 (server_id || client_id) */
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  image_url?: string;
  /** 메시지 상태 */
  status: MessageStatus;
}

/** 서버에서 받은 메시지 (status 없음) */
export interface ServerMessage {
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
  /** 페이징 커서 (ISO 8601 타임스탬프) */
  cursor?: string;
}

/** 채팅 상세 응답 (메시지 히스토리 포함) */
export interface ChatDetailResponse {
  id: string;
  title: string | null;
  messages: ServerMessage[];
  has_more: boolean;
  next_cursor: string | null;
  created_at: string;
}
