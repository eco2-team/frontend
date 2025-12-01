import ErrorImage from '@/assets/images/mainCharacter/main_6.png';

const Error = () => {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center'>
      <img src={ErrorImage} alt='eco-character-error' className='h-36 w-36' />

      <div className='mt-7 flex flex-col items-center gap-4 px-[53px] text-center'>
        <h1 className='text-text-primary text-xl leading-8 font-extrabold tracking-[0.07px]'>
          앗! 사진이 정확히
          <br />
          인식되지 않았어요.
        </h1>

        <p className='text-text-primary text-[13px] leading-6 tracking-[0.07px]'>
          다른 물건이 함께 찍히면 이코가 쓰레기를 분석하기 어려울 수 있어요.
          하나의 물건을 더 가까이, 선명하게 촬영 해주세요.
        </p>
      </div>
    </div>
  );
};

export default Error;
