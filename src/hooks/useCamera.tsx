import { useEffect, useRef, useState, type RefObject } from 'react';

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

  const startCamera = async (): Promise<MediaStream | null> => {
    try {
      setPermissionDenied(false);

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // 후면 카메라 우선
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      allStreamsRef.current.push(stream);

      const video = videoRef.current;

      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setIsVideoReady(true);
            console.log('✅ 카메라 스트림 시작');
          } catch (err) {
            console.error('비디오 재생 실패:', err);
          }
        };
      }

      streamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('카메라 오류: ', err);

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
