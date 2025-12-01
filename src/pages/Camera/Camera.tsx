import { useNavigate } from 'react-router-dom';
import CameraButton from '@/assets/icons/camera_button.svg';
import CameraContainer from '@/assets/images/camera/camera_container.png';
import { CameraPermissionDialog } from '@/components/camera/CameraPermissionDialog';
import { useCamera } from '@/hooks/useCamera';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import CancelIcon from '@/assets/icons/iconoir_cancel_white.svg';

const Camera = () => {
  const navigate = useNavigate();

  const {
    videoRef,
    canvasRef,
    containerRef,
    isVideoReady,
    permissionDenied,
    startCamera,
    stopCamera,
  } = useCamera();

  const { captureImage } = useCameraCapture({
    videoRef,
    canvasRef,
    containerRef,
    isVideoReady,
  });

  const handleCapture = async () => {
    const imageFile = await captureImage();
    if (!imageFile) return;

    console.log('📤 서버 전송 예정:', imageFile);
    stopCamera();
    navigate('/camera/loading', {
      state: { imageFile },
    });
  };

  const handleRetry = () => {
    startCamera();
  };

  return (
    <div className='h-full w-full bg-[#1A1A2E]'>
      {permissionDenied && (
        <CameraPermissionDialog
          isOpen={permissionDenied}
          onClose={() => {
            stopCamera();
            navigate(-1);
          }}
          onConfirm={handleRetry}
        />
      )}

      <div ref={containerRef} className='relative h-full overflow-hidden'>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className='h-full w-full object-cover'
        />

        <img
          src={CancelIcon}
          alt='cancel'
          className='absolute top-[calc(var(--safe-area-top)+22px)] right-7.5 h-7.5 w-7.5 cursor-pointer'
          onClick={() => navigate(-1)}
        />

        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center'>
          <img
            src={CameraContainer}
            alt='camera_container'
            className='mx-auto h-[268px] w-[268px] object-contain'
          />
          <div className='mt-10 flex h-16 w-80 items-center justify-center bg-black/30'>
            <p className='text-sm leading-7 font-bold text-white'>
              사물이 잘 보이게 찍어주세요.
              <br />
              어떻게 분리배출해야 하는지 바로 알려드릴게요!
            </p>
          </div>
        </div>

        <div
          role='button'
          onClick={handleCapture}
          className='absolute bottom-20 left-1/2 -translate-x-1/2 cursor-pointer'
        >
          <img src={CameraButton} alt='camera_button' className='h-20 w-20' />
        </div>

        <canvas ref={canvasRef} className='hidden' />
      </div>
    </div>
  );
};

export default Camera;
