import api from '@/api/axiosInstance';
import { BottomSheet } from '@/components/bottomSheet/BottomSheet';
import { CHARACTER_DATA, CHARACTER_LIST } from '@/constants/CharacterInfo';
import type {
  CharacterKey,
  CharacterNames,
  CharacterType,
} from '@/types/CharacterInfoTypes';
import { useEffect, useState } from 'react';

type CharacterCollectionProps = {
  selectedCharacter?: CharacterNames;
  setSelectedCharacter: (value: CharacterNames) => void;
};

type MyCharacterResponse = {
  id: string;
  code: string;
  name: CharacterNames;
  type: string;
  dialog: string;
  acquired_at: string;
};

// 쓰레기 아이콘 별 사이즈
const size: Record<CharacterType, { w: string; h: string; mb: string }> = {
  main: { w: 'w-[53px]', h: 'h-[53px]', mb: 'mb-[7.35px]' },
  sub: { w: 'w-[76px]', h: 'h-[46px]', mb: 'mb-[11px]' },
};

// 공통 스타일 정의
const CARD_STYLE = {
  base: 'flex flex-col items-center pb-4.5 justify-end shrink-0 w-full max-w-[106px] h-[106px] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-transform duration-200',

  acquired: (isSelected: boolean) =>
    `border-[1.352px] border-brand-primary pt-4.5 cursor-pointer active:scale-105 ${
      isSelected ? 'bg-brand-secondary' : 'bg-white'
    }`,

  locked: 'border border-stroke-default pt-[18px] bg-inactive cursor-default',
};

const TEXT_COLOR = {
  acquired: 'text-text-primary',
  locked: 'text-text-inactive',
};

const header = ({
  acquiredList,
  totalWasteCnt,
}: {
  acquiredList: CharacterKey[];
  totalWasteCnt: number;
}) => (
  <div className='flex flex-row justify-between'>
    <span className='text-text-primary text-[17px] leading-6 font-semibold tracking-[-0.312px]'>
      캐릭터 컬렉션
    </span>
    <div className='text-brand-primary bg-brand-secondary flex h-[27px] shrink-0 items-center justify-center gap-[5px] rounded-[18px] border border-[#B9F8CF] px-2.5 py-1.5 text-center text-[12px] font-medium tracking-[-0.312px]'>
      <p className='font-extrabold'>
        {acquiredList.length}/{totalWasteCnt}
      </p>
      캐릭터 획득!
    </div>
  </div>
);

const CharacterCollection = ({
  selectedCharacter,
  setSelectedCharacter,
}: CharacterCollectionProps) => {
  const [acquiredList, setAcquiredList] = useState<CharacterNames[]>([]);
  const totalWasteCnt = Object.keys(CHARACTER_DATA).length;

  useEffect(() => {
    const getAcquiredCharacter = async () => {
      const { data } = await api.get('/api/v1/user/me/characters');
      if (!data) {
        console.error('획득한 캐릭터 리스트를 불러올 수 없습니다.');
        return;
      }
      const names = data.map((item: MyCharacterResponse) => item.name);
      setAcquiredList(names);
    };
    getAcquiredCharacter();
  }, []);

  return (
    <BottomSheet
      isOpen
      initialHeight={40}
      minHeight={40}
      snapPoints={[40, 85]}
      header={header({ acquiredList, totalWasteCnt })}
    >
      {/* 캐릭터 리스트 */}
      <div className='mt-6 grid grid-cols-3 place-items-center gap-[13px]'>
        {CHARACTER_LIST.map((item) => {
          const isAcquired = acquiredList.includes(item.characterName);
          const isSelected = selectedCharacter === item.characterName;

          return (
            <div
              key={item.characterName}
              role='button'
              onClick={() =>
                isAcquired && setSelectedCharacter(item.characterName)
              }
              className={` ${CARD_STYLE.base} ${isAcquired ? CARD_STYLE.acquired(isSelected) : CARD_STYLE.locked} `}
            >
              <img
                src={item.wasteImage}
                alt={item.wasteName}
                className={`${size[item.characterType].w} ${size[item.characterType].h} ${size[item.characterType].mb} object-contain`}
              />

              <p
                className={`font-inter text-center text-[10px] leading-[15px] font-normal tracking-[0.117px] ${
                  isAcquired ? TEXT_COLOR.acquired : TEXT_COLOR.locked
                }`}
              >
                {item.wasteName}
              </p>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
};

export default CharacterCollection;
