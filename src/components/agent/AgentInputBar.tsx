/**
 * Agent 입력창
 * - 스트리밍 중 전송버튼 → STOP 버튼으로 변경
 * - 갤러리 첨부 지원
 * - 스트리밍 중에도 입력 가능 (큐에 추가됨)
 * - 모델 선택 지원
 */

import { useState, useRef, useEffect } from 'react';
import { Loader2, Image, Square, ChevronUp } from 'lucide-react';
import { AVAILABLE_MODELS } from '@/api/services/agent';
import type { ModelOption } from '@/api/services/agent';
import SendActiveIcon from '@/assets/icons/icon_send_active.svg';
import SendInactiveIcon from '@/assets/icons/icon_send_inactive.svg';

interface AgentInputBarProps {
  onSend: (message: string, imageUrl?: string) => void;
  isStreaming: boolean;
  isLoading: boolean;
  onStop: () => void;
  // 이미지
  selectedImage: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  onSelectImage: (file: File | null) => void;
  onClearImage: () => void;
  uploadImage: () => Promise<string | null>;
  // 모델 선택
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
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
  uploadImage,
  selectedModel,
  onSelectModel,
}: AgentInputBarProps) => {
  const [text, setText] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textarea 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  // 스트리밍 또는 로딩 중인지
  const isBusy = isStreaming || isLoading;

  const handleSubmit = async () => {
    if ((!text.trim() && !selectedImage) || isUploading) return;

    // 이미지가 있으면 먼저 업로드
    let imageUrl: string | undefined;
    if (selectedImage) {
      const cdnUrl = await uploadImage();
      imageUrl = cdnUrl ?? undefined;
      onClearImage();
    }

    onSend(text.trim(), imageUrl);
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

  // 갤러리 버튼 클릭 핸들러 (키보드 먼저 닫기)
  const handleGalleryClick = () => {
    // iOS: 키보드가 열린 상태에서 파일 선택 시 viewport 이슈 방지
    textareaRef.current?.blur();
    // 약간의 딜레이 후 파일 선택 열기 (키보드 닫힘 대기)
    setTimeout(() => {
      galleryInputRef.current?.click();
    }, 100);
  };

  const handleModelSelect = (model: ModelOption) => {
    onSelectModel(model);
    setModelDropdownOpen(false);
  };

  return (
    <div className='max-w-app flex w-full flex-col gap-2 bg-white px-4 pt-3 pb-4 shadow-[0_-3px_25px_rgba(0,0,0,0.20)]'>
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

      {/* 입력바 */}
      <div className='flex w-full items-end gap-2'>
        {/* 모델 선택 + 갤러리 버튼 */}
        <div className='relative flex flex-col items-center'>
          {/* 모델 선택 버튼 */}
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className='flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-gray-100'
          >
            {selectedModel.label}
            <ChevronUp
              className={`h-2.5 w-2.5 transition-transform ${modelDropdownOpen ? '' : 'rotate-180'}`}
            />
          </button>

          {/* 모델 드롭다운 */}
          {modelDropdownOpen && (
            <>
              <div
                className='fixed inset-0 z-10'
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className='absolute bottom-full left-0 z-20 mb-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className={`flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-gray-50 ${
                      selectedModel.id === model.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span className='text-sm font-medium text-gray-900'>
                      {model.label}
                    </span>
                    {model.description && (
                      <span className='text-xs text-gray-500'>
                        {model.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 갤러리 버튼 */}
          <button
            onClick={handleGalleryClick}
            className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100'
            title='갤러리'
          >
            <Image className='h-6 w-6' />
          </button>
        </div>

        {/* 입력창 */}
        <div className='flex-1'>
          <textarea
            ref={textareaRef}
            className='border-stroke-default bg-inactive placeholder:text-text-inactive w-full resize-none rounded-[20px] border px-4 py-2 text-sm leading-normal font-normal outline-none'
            placeholder='메시지를 입력하세요...'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
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
