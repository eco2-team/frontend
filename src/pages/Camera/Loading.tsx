import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AILoadingVideo from '@/assets/images/mainCharacter/AI_Loading.mp4';
import { useScanSubmitMutation } from '@/api/services/scan/scan.mutation';
import { useUploadImageMutation } from '@/api/services/image/image.mutation';
import { ImageService } from '@/api/services/image/image.service';
import { LOADING_STEPS } from '@/constants/AnswerConfig';
import { LoadingStep } from '@/components/camera/LoadingStep';
import { useScanSSE } from '@/hooks/useScanSSE';

const Loading = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { imageFile } = location.state;

  const [isVisible, setIsVisible] = useState(false);

  // SSE 연결 훅 (폴링 fallback 포함)
  const { connect, currentStep, isComplete, result, error } = useScanSSE({
    onComplete: (scanData) => {
      console.log('✅ 스캔 완료:', scanData);
    },
    onError: (err) => {
      console.error('❌ 스캔 실패:', err);
      navigate('/camera/error', { replace: true });
    },
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // POST /scan 요청
  const { mutate: submitScan } = useScanSubmitMutation({
    onSuccess: (data) => {
      console.log('✅ 스캔 작업 제출:', data);
      // SSE 연결 (실패 시 자동 폴링)
      connect(data.stream_url, data.result_url);
    },
    onError: (err) => {
      console.error('❌ 스캔 제출 실패:', err);
      navigate('/camera/error', { replace: true });
    },
  });

  // 이미지 업로드
  const { mutate: uploadImage } = useUploadImageMutation({
    onSuccess: async (data) => {
      const response = await ImageService.putUploadImageUDN(
        data.upload_url,
        imageFile,
      );
      console.log('📤 CDN 업로드 성공:', response);
      // POST /scan 요청
      submitScan({ image_url: data.cdn_url });
    },
    onError: (err) => {
      console.error('❌ 이미지 업로드 실패:', err);
      navigate('/camera/error', { replace: true });
    },
  });

  // 이미지 업로드 시작
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

  // 완료 시 Answer 페이지로 이동
  useEffect(() => {
    if (!isComplete || !result) return;

    if (!result.pipeline_result) {
      navigate('/camera/error', { replace: true });
      return;
    }

    navigate('/camera/answer', {
      state: {
        imageFile,
        data: result,
      },
      replace: true,
    });
  }, [isComplete, result, navigate, imageFile]);

  // 에러 발생 시 에러 페이지로 이동
  useEffect(() => {
    if (error) {
      navigate('/camera/error', { replace: true });
    }
  }, [error, navigate]);

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'} `}
    >
      <video
        autoPlay
        loop
        muted
        controls={false}
        playsInline
        preload='auto'
        className='h-38 w-38 object-contain'
      >
        <source src={AILoadingVideo} type='video/mp4' />
      </video>

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
              isComplete={currentStep > index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
