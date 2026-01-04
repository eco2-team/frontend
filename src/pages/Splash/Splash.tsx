import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/assets/images/mainCharacter/app_logo.png';
import api from '@/api/axiosInstance';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/api/v1/users/me');

        if (data && data.username) {
          // 로그인 상태→ 홈 화면으로 이동
          navigate('/home', { replace: true });
        } else {
          // 비로그인 상태 → 로그인 화면으로 이동
          navigate('/login', { replace: true });
        }
      } catch {
        // 요청 실패나 정보 없음 → 로그인 화면으로 이동
        navigate('/login', { replace: true });
      }
    };

    // 1초 스플래시 후 체크
    const timer = setTimeout(checkAuth, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className='bg-brand-secondary flex h-full w-full items-center justify-center'>
      <img src={Logo} alt='logo' className='h-[119px] w-[119px]' />
    </div>
  );
};

export default Splash;
