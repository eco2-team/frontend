import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  isVideoReady: boolean;
  permissionDenied: boolean;
  startCamera: () => Promise<MediaStream | null>;
  stopCamera: () => void;
}

/**
 * 카메라 스트림을 관리하는 커스텀 훅
 * @returns 카메라 제어 함수와 상태들
 */
export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const allStreamsRef = useRef<MediaStream[]>([]);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // videoRef가 준비될 때까지 대기하는 헬퍼 함수
  const waitForVideoRef = useCallback(async (maxRetries = 10): Promise<HTMLVideoElement | null> => {
    for (let i = 0; i < maxRetries; i++) {
      if (videoRef.current) {
        console.log(`✅ videoRef 준비됨 (시도 ${i + 1}/${maxRetries})`);
        return videoRef.current;
      }
      console.log(`⏳ videoRef 대기 중... (시도 ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.error('❌ videoRef를 찾을 수 없음');
    return null;
  }, []);

  const startCamera = async (): Promise<MediaStream | null> => {
    try {
      setPermissionDenied(false);
      console.log('🎬 카메라 시작 시도...');

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // 후면 카메라 우선
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ getUserMedia 성공, 스트림 획득');
      allStreamsRef.current.push(stream);

      // videoRef가 준비될 때까지 대기
      const video = await waitForVideoRef();

      if (video) {
        video.srcObject = stream;
        console.log('✅ video.srcObject 설정 완료');
        
        // 여러 이벤트 리스너 등록 (iOS 호환성)
        const handleReady = () => {
          if (!isVideoReady) {
            setIsVideoReady(true);
            console.log('✅ 카메라 스트림 시작 (비디오 준비됨)');
          }
        };

        video.onloadedmetadata = handleReady;
        video.oncanplay = handleReady;
        video.onplaying = handleReady;
        
        // 이미 준비된 경우 (캐시된 스트림 등)
        if (video.readyState >= 2) {
          console.log('✅ video.readyState 이미 준비됨:', video.readyState);
          handleReady();
        }
      } else {
        console.error('❌ video 엘리먼트를 찾을 수 없음, 스트림만 저장');
      }

      streamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('❌ 카메라 오류: ', err);

      if (
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      ) {
        setPermissionDenied(true);
      }

      return null;
    }
  };

  const stopCamera = () => {
    if (!allStreamsRef.current) return;

    allStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    });

    allStreamsRef.current = [];
    streamRef.current = null;

    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;
      video.load();
    }

    setIsVideoReady(false);
  };

  useEffect(() => {
    startCamera();

    const currentVideo = videoRef.current;
    const allStreams = allStreamsRef;

    return () => {
      allStreams.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });

      allStreams.current = [];
      streamRef.current = null;

      if (currentVideo) {
        currentVideo.pause();
        currentVideo.srcObject = null;
        currentVideo.load();
      }

      setIsVideoReady(false);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    containerRef,
    isVideoReady,
    permissionDenied,
    startCamera,
    stopCamera,
  };
};
