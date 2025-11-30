import { type RefObject } from 'react';

interface UseCameraCaptureProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  isVideoReady: boolean;
}

/**
 * 카메라 캡처 로직을 처리하는 커스텀 훅
 */
export const useCameraCapture = ({
  videoRef,
  canvasRef,
  containerRef,
  isVideoReady,
}: UseCameraCaptureProps) => {
  const captureImage = (): File | null => {
    if (!isVideoReady) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!video || !canvas || !container) return null;

    const { width: containerWidth, height: containerHeight } =
      container.getBoundingClientRect();
    const { videoWidth, videoHeight } = video;

    // object-fit: cover 영역 계산
    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerWidth / containerHeight;

    // 화면에 실제로 보이는 영역만 캡처
    const scale =
      videoAspect > containerAspect
        ? videoHeight / containerHeight // 좌우가 잘림
        : videoWidth / containerWidth; // 상하가 잘림

    const sourceWidth = containerWidth * scale;
    const sourceHeight = containerHeight * scale;
    const sourceX = (videoWidth - sourceWidth) / 2;
    const sourceY = (videoHeight - sourceHeight) / 2;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      containerWidth,
      containerHeight,
    );

    const imageUrl = canvas.toDataURL('image/png');

    const arr = imageUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    console.log('📸 이미지 캡처 완료');
    return new File([u8arr], `image_${Date.now()}.png`, { type: mime });
  };

  return { captureImage };
};
