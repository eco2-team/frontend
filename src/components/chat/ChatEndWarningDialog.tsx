import { useState } from 'react';
import unCheckIcon from '@/assets/icons/icon_uncheck.svg';
import CheckIcon from '@/assets/icons/icon_check.svg';
import { Dialog } from '@/components/dialog/Dialog';

interface ChatEndWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isChecked: boolean) => void;
}

export const ChatEndWarningDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: ChatEndWarningDialogProps) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(isChecked)}
      title='채팅을 종료 하시겠습니까?'
      description={`이코의의 채팅을 종료할 시 기록이 저장되지\n않습니다. 나가시겠습니까?`}
      content={
        <label className='text-text-secondary mx-auto flex items-center justify-center gap-1 text-[10px]'>
          <img
            src={isChecked ? CheckIcon : unCheckIcon}
            alt='checkbox'
            className='h-4 w-4 cursor-pointer'
            onClick={() => setIsChecked(!isChecked)}
          />
          앞으로 이 메시지를 표시하지 않기
        </label>
      }
      confirmText='나가기'
      cancelText='머무르기'
    />
  );
};
