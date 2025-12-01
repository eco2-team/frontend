import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/pages/App/AppLayout';
import Answer from '@/pages/Camera/Answer';
import Camera from '@/pages/Camera/Camera';
import Error from '@/pages/Camera/Error';
import Loading from '@/pages/Camera/Loading';
import Chat from '@/pages/Chat/Chat';
import Home from '@/pages/Home/Home';
import Info from '@/pages/Info/Info';
import Login from '@/pages/Login/Login';
import Map from '@/pages/Map/Map';
import MyPage from '@/pages/MyPage/MyPage';
import EditPage from '@/pages/MyPage/EditPage';
import Splash from '@/pages/Splash/Splash';

const App = () => (
  <Routes>
    <Route index element={<Splash />} />
    <Route path='/login' element={<Login />} />

    <Route path='/' element={<AppLayout />}>
      <Route path='home' element={<Home />} />
      <Route path='myPage'>
        <Route index element={<MyPage />} />
        <Route path='edit' element={<EditPage />} />
      </Route>
      <Route path='chat' element={<Chat />} />
      <Route path='camera'>
        <Route index element={<Camera />} />
        <Route path='loading' element={<Loading />} />
        <Route path='error' element={<Error />} />
        <Route path='answer' element={<Answer />} />
      </Route>
      <Route path='info' element={<Info />} />
      <Route path='map' element={<Map />} />
    </Route>
    {/* 잘못된 경로 진입 시 → 스플래시로 이동 */}
    <Route path='*' element={<Navigate to='/' replace />} />
  </Routes>
);

export default App;
