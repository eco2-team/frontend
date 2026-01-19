/**
 * Agent 입력창
 * - 스트리밍 중 전송버튼 → STOP 버튼으로 변경
 * - 갤러리 첨부 지원
 * - 스트리밍 중에도 입력 가능 (큐에 추가됨)
 */

import { useState, useRef } from 'react';
import { Loader2, Image, Square } from 'lucide-react';
import SendActiveIcon from '@/assets/icons/icon_send_active.svg';
import SendInactiveIcon from '@/assets/icons/icon_send_inactive.svg';

interface AgentInputBarProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  isLoading: boolean;
  onStop: () => void;
  // 이미지
  selectedImage: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  onSelectImage: (file: File | null) => void;
  onClearImage: () => void;
}

export const AgentInputBar = ({
  onSend,
  isStreaming,
  isLoading,
  onStop,
  selectedImage,
  previewUrl,
  isUploading,
  onSelectImage,
  onClearImage,
}: AgentInputBarProps) => {
  const [text, setText] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 스트리밍 또는 로딩 중인지
  const isBusy = isStreaming || isLoading;

  const handleSubmit = () => {
    if ((!text.trim() && !selectedImage) || isUploading) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectImage(file);
    }
    // 같은 파일 재선택 허용
    e.target.value = '';
  };

  const canSend = (text.trim() || selectedImage) && !isUploading;

  return (
    <div className='max-w-app flex w-full flex-col gap-3 bg-white px-4 pt-3 pb-6 shadow-[0_-3px_25px_rgba(0,0,0,0.20)]'>
      {/* 숨겨진 갤러리 input */}
      <input
        ref={galleryInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={handleFileSelect}
      />

      {/* 선택된 이미지가 있을 때만 표시 */}
      {previewUrl && (
        <div className='flex justify-start'>
          <div className='relative'>
            <img
              src={previewUrl}
              alt='preview'
              className='h-20 w-20 rounded-md border object-cover'
            />
            <button
              onClick={onClearImage}
              className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white'
            >
              ✕
            </button>
            {isUploading && (
              <div className='absolute inset-0 flex items-center justify-center rounded-md bg-black/50'>
                <Loader2 className='h-6 w-6 animate-spin text-white' />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 입력바 */}
      <div className='flex w-full items-center gap-2'>
        {/* 갤러리 버튼 */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100'
          title='갤러리'
        >
          <Image className='h-6 w-6' />
        </button>

        {/* 입력창 */}
        <div className='flex-1'>
          <input
            type='text'
            className='border-stroke-default bg-inactive placeholder:text-text-inactive w-full rounded-[60px] border px-4 py-2 text-sm leading-normal font-normal outline-none'
            placeholder='메시지를 입력하세요...'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 전송/중단 버튼 */}
        {isBusy ? (
          <button
            onClick={onStop}
            className='flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gray-700 transition-colors hover:bg-gray-800'
            title='응답 중단'
          >
            <Square className='h-4 w-4 fill-white text-white' />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canSend}>
            <img
              src={canSend ? SendActiveIcon : SendInactiveIcon}
              alt='send'
              className='h-[38px] w-[38px]'
            />
          </button>
        )}
      </div>
    </div>
  );
};
