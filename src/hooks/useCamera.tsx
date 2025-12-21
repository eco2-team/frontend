import { useEffect, useRef, useState, type RefObject } from 'react';

// ============================================================
// 🔍 iOS PWA 카메라 디버깅 로그
// 이 로그는 간헐적인 카메라 문제를 추적하기 위해 추가되었습니다.
// 문제 해결 후 제거해주세요.
// ============================================================

const DEBUG_PREFIX = '[📷 Camera Debug]';

/**
 * 환경 정보를 수집하여 로깅
 */
const logEnvironmentInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

  console.log(`${DEBUG_PREFIX} ========== 환경 정보 ==========`);
  console.log(`${DEBUG_PREFIX} User Agent: ${ua}`);
  console.log(`${DEBUG_PREFIX} iOS 기기: ${isIOS}`);
  console.log(`${DEBUG_PREFIX} PWA 모드: ${isPWA}`);
  console.log(`${DEBUG_PREFIX} Safari: ${isSafari}`);
  console.log(`${DEBUG_PREFIX} display-mode: ${window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}`);
  console.log(`${DEBUG_PREFIX} navigator.standalone: ${(window.navigator as unknown as { standalone?: boolean }).standalone}`);
  console.log(`${DEBUG_PREFIX} mediaDevices 존재: ${!!navigator.mediaDevices}`);
  console.log(`${DEBUG_PREFIX} getUserMedia 존재: ${!!navigator.mediaDevices?.getUserMedia}`);
  console.log(`${DEBUG_PREFIX} 현재 시각: ${new Date().toISOString()}`);
  console.log(`${DEBUG_PREFIX} ================================`);

  return { isIOS, isPWA, isSafari };
};

/**
 * 권한 상태 확인 (가능한 경우)
 */
const checkPermissionStatus = async () => {
  try {
    // iOS Safari에서는 permissions API가 제한적
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log(`${DEBUG_PREFIX} 카메라 권한 상태: ${result.state}`);
      return result.state;
    } else {
      console.log(`${DEBUG_PREFIX} Permissions API 미지원`);
      return 'unknown';
    }
  } catch (e) {
    console.log(`${DEBUG_PREFIX} 권한 확인 실패:`, e);
    return 'error';
  }
};

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
    const startTime = performance.now();
    console.log(`${DEBUG_PREFIX} ========== startCamera 호출 ==========`);

    // 환경 정보 로깅
    const { isIOS, isPWA } = logEnvironmentInfo();

    // 권한 상태 확인
    await checkPermissionStatus();

    // 기존 스트림 상태 확인
    console.log(`${DEBUG_PREFIX} 기존 스트림 수: ${allStreamsRef.current.length}`);
    console.log(`${DEBUG_PREFIX} streamRef 존재: ${!!streamRef.current}`);

    try {
      setPermissionDenied(false);

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // 후면 카메라 우선
        },
      };

      console.log(`${DEBUG_PREFIX} getUserMedia 호출 시작...`);
      console.log(`${DEBUG_PREFIX} Constraints:`, JSON.stringify(constraints));

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const elapsed = performance.now() - startTime;
      console.log(`${DEBUG_PREFIX} ✅ getUserMedia 성공 (${elapsed.toFixed(0)}ms)`);
      console.log(`${DEBUG_PREFIX} Stream ID: ${stream.id}`);
      console.log(`${DEBUG_PREFIX} Video Tracks: ${stream.getVideoTracks().length}`);

      stream.getVideoTracks().forEach((track, idx) => {
        console.log(`${DEBUG_PREFIX} Track[${idx}] - label: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        const settings = track.getSettings();
        console.log(`${DEBUG_PREFIX} Track[${idx}] settings:`, JSON.stringify(settings));
      });

      allStreamsRef.current.push(stream);

      const video = videoRef.current;

      if (video) {
        console.log(`${DEBUG_PREFIX} video 엘리먼트에 srcObject 할당`);
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          console.log(`${DEBUG_PREFIX} onloadedmetadata 이벤트 발생`);
          console.log(`${DEBUG_PREFIX} video 크기: ${video.videoWidth}x${video.videoHeight}`);
          try {
            await video.play();
            setIsVideoReady(true);
            const totalElapsed = performance.now() - startTime;
            console.log(`${DEBUG_PREFIX} ✅ 카메라 스트림 시작 완료 (총 ${totalElapsed.toFixed(0)}ms)`);
          } catch (err) {
            console.error(`${DEBUG_PREFIX} ❌ 비디오 재생 실패:`, err);
            if (err instanceof Error) {
              console.error(`${DEBUG_PREFIX} 에러 이름: ${err.name}`);
              console.error(`${DEBUG_PREFIX} 에러 메시지: ${err.message}`);
            }
          }
        };

        video.onerror = (e: Event | string) => {
          console.error(`${DEBUG_PREFIX} ❌ video 엘리먼트 에러:`, e);
        };
      } else {
        console.warn(`${DEBUG_PREFIX} ⚠️ videoRef.current가 null`);
      }

      streamRef.current = stream;
      return stream;
    } catch (err) {
      const elapsed = performance.now() - startTime;
      console.error(`${DEBUG_PREFIX} ❌ 카메라 오류 (${elapsed.toFixed(0)}ms 후):`, err);

      if (err instanceof Error) {
        console.error(`${DEBUG_PREFIX} 에러 타입: ${err.constructor.name}`);
        console.error(`${DEBUG_PREFIX} 에러 이름: ${err.name}`);
        console.error(`${DEBUG_PREFIX} 에러 메시지: ${err.message}`);

        // DOMException 상세 정보
        if (err instanceof DOMException) {
          console.error(`${DEBUG_PREFIX} DOMException code: ${err.code}`);
          // 에러 유형별 추가 정보
          switch (err.name) {
            case 'NotAllowedError':
              console.error(`${DEBUG_PREFIX} → 사용자가 권한을 거부했거나, 권한 요청이 차단됨`);
              console.error(`${DEBUG_PREFIX} → iOS PWA: ${isIOS && isPWA ? '⚠️ iOS PWA 환경에서 카메라 접근 제한일 수 있음' : '해당 없음'}`);
              break;
            case 'NotFoundError':
              console.error(`${DEBUG_PREFIX} → 카메라 장치를 찾을 수 없음`);
              break;
            case 'NotReadableError':
              console.error(`${DEBUG_PREFIX} → 하드웨어 에러 (다른 앱이 카메라 사용 중일 수 있음)`);
              break;
            case 'OverconstrainedError':
              console.error(`${DEBUG_PREFIX} → 요청한 제약조건을 만족하는 카메라 없음`);
              break;
            case 'AbortError':
              console.error(`${DEBUG_PREFIX} → 요청이 취소됨 (타이밍 이슈)`);
              break;
            case 'SecurityError':
              console.error(`${DEBUG_PREFIX} → 보안 정책에 의해 차단됨`);
              break;
          }
        }
      }

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
    console.log(`${DEBUG_PREFIX} ========== stopCamera 호출 ==========`);
    console.log(`${DEBUG_PREFIX} 정리할 스트림 수: ${allStreamsRef.current?.length || 0}`);

    if (!allStreamsRef.current) {
      console.log(`${DEBUG_PREFIX} allStreamsRef.current가 null, 종료`);
      return;
    }

    allStreamsRef.current.forEach((stream: MediaStream, idx: number) => {
      console.log(`${DEBUG_PREFIX} 스트림[${idx}] 정리 중... (ID: ${stream.id})`);
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        console.log(`${DEBUG_PREFIX}   Track 중지: ${track.kind}, readyState: ${track.readyState}`);
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
      console.log(`${DEBUG_PREFIX} video 엘리먼트 정리 완료`);
    }

    setIsVideoReady(false);
    console.log(`${DEBUG_PREFIX} stopCamera 완료`);
  };

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} ========== useEffect 마운트 ==========`);
    startCamera();

    const currentVideo = videoRef.current;
    const allStreams = allStreamsRef;

    return () => {
      console.log(`${DEBUG_PREFIX} ========== useEffect 언마운트 (cleanup) ==========`);
      console.log(`${DEBUG_PREFIX} 정리할 스트림 수: ${allStreams.current.length}`);

      allStreams.current.forEach((stream: MediaStream, idx: number) => {
        console.log(`${DEBUG_PREFIX} [cleanup] 스트림[${idx}] 정리 중...`);
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          console.log(`${DEBUG_PREFIX} [cleanup] Track 중지: ${track.kind}`);
          track.stop();
        });
      });

      allStreams.current = [];
      streamRef.current = null;

      if (currentVideo) {
        currentVideo.pause();
        currentVideo.srcObject = null;
        currentVideo.load();
        console.log(`${DEBUG_PREFIX} [cleanup] video 엘리먼트 정리 완료`);
      }

      setIsVideoReady(false);
      console.log(`${DEBUG_PREFIX} [cleanup] 완료`);
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
