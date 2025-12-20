import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/dialog/Dialog';
import api from '@/api/axiosInstance';
import { clearStorageUserInfo } from '@/util/UserUtil';

interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutDialog = ({ isOpen, onClose }: LogoutDialogProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { data } = await api.post('/api/v1/auth/logout');

      if (data.success) {
        clearStorageUserInfo();
        onClose();
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('로그아웃 중 오류가 발생했습니다.', err);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleLogout}
      description='로그아웃 하시겠어요?'
      confirmText='로그아웃'
      cancelText='취소'
    />
  );
};
