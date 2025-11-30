import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from '@/App.tsx';
import { QueryClientProvider } from '@/providers/QueryClientProvider';
import { ToastContainer } from '@/components/Toast/ToastContainer';
import '@/style/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider>
      {/* 화면 캐싱 기능 임시 해제 */}
      {/* <AliveScope> */}
      <HashRouter>
        <ToastContainer />
        <App />
      </HashRouter>
      {/* </AliveScope> */}
    </QueryClientProvider>
  </StrictMode>,
);
