import DefaultIcon from '@/assets/images/mainCharacter/main_1.png';
import type { ScanClassificationResult } from '@/api/services/scan/scan.type';

const GOOD_MESSAGE =
  '정말 꼼꼼하게 분리 하셨네요, 너무 좋아요! 이대로만 해주시면 환경 보호와 자원 순환에 큰 도움이 될거에요!';

const RECYCLABLE_TYPE = '재활용폐기물';

const getRandomItem = (arr: string[] | undefined) => {
  if (!arr) return [];
  return arr[Math.floor(Math.random() * arr.length)];
};

interface RecycleInfoCardProps {
  data: ScanClassificationResult;
  resultStatus?: 'good' | 'bad' | 'default';
  icon?: string;
  feedbackMessage?: string[];
}

export const RecycleInfoCard = ({
  data,
  resultStatus = 'default',
  icon = DefaultIcon,
  feedbackMessage,
}: RecycleInfoCardProps) => {
  const { major_category, middle_category, minor_category } = data;

  const isGood = resultStatus === 'good';
  const isRecyclable = major_category === RECYCLABLE_TYPE;
  const randomMessage = isGood ? GOOD_MESSAGE : getRandomItem(feedbackMessage);

  const containerStyle = {
    good: 'border-brand-primary bg-brand-secondary',
    bad: 'border-[#FFEDD4] bg-[#FEFAEA]',
    default: 'border-stroke-default bg-[#F9FAFB]',
  }[resultStatus];

  return (
    <div
      id='waste-info'
      className={`flex flex-col gap-[9px] rounded-[10px] border-2 px-[25px] py-[19px] ${containerStyle}`}
    >
      <div className='flex items-end gap-3'>
        <img
          src={icon}
          alt='icon'
          className={`h-[72px] object-cover ${resultStatus === 'default' ? 'w-[72px]' : 'w-[62px] p-1'}`}
        />
        <div className='flex flex-col justify-center gap-1 pt-3 pb-1.5'>
          <p className='text-text-secondary text-xs leading-4 font-medium'>
            쓰레기 종류
          </p>
          <p className='text-text-primary text-xl leading-8 font-semibold tracking-[0.07px]'>
            {middle_category}
          </p>
        </div>
      </div>

      <div className='flex items-center justify-center rounded-2xl bg-white px-5 py-3.5'>
        <p className='text-text-primary text-[13px] leading-5.5 tracking-[0.07px]'>
          {`이 쓰레기는 ${minor_category}으로 보이네요. ${isRecyclable ? '재활용 수거함' : '일반 종량제 봉투'}에 배출해주세요.`}
        </p>
      </div>

      {isRecyclable && randomMessage && (
        <div
          className={`flex flex-col gap-1 rounded-2xl px-5 py-4 ${isGood ? 'bg-[#FEFCE8]' : 'bg-[#FEEDD4]'}`}
        >
          <p
            className={`text-xs leading-5.5 font-semibold ${isGood ? 'text-[#A65F00]' : 'text-[#CA3500]'}`}
          >
            {isGood ? '완벽해요!' : '아쉬운 점'}
          </p>
          <p className='text-text-primary text-[13px] leading-6 tracking-[0.07px]'>
            {randomMessage}
          </p>
        </div>
      )}
    </div>
  );
};
