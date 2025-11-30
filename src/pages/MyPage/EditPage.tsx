import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import closeIcon from '@/assets/icons/icon_x_gray.svg';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import {
  CanEditKey,
  ProfileLabels,
  USER_FIELD_MAP,
} from '@/constants/UserConfig';
import api from '@/api/axiosInstance';
import type { CanEditKeyType } from '@/types/UserTypes';

type EditPageState = {
  label: CanEditKeyType;
  value: string;
};

const EditPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const keyboardOffset = useKeyboardOffset();

  const { label, value } = location.state as EditPageState;
  const [input, setInput] = useState(value || '');

  const handleConfirm = async () => {
    if (CanEditKey !== label) return;

    await api.patch('/api/v1/user/me', {
      [USER_FIELD_MAP[label]]: input.trim(),
    });
    navigate(-1);
  };

  const handleClear = () => {
    setInput('');
  };

  return (
    <div className='relative flex h-full w-full flex-col'>
      <div className='mt-7 flex flex-1 flex-col overflow-y-auto px-8.5'>
        <h1 className='text-text-primary mb-2 text-lg leading-7.5 font-semibold tracking-[-0.27px]'>
          {`${ProfileLabels[label]}}을 입력해주세요.`}
        </h1>

        <label className='text-brand-primary mt-2 mb-2.5 h-7.5 text-[10px] leading-7.5 tracking-[-0.15px]'>
          {ProfileLabels[label]}
        </label>

        <div className='relative'>
          <input
            type={'text'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className='border-brand-primary text-text-primary w-full border-b bg-transparent px-0 py-2 text-lg font-medium placeholder-gray-400 outline-none focus:border-[#4A9B8A]'
          />

          {input && (
            <button
              onClick={handleClear}
              className='absolute right-0 bottom-2.5 cursor-pointer'
            >
              <img
                src={closeIcon}
                alt='close-icon'
                className='h-[19px] w-[19px]'
              />
            </button>
          )}
        </div>
      </div>

      <div
        className='max-w-app absolute right-0 left-0 mx-auto flex h-14.5 w-full shrink-0 transition-[bottom] duration-300 ease-out'
        style={{
          bottom: keyboardOffset
            ? `${keyboardOffset}px`
            : 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          onClick={handleConfirm}
          disabled={!input.trim()}
          className='bg-brand-primary w-full cursor-pointer py-3.5 text-base leading-7.5 font-semibold tracking-[1.5px] text-white disabled:bg-gray-300'
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default EditPage;
