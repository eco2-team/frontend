import AppHeader from '@/components/AppHeader/AppHeader';
import BottomNav from '@/components/bottomNav/BottomNav';
import { Outlet, useLocation } from 'react-router-dom';

const AppLayout = () => {
  const { pathname } = useLocation();
  const hideBottomNavPaths = ['/chat', '/camera', '/myPage', '/agent'];
  const showBottomNav = !hideBottomNavPaths.some((path) =>
    pathname.startsWith(path),
  );

  const fullScreenPaths = ['/camera', '/map'];
  const isFullScreen = fullScreenPaths.some((path) => pathname === path);

  const showAppHeaderPaths = [
    '/chat',
    '/camera/answer',
    '/camera/error',
    '/myPage',
  ];
  const showAppHeader = showAppHeaderPaths.some((path) =>
    pathname.startsWith(path),
  );

  return (
    <div
      className={`h-full w-full overflow-hidden ${
        pathname === '/home' ? 'bg-[#EBFBFF]' : 'bg-white'
      }`}
    >
      <div
        className={`relative w-full ${isFullScreen ? 'h-full' : 'mt-[env(safe-area-inset-top)] h-[calc(100%-env(safe-area-inset-top))]'}`}
      >
        {/* 화면 캐싱 기능 임시 해제 */}
        {showAppHeader && <AppHeader />}

        {/* <KeepAlive id={location.pathname.split('/')[1]}> */}
        <div
          className='absolute right-0 left-0 overflow-y-auto'
          style={{
            top: showAppHeader ? 'var(--height-app-header)' : 0,
            bottom: showBottomNav ? 'var(--height-bottom-nav)' : 0,
          }}
        >
          <Outlet />
        </div>
        {/* </KeepAlive> */}
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
};

export default AppLayout;
