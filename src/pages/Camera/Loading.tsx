import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AILoadingGif from '@/assets/images/mainCharacter/AI_Loading.gif';
import { useScanClassifyMutation } from '@/api/services/scan/scan.mutation';
import { useUploadImageMutation } from '@/api/services/image/image.mutation';
import { ImageService } from '@/api/services/image/image.service';
import { LOADING_STEPS } from '@/constants/AnswerConfig';
import { LoadingStep } from '@/components/camera/LoadingStep';
import { useLoadingSteps } from '@/hooks/useLoadingSteps';

const Loading = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { imageFile } = location.state;

  const { currentStep, minTimeElapsed } = useLoadingSteps();

  const {
    mutate: classifyScan,
    data: scanData,
    isSuccess: isScanComplete,
  } = useScanClassifyMutation({
    onSuccess: (data) => {
      console.log('✅ 스캔 분류 완료:', data);
    },
    onError: (error) => {
      console.error('❌ 스캔 분류 실패:', error);
    },
  });

  const { mutate: uploadImage } = useUploadImageMutation({
    onSuccess: async (data) => {
      const response = await ImageService.putUploadImageUDN(
        data.upload_url,
        imageFile,
      );
      console.log('📤 CDN 업로드 성공:', response);
      classifyScan({ image_url: data.cdn_url });
    },
    onError: (error) => {
      console.error('❌ 이미지 업로드 실패:', error);
    },
  });

  useEffect(() => {
    if (!imageFile) return;

    uploadImage({
      channel: 'scan',
      fileMeta: {
        filename: imageFile.name,
        content_type: imageFile.type,
      },
    });
  }, [imageFile, uploadImage]);

  useEffect(() => {
    if (!minTimeElapsed || !isScanComplete) return;

    // API 완료 및 최소 대기 시간 경과 시 다음 페이지로 이동
    if (!scanData.pipeline_result) {
      navigate('/camera/error', { replace: true });
      return;
    }
    navigate('/camera/answer', {
      state: {
        imageFile,
        data: scanData,
      },
    });
  }, [minTimeElapsed, isScanComplete, scanData, navigate, imageFile]);

  return (
    <div className='flex h-full w-full flex-col items-center justify-center'>
      <img
        src={AILoadingGif}
        alt='eco-character'
        className='h-[132px] w-[132px]'
      />

      <div className='mt-[52px] flex-col items-center text-center'>
        <p className='text-text-secondary mb-3 text-[15px] leading-5 tracking-[-0.15px]'>
          잠시만 기다려주세요...
        </p>
        <h1 className='text-text-primary text-[22px] leading-8 font-extrabold tracking-[0.07px]'>
          이코가 사진을 분석하고 있어요!
        </h1>

        <div className='mx-auto mt-14 flex w-fit flex-col items-start gap-5.5'>
          {LOADING_STEPS.map((text, index) => (
            <LoadingStep
              key={index}
              text={text}
              isComplete={currentStep > index + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
