import { useRef, useState } from 'react';
import cameraIcon from '@/assets/icons/icon_camera.svg';
import SendActiveIcon from '@/assets/icons/icon_send_active.svg';
import SendInactiveIcon from '@/assets/icons/icon_send_inactive.svg';
import type { RoleType, MessageType } from '@/pages/Chat/Chat';
import api from '@/api/axiosInstance';
import axios from 'axios';
import { END_ASSISTANT_MESSAGE } from '@/constants/ChatConfig';

type ChatInputBarProp = {
  addMessage: (role: RoleType, content: string, type: MessageType) => void;
  setIsSending: (sending: boolean) => void;
  isSending: boolean;
};

const ChatInputBar = ({
  addMessage,
  setIsSending,
  isSending,
}: ChatInputBarProp) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>();
  const [sessionId, setSessionId] = useState<string>();
  const canSend = (text || imageFile) && !isSending;

  const handleSend = async () => {
    if (!(text || imageFile)) return;

    setText('');
    setImageFile(null);

    try {
      let cdnUrl: string | null = null;

      if (imageFile) {
        const fileMeta = {
          filename: imageFile.name,
          content_type: imageFile.type,
        };

        // Presigned URL 요청
        const { data: presignedData } = await api.post(
          '/api/v1/images/chat',
          fileMeta,
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );

        const uploadUrl = presignedData.upload_url;
        if (!uploadUrl) throw new Error('업로드 URL이 없습니다.');

        // 이미지 업로드
        await axios.put(uploadUrl, imageFile, {
          headers: { 'Content-Type': imageFile.type },
        });

        cdnUrl = presignedData.cdn_url;
      }

      // 로컬 메시지 상태 업데이트
      if (cdnUrl) addMessage('user', cdnUrl, 'image');
      if (text) addMessage('user', text, 'text');
      setIsSending(true);

      const payload = {
        session_id: sessionId,
        message: text,
        temperature: 0.2,
        image_url: cdnUrl,
      };

      const response = await api.post('/api/v1/chat/messages', payload);

      if (!response || !response.data) {
        console.error('[chat] no response data', response);
        return;
      }

      const { data } = response;

      if (data.session_id) {
        setSessionId(data.session_id);
      }

      if (data.user_answer) {
        addMessage('assistant', data.user_answer, 'text');
        addMessage('assistant', END_ASSISTANT_MESSAGE, 'text');
      }
    } catch (err) {
      console.error('채팅 전송 중 오류 발생:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageDelete = () => {
    setImageFile(null);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
  };

  return (
    <div className='max-w-app absolute bottom-0 flex w-full flex-col gap-3 bg-white px-4 pt-3 pb-6 shadow-[0_-3px_25px_rgba(0,0,0,0.20)]'>
      {/* 숨겨진 카메라 input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={handleCameraCapture}
      />

      {/* 선택된 이미지가 있을 때만 표시 */}
      {imageFile && (
        <div className='flex justify-start'>
          <div className='relative'>
            <img
              src={URL.createObjectURL(imageFile)}
              alt='preview'
              className='h-20 w-20 rounded-md border object-cover'
            />
            <button
              onClick={handleImageDelete}
              className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white'
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 하단 입력바 */}
      <div className='flex w-full items-center gap-3'>
        {/* 카메라 */}
        <button
          onClick={openCamera}
          className='flex h-10 w-10 items-center justify-center'
        >
          <img
            src={cameraIcon}
            alt='camera'
            className='h-10 w-10 cursor-pointer'
          />
        </button>

        {/* 입력창 */}
        <div className='flex-1'>
          <input
            type='text'
            className='border-stroke-default bg-inactive placeholder:text-text-inactive w-full rounded-[60px] border px-4 py-2 text-sm leading-normal font-normal outline-none'
            placeholder='메시지를 입력하세요...'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* 전송 버튼 */}
        <button onClick={handleSend} disabled={!canSend}>
          <img
            src={canSend ? SendActiveIcon : SendInactiveIcon}
            alt='send'
            className='h-[38px] w-[38px]'
          />
        </button>
      </div>
    </div>
  );
};

export default ChatInputBar;
