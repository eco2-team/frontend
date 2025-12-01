import EcoImg from '@/assets/images/mainCharacter/main_1.png';
import type { ChatMessage, MessageType } from '@/pages/Chat/Chat';

type EcoChatProps = {
  type: MessageType;
  content: string;
  timestamp?: string;
  isContinued: boolean;
  isSameTime: boolean;
};

type UserChatProps = {
  type: MessageType;
  content: string;
  timestamp: string;
  isSameTime: boolean;
};

type ChatMessageListProps = { messages: ChatMessage[]; isSending: boolean };

const getFormattedTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  });
};

const EcoChat = ({
  type,
  content,
  timestamp,
  isContinued,
  isSameTime,
}: EcoChatProps) => {
  return (
    <div className='flex w-full flex-row justify-start gap-[7px] pt-[15px]'>
      {(!isContinued && <img src={EcoImg} className='h-9 w-9' />) || (
        <div className='h-9 w-9'></div>
      )}
      <div className='flex w-full flex-col items-start gap-2'>
        {type === 'text' ? (
          <div
            dangerouslySetInnerHTML={{ __html: content }}
            className='border-stroke-default text-text-primary inline-block max-w-[80%] rounded-[6px_16px_16px_16px] border-[0.676px] bg-[#F9FAFB] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'
          />
        ) : (
          <img src={content} className='h-[132px] w-[132px]' />
        )}
        {!isSameTime && timestamp && (
          <span className='text-text-inactive pl-2 text-[10px] leading-[15px] font-normal tracking-[0.117px]'>
            {getFormattedTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};

const UserChat = ({ type, content, timestamp, isSameTime }: UserChatProps) => {
  return (
    <div className='mt-[15px] flex w-full flex-col items-end gap-2'>
      {type === 'text' ? (
        <div className='border-brand-primary bg-brand-primary max-w-[80%] shrink-0 items-start rounded-[16px_6px_16px_16px] border-[0.676px] p-4 text-[13px] leading-[21.125px] font-normal tracking-[-0.076px] text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.10),0_2px_4px_-2px_rgba(0,0,0,0.10)]'>
          {content}
        </div>
      ) : (
        <img src={content} className='h-[132px] w-[132px]' />
      )}
      {!isSameTime && (
        <span className='text-text-inactive pr-4 text-[10px] leading-[15px] font-normal tracking-[0.117px]'>
          {getFormattedTime(timestamp)}
        </span>
      )}
    </div>
  );
};

const ChatMessageList = ({ messages, isSending }: ChatMessageListProps) => {
  return (
    <div className='mb-h-bottom-nav no-scrollbar pr-6 pl-6.5'>
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const next = messages[idx + 1];

        const isContinued = prev?.role === msg.role; // 전 메시지와 동일한 화자인지
        const isSameTime =
          next?.role === msg.role &&
          getFormattedTime(next?.timestamp) === getFormattedTime(msg.timestamp); // 다음 메시지와 동일한 화자, 시간인지

        if (msg.role === 'assistant') {
          return (
            <EcoChat
              key={idx}
              type={msg.type}
              content={msg.content}
              timestamp={msg.timestamp}
              isContinued={isContinued}
              isSameTime={isSameTime}
            />
          );
        }
        if (msg.role === 'user') {
          return (
            <UserChat
              key={idx}
              type={msg.type}
              content={msg.content}
              timestamp={msg.timestamp}
              isSameTime={isSameTime}
            />
          );
        }

        return null;
      })}
      {isSending && (
        <EcoChat
          key={messages.length + 1}
          type={'text'}
          content={"<span className='font-semibold'>···</span>"}
          isContinued={false}
          isSameTime={false}
        />
      )}
    </div>
  );
};

export default ChatMessageList;
