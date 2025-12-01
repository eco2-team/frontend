import ChatInputBar from '@/components/chat/ChatInputBar';
import ChatMessageList from '@/components/chat/ChatMessageList';
import { START_ASSISTANT_MESSAGE } from '@/constants/ChatConfig';
import { useEffect, useRef, useState } from 'react';

export type MessageType = 'text' | 'image';

export type RoleType = 'user' | 'assistant';

export type ChatMessage = {
  role: RoleType; // 누가 말했는지
  content: string; // 메시지 내용: 텍스트 또는 이미지 URL
  timestamp: string; // UI 표시용 시간
  type: MessageType;
};

const Chat = () => {
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 유저의 메시지를 형식에 맞게 추가
  const addMessage = (role: RoleType, content: string, type: MessageType) => {
    const formattedContent = content.replace(
      /(\*\*([^*]+)\*\*)/g,
      '<span className="font-semibold">$2</span>',
    );

    const newMessage: ChatMessage = {
      role,
      content: formattedContent,
      timestamp: new Date().toISOString(),
      type,
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  useEffect(() => {
    addMessage('assistant', START_ASSISTANT_MESSAGE, 'text');
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  // 메시지 입력 시 스크롤 최하단으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className='relative flex h-full w-full flex-col'>
      {/* 스크롤되는 메시지 리스트 영역 */}
      <div ref={scrollRef} className='no-scrollbar flex-1 overflow-y-auto'>
        <ChatMessageList messages={messages} isSending={isSending} />
      </div>

      {/* 채팅 인풋바 영역 */}
      <div className='h-chat-input-bar shrink-0'>
        <ChatInputBar
          addMessage={addMessage}
          isSending={isSending}
          setIsSending={setIsSending}
        />
      </div>
    </div>
  );
};

export default Chat;
