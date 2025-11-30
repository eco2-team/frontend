import { useState, useEffect } from 'react';
import SuccessIcon from '@/assets/icons/icon_toast_fin.svg';
import ErrorIcon from '@/assets/icons/icon_toast_cancel.svg';
import { setToastFn, type ToastProps } from './toast';

export const ToastContainer = () => {
  const [currentToast, setCurrentToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    setToastFn((props: ToastProps) => {
      setCurrentToast(props);
      setTimeout(() => setCurrentToast(null), 3000);
    });
  }, []);

  if (!currentToast) return null;

  const Icon = currentToast.type === 'success' ? SuccessIcon : ErrorIcon;

  return (
    <div className='fixed top-4 right-0 left-0 z-50 flex justify-center'>
      <div className='animate-slide-down flex items-center gap-5 rounded-[10px] bg-black/80 px-5 py-3 shadow-lg'>
        <img src={Icon} alt={currentToast.type} className='h-6 w-6' />
        <span className='text-xs leading-5 font-medium tracking-[-0.15px] whitespace-pre-line text-white'>
          {currentToast.message}
        </span>
      </div>
    </div>
  );
};
