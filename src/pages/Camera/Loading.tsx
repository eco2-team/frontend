import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AILoadingVideo from '@/assets/images/mainCharacter/AI_Loading.mp4';
import { useScanClassifyMutation } from '@/api/services/scan/scan.mutation';
import { useUploadImageMutation } from '@/api/services/image/image.mutation';
import { ImageService } from '@/api/services/image/image.service';
import { LOADING_STEPS } from '@/constants/AnswerConfig';
import { LoadingStep } from '@/components/camera/LoadingStep';
import { useLoadingSteps } from '@/hooks/useLoadingSteps';

// 🔍 DEBUG: 디버그 로그 함수
const debugLog = (tag: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 ${tag}:`, ...args);
};

const Loading = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { imageFile } = location.state;

  debugLog('INIT', 'Loading 컴포넌트 마운트', { imageFile: imageFile?.name, imageType: imageFile?.type, imageSize: imageFile?.size });

  const { currentStep, minTimeElapsed } = useLoadingSteps();
  const [isVisible, setIsVisible] = useState(false);

  // 🔍 DEBUG: 상태 변화 추적
  useEffect(() => {
    debugLog('STATE', 'minTimeElapsed 변경', { minTimeElapsed });
  }, [minTimeElapsed]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const {
    mutate: classifyScan,
    data: scanData,
    isSuccess: isScanComplete,
    isPending: isScanPending,
    isError: isScanError,
    error: scanError,
  } = useScanClassifyMutation({
    onSuccess: (data) => {
      debugLog('SCAN_SUCCESS', '스캔 분류 완료', JSON.stringify(data, null, 2));
    },
    onError: (error) => {
      debugLog('SCAN_ERROR', '스캔 분류 실패', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        raw: error,
      });
    },
  });

  // 🔍 DEBUG: scan 상태 추적
  useEffect(() => {
    debugLog('SCAN_STATE', 'scan mutation 상태', {
      isScanComplete,
      isScanPending,
      isScanError,
      scanError: scanError?.message,
      scanData: scanData ? JSON.stringify(scanData).substring(0, 500) : null,
    });
  }, [isScanComplete, isScanPending, isScanError, scanError, scanData]);

  const { mutate: uploadImage, isPending: isUploadPending, isError: isUploadError, error: uploadError } = useUploadImageMutation({
    onSuccess: async (data) => {
      debugLog('UPLOAD_URL_SUCCESS', 'Presigned URL 받음', { upload_url: data.upload_url, cdn_url: data.cdn_url });
      try {
        const response = await ImageService.putUploadImageUDN(
          data.upload_url,
          imageFile,
        );
        debugLog('CDN_UPLOAD_SUCCESS', 'CDN 업로드 성공', { response });
        debugLog('SCAN_CALL', 'classifyScan 호출 시작', { image_url: data.cdn_url });
        classifyScan({ image_url: data.cdn_url });
      } catch (cdnError) {
        debugLog('CDN_UPLOAD_ERROR', 'CDN 업로드 실패', cdnError);
      }
    },
    onError: (error) => {
      debugLog('UPLOAD_URL_ERROR', 'Presigned URL 요청 실패', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    },
  });

  // 🔍 DEBUG: upload 상태 추적
  useEffect(() => {
    debugLog('UPLOAD_STATE', 'upload mutation 상태', {
      isUploadPending,
      isUploadError,
      uploadError: uploadError?.message,
    });
  }, [isUploadPending, isUploadError, uploadError]);

  useEffect(() => {
    if (!imageFile) {
      debugLog('UPLOAD_SKIP', 'imageFile이 없음');
      return;
    }

    debugLog('UPLOAD_START', 'uploadImage mutation 호출', {
      channel: 'scan',
      filename: imageFile.name,
      content_type: imageFile.type,
    });

    uploadImage({
      channel: 'scan',
      fileMeta: {
        filename: imageFile.name,
        content_type: imageFile.type,
      },
    });
  }, [imageFile, uploadImage]);

  useEffect(() => {
    debugLog('NAVIGATE_CHECK', '네비게이션 조건 체크', {
      minTimeElapsed,
      isScanComplete,
      hasPipelineResult: !!scanData?.pipeline_result,
      scanDataKeys: scanData ? Object.keys(scanData) : [],
    });

    if (!minTimeElapsed || !isScanComplete) {
      debugLog('NAVIGATE_WAIT', '대기 중', { reason: !minTimeElapsed ? 'minTime 미경과' : 'scan 미완료' });
      return;
    }

    // API 완료 및 최소 대기 시간 경과 시 다음 페이지로 이동
    if (!scanData.pipeline_result) {
      debugLog('NAVIGATE_ERROR', 'pipeline_result 없음 → error 페이지로', { scanData });
      navigate('/camera/error', { replace: true });
      return;
    }
    debugLog('NAVIGATE_SUCCESS', 'answer 페이지로 이동', { category: scanData.pipeline_result?.classification_result?.classification?.major_category });
    navigate('/camera/answer', {
      state: {
        imageFile,
        data: scanData,
      },
      replace: true,
    });
  }, [minTimeElapsed, isScanComplete, scanData, navigate, imageFile]);

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
              isComplete={currentStep > index + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
