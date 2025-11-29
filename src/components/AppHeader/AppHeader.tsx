import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import GoBack from '@/assets/icons/go_back.svg';
import Cancel from '@/assets/icons/iconoir_cancel.svg';
import { ChatEndWarningDialog } from '@/components/chat/ChatEndWarningDialog';

const getTitle = (pathname: string) => {
  switch (pathname) {
    case '/chat':
      return '이코';
    case '/camera/answer':
      return '분석결과';
    case '/myPage':
      return '마이페이지';
    default:
      return '';
  }
};

const AppHeader = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hideDialog, setHideDialog] = useState(false);

  useEffect(() => {
    const hide = localStorage.getItem('hideChatEndDialog') === 'true';
    setHideDialog(hide);
  }, []);

  const handleGoBack = () => {
    if (pathname === '/chat' && !hideDialog) {
      setIsDialogOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleDialogConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('hideChatEndDialog', 'true');
      setHideDialog(true);
    }
    setIsDialogOpen(false);
    navigate(-1);
  };

  return (
    <div className='max-w-app h-app-header absolute top-0 flex w-full items-center justify-between px-7.5'>
      <img
        src={GoBack}
        alt='GoBack'
        onClick={handleGoBack}
        className='h-7.5 w-7.5 cursor-pointer'
      />
      <span className='text-text-primary absolute left-1/2 -translate-x-1/2 text-[18px] leading-8 font-bold tracking-[0.07px]'>
        {getTitle(pathname)}
      </span>

      {pathname === '/camera/answer' && (
        <img
          src={Cancel}
          alt='Cancel'
          onClick={() => navigate('/home')}
          className='h-7.5 w-7.5 cursor-pointer'
        />
      )}
      <ChatEndWarningDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={(isChecked) => handleDialogConfirm(isChecked)}
      />
    </div>
  );
};

export default AppHeader;
