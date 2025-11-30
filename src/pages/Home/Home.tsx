import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPage from '@/assets/icons/icon_my_page.svg';
import { CHARACTER_DATA } from '@/constants/CharacterInfo';
import type { CharacterItem, CharacterNames } from '@/types/CharacterInfoTypes';
import CharacterCollection from './CharacterCollection';

const Home = () => {
  const navigate = useNavigate();

  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterNames>('이코');
  const [viewInfo, setViewInfo] = useState<CharacterItem>(
    CHARACTER_DATA[selectedCharacter],
  );

  useEffect(() => {
    setViewInfo(CHARACTER_DATA[selectedCharacter]);
  }, [selectedCharacter]);

  return (
    <div className='flex h-full w-full flex-col items-center overflow-hidden'>
      <div className='flex h-[60%] w-full flex-col items-center pt-7.5'>
        <div className='flex w-full flex-row justify-between px-6'>
          <div className='gap-[3px]'>
            <p className='text-text-primary text-[22px] leading-8 font-extrabold tracking-[0.07px]'>
              반가워요 환경 지킴이님
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

        {/* 말풍선 */}
        <div className='h-[20%] w-full'>
          {viewInfo.characterType === 'main' && (
            <div className='flex w-full justify-end pt-6 pr-6'>
              <div className='text-text-primary relative inline-block rounded-2xl bg-white px-4 py-2 shadow-md'>
                <span className='text-text-primary text-[12px] leading-[19.5px] font-medium tracking-[-0.2px]'>
                  찰칵! 분리수거하고 이코의 친구를 얻어보세요!
                </span>
                <div className='absolute top-full left-[65%] h-0 w-0 -translate-x-1/2 border-t-10 border-r-10 border-t-white border-r-transparent' />
              </div>
            </div>
          )}
        </div>

        {/* 캐릭터 정보 */}
        <div className='relative mb-[15px] flex h-[360px] items-end justify-center pt-6'>
          <img
            src={viewInfo.characterImage}
            alt={viewInfo.characterName}
            className='h-41 w-41 object-contain'
          />
          {/* 그림자 */}
          <div
            className={`absolute bottom-0 h-[23px] rounded-[50%] bg-black/15 blur-[6px] ${viewInfo.characterType === 'main' ? 'w-[151px]' : 'w-[109px]'}`}
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
