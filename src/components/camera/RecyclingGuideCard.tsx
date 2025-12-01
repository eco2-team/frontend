interface RecyclingGuideCardProps {
  data: Record<string, string>;
}

export const RecyclingGuideCard = ({ data }: RecyclingGuideCardProps) => {
  return (
    <div
      id='recycle-tip'
      className='flex w-full flex-col gap-3.5 rounded-[10px] border-2 border-[#8EC5FF] bg-[#EFF6FF] px-[25px] py-[18px]'
    >
      <h1 className='text-text-primary text-[16px] leading-6 font-semibold tracking-[-0.3px]'>
        올바른 배출 방법
      </h1>

      <div className='flex flex-col gap-1.5'>
        {Object.entries(data).map(
          ([step, text], index) =>
            text && (
              <p
                key={step}
                className='text-text-primary text-[14px] leading-7.5 tracking-[0px]'
              >
                <span className='font-semibold'> {`${index + 1}단계: `}</span>
                {text}
              </p>
            ),
        )}
      </div>
    </div>
  );
};
