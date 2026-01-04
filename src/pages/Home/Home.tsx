import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPage from '@/assets/icons/icon_my_page.svg';
import {
  CHARACTER_DATA,
  CHARACTER_KEY_TO_NAME,
} from '@/constants/CharacterInfo';
import type { CharacterItem, CharacterNames } from '@/types/CharacterInfoTypes';
import CharacterCollection from './CharacterCollection';
import api from '@/api/axiosInstance';
import type { UserInfoResponse } from '@/types/UserTypes';
import { getStorageUserInfo, setStorageUserInfo } from '@/util/UserUtil';

const Home = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string>('환경 지킴이');
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterNames>('이코');
  const [viewInfo, setViewInfo] = useState<CharacterItem>(
    CHARACTER_DATA[CHARACTER_KEY_TO_NAME[selectedCharacter]],
  );
  const isEco = viewInfo.characterType === 'main';

  useEffect(() => {
    // 항상 서버에서 최신 사용자 정보를 가져옴
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/api/v1/users/me');
        if (!data) return;

        const user = data as UserInfoResponse;
        setStorageUserInfo(user);
        setNickname(user.nickname);
      } catch (err) {
        // 에러 시 캐시된 값 사용 (fallback)
        const cached = getStorageUserInfo();
        if (cached) setNickname(cached.nickname);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    setViewInfo(CHARACTER_DATA[CHARACTER_KEY_TO_NAME[selectedCharacter]]);
  }, [selectedCharacter]);

  return (
    <div className='flex h-full w-full flex-col items-center overflow-hidden'>
      <div className='flex h-[15%] w-full flex-row items-center justify-between px-6'>
        <div className='flex flex-col gap-[3px]'>
          <p className='text-text-primary text-[22px] leading-8 font-extrabold tracking-[0.07px]'>
            {`반가워요 ${nickname}님`}
          </p>
          <p className='text-text-secondary text-[14px] leading-5 font-normal tracking-[-0.15px]'>
            오늘도 함께 지구를 지켜요!
          </p>
        </div>
        <img
          role='button'
          src={MyPage}
          className='h-10 w-10 cursor-pointer'
          onClick={() => navigate('/myPage')}
        />
      </div>
      <div className='flex h-[45%] w-full flex-col items-center justify-end pb-3'>
        {/* 말풍선 */}
        <div
          className={`flex w-full justify-end pr-6 ${isEco ? 'pb-1.5' : 'pb-3'}`}
        >
          <div className='text-text-primary relative inline-block rounded-2xl bg-white px-4 py-2 shadow-md'>
            <span className='text-text-primary text-[12px] leading-[19.5px] font-medium tracking-[-0.2px]'>
              {viewInfo.subDescription}
            </span>
            <div className='absolute top-full left-[60%] h-0 w-0 -translate-x-1/2 border-t-10 border-r-10 border-t-white border-r-transparent' />
          </div>
        </div>

        {/* 캐릭터 정보 */}
        <div className='relative mb-[15px] flex items-end justify-center pt-6'>
          <img
            src={viewInfo.characterImage}
            alt={viewInfo.characterName}
            className={`object-contain ${isEco ? 'h-41 w-41' : 'h-30 w-30'}`}
          />
          {/* 그림자 */}
          <div
            className={`absolute bottom-0 h-[23px] rounded-[50%] bg-black/15 blur-[6px] ${isEco ? 'w-[151px]' : 'w-[109px]'}`}
          />
        </div>
        <p className='text-text-primary pt-[15px] text-[18px] leading-6 font-extrabold tracking-[-0.312px]'>
          {viewInfo.characterName}
        </p>
        <p className='text-text-secondary text-[12px] leading-5 font-normal tracking-[-0.312px]'>
          {viewInfo.description}
        </p>
      </div>
      <CharacterCollection
        selectedCharacter={selectedCharacter}
        setSelectedCharacter={setSelectedCharacter}
      />
    </div>
  );
};

export default Home;
