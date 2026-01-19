/**
 * Agent API 서비스
 */

import api from '@/api/axiosInstance';
import type {
  ChatDetailParams,
  ChatDetailResponse,
  ChatListParams,
  ChatListResponse,
  CreateChatRequest,
  CreateChatResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpdateChatTitleRequest,
} from './agent.type';

const BASE_URL = '/api/v1/chat';

export class AgentService {
  /**
   * 대화 목록 조회
   * GET /api/v1/chat
   */
  static async getChatList(params?: ChatListParams): Promise<ChatListResponse> {
    const response = await api.get<ChatListResponse>(BASE_URL, { params });
    return response.data;
  }

  /**
   * 새 대화 생성
   * POST /api/v1/chat
   */
  static async createChat(
    data?: CreateChatRequest,
  ): Promise<CreateChatResponse> {
    const response = await api.post<CreateChatResponse>(BASE_URL, data);
    return response.data;
  }

  /**
   * 대화 삭제
   * DELETE /api/v1/chat/{chatId}
   */
  static async deleteChat(chatId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${chatId}`);
  }

  /**
   * 대화 제목 수정
   * PATCH /api/v1/chat/{chatId}
   */
  static async updateChatTitle(
    chatId: string,
    data: UpdateChatTitleRequest,
  ): Promise<void> {
    await api.patch(`${BASE_URL}/${chatId}`, data);
  }

  /**
   * 메시지 전송
   * POST /api/v1/chat/{chatId}/messages
   */
  static async sendMessage(
    chatId: string,
    data: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const response = await api.post<SendMessageResponse>(
      `${BASE_URL}/${chatId}/messages`,
      data,
    );
    return response.data;
  }

  /**
   * 채팅 상세 조회 (메시지 히스토리 포함)
   * GET /api/v1/chat/{chatId}
   */
  static async getChatDetail(
    chatId: string,
    params?: ChatDetailParams,
  ): Promise<ChatDetailResponse> {
    const response = await api.get<ChatDetailResponse>(
      `${BASE_URL}/${chatId}`,
      { params },
    );
    return response.data;
  }
}
