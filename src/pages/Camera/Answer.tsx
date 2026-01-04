import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import CoinIcon from '@/assets/icons/icon_coin.svg';
import type { ScanClassifyResponse } from '@/api/services/scan/scan.type';
import { CHARACTER_LIST } from '@/constants/CharacterInfo';
import { CelebrationEffect } from '@/components/camera/CelebrationEffect';
import { RecycleInfoCard } from '@/components/camera/RecycleInfoCard';
import { RecyclingGuideCard } from '@/components/camera/RecyclingGuideCard';
import { ResultNavigationBtn } from '@/components/camera/ResultNavigationBtn';
import { WasteCategoryMap } from '@/types/MapTypes';

const Answer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { imageFile, data } = location.state as {
    imageFile: File;
    data: ScanClassifyResponse;
  };

  const { reward, pipeline_result } = data;
  const [showCelebration, setShowCelebration] = useState(false);

  const previewUrl = URL.createObjectURL(imageFile);
  const resultStatus = reward === null ? 'bad' : 'good';

  useEffect(() => {
    if (resultStatus === 'good' && reward?.received) {
      setShowCelebration(true);
    }
  }, [resultStatus, reward?.received]);

  if (!pipeline_result) return null;

  const { classification_result, final_answer } = pipeline_result;
  const middleCategory = classification_result.classification.middle_category;

  const targetCharacter = CHARACTER_LIST.find(
    (c) => c.middle_category === middleCategory,
  );

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
  };

  const handleNavigateToMap = () => {
    navigate('/map', {
      replace: true,
      state: {
        filter: WasteCategoryMap[middleCategory],
      },
    });
  };

  return (
    <>
      <div className='no-scrollbar max-w-app relative h-full overflow-y-auto'>
        <div
          id='container'
          className='mx-auto mb-5 flex w-full flex-col items-center gap-5 px-6.5 pt-3.5 pb-6'
        >
          <div className='relative h-[243px] w-[243px]'>
            <img
              src={previewUrl}
              alt='image'
              className='border-stroke-default mb-1.5 h-[243px] w-[243px] rounded-[5px] border-2 object-cover'
            />
            {reward && (
              <div
                role='button'
                onClick={handleNavigateToMap}
                className='absolute bottom-3.5 left-1/2 flex h-[33px] w-[146px] -translate-x-1/2 cursor-pointer items-center justify-center gap-1 rounded-[80px] bg-white shadow-md'
              >
                <img src={CoinIcon} alt='coin-icon' />
                <p className='text-text-primary text-xs leading-5 font-medium tracking-[-0.15px]'>
                  내 주변 보상 수거함
                </p>
              </div>
            )}
          </div>

          <RecycleInfoCard
            data={classification_result.classification}
            resultStatus={resultStatus}
            icon={targetCharacter?.wasteImage}
            feedbackMessage={final_answer.insufficiencies}
          />

          <RecyclingGuideCard data={final_answer.disposal_steps} />

          {targetCharacter && (
            <ResultNavigationBtn
              type={resultStatus === 'good' ? 'home' : 'camera'}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {reward && showCelebration && (
          <CelebrationEffect
            character={targetCharacter}
            onComplete={handleCelebrationComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Answer;
