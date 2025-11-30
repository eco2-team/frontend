import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowIcon from '@/assets/icons/icon_arrow.svg';
import { CantEditKeys, ProfileLabels } from '@/constants/UserConfig';
import { LogoutDialog } from '@/components/myPage/LogoutDialog';
import { type UserType } from '@/types/UserTypes';
import api from '@/api/axiosInstance';

const MyPage = () => {
  const navigate = useNavigate();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<UserType[]>();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data } = await api.get('/api/v1/user/me');
        if (!data) return;

        setMenuItems([
          {
            label: 'nickname',
            value: data.nickname || '',
          },
          {
            label: 'name',
            value: data.username || '',
          },
          {
            label: 'phone_number',
            value: data.phone_number || '',
          },
          {
            label: 'login',
            value: data.provider || '',
          },
        ]);
      } catch (e) {
        console.error('사용자 정보를 가져올 수 없습니다.', e);
      }
    };
    getUserData();
  }, []);

  const handleEditPage = (item: UserType) => {
    if (CantEditKeys.includes(item.label)) return;

    // MyPage
    navigate('/myPage/edit', {
      state: { menuItems, value: item.value, label: item.label },
    });
  };
  console.log('setMenuItems', menuItems);

  return (
    <div className='flex h-full flex-col bg-[#F3F4F6]'>
      <div className='bg-white pt-7'>
        {menuItems?.map((page) => (
          <div
            key={page.label}
            className='mb-4.5 flex w-full items-center justify-between pr-5 pl-8.5 text-[15px] leading-7.5 tracking-[-0.225px]'
          >
            <span className='text-text-primary font-semibold'>
              {ProfileLabels[page.label]}
            </span>
            <div className='flex items-center gap-0.5'>
              <span className='text-text-secondary'>
                {page.label === 'phone_number'
                  ? (page.value ?? '')
                      .toString()
                      .replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
                  : (page.value ?? '')}
              </span>
              {!CantEditKeys.includes(page.label) && (
                <button
                  onClick={() => handleEditPage(page)}
                  className='cursor-pointer'
                >
                  <img src={ArrowIcon} alt='arrow-icon' className='h-6 w-6' />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className='mt-auto flex h-22 items-start justify-center bg-white pt-5'>
        <button
          onClick={() => setIsLogoutDialogOpen(true)}
          className='text-text-secondary cursor-pointer px-5 py-1.5 text-center text-sm leading-5 tracking-[-0.15px] underline underline-offset-auto'
        >
          로그아웃
        </button>
      </div>

      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
      />
    </div>
  );
};

export default MyPage;
