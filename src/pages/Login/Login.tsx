import EcoLogin from '@/assets/images/mainCharacter/main_5.png';
import Kakao from '@/assets/icons/icon_kakao.svg';
import Google from '@/assets/icons/icon_google.svg';
// import Naver from '@/assets/icons/icon_naver.svg';
import { Link } from 'react-router-dom';
import api from '@/api/axiosInstance';

const Login = () => {
  const handleSocialLogin = async (social: 'kakao' | 'google' | 'naver') => {
    try {
      const { data } = await api.get(`/api/v1/auth/${social}`, {
        headers: {
          'X-Frontend-Origin': window.location.origin,
        },
        params: {
          redirect_uri: `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/${social}/callback`,
        },
      });

      const authUrl = data?.data?.authorization_url;

      if (!authUrl) {
        console.error('로그인 URL을 받아오지 못했습니다.');
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      console.error(`[${social}] 로그인 중 오류 발생`, err);
    }
  };

  return (
    <div className='flex h-full w-full flex-col items-center justify-end px-6 text-center'>
      {/* 캐릭터 이미지 */}
      <img
        className='mb-[26px] h-[199px] w-[199px]'
        src={EcoLogin}
        alt='Eco Login'
      />

      {/* 설명 */}
      <span className='text-brand-primary pb-[7.5px] text-[30px] leading-9 font-extrabold tracking-[0.396px]'>
        이코에코
      </span>
      <span className='text-text-secondary mt-2 pb-2 text-[16px] leading-6 font-semibold tracking-[-0.312px]'>
        이코와 함께하는 에코 라이프
      </span>
      <span className='text-text-secondary mt-2 pb-21 text-[12px] leading-[22.75px] font-normal tracking-[-0.15px] whitespace-pre-line'>
        분리수거를 즐겁게!{'\n'}캐릭터를 모으며 환경을 배워요
      </span>
      <div className='flex flex-col gap-[14.55px]'>
        {/* 네이버 로그인 버튼 */}
        {/* <div
          onClick={() => handleSocialLogin('naver')}
          className='flex h-11 w-80 cursor-pointer flex-row items-center justify-center bg-[#06BE34]'
        >
          <img src={Naver} className='mx-3 h-5 w-5' />
          <div className='h-[33px] w-[1.4px] bg-black opacity-[0.1]' />
          <span className='w-full px-[73px] text-[12px] leading-[22.75px] font-normal tracking-[-0.15px] text-white'>
            네이버로 로그인
          </span>
        </div> */}
        {/* 구글 로그인 버튼 */}
        <div
          onClick={() => handleSocialLogin('google')}
          className='flex h-11 w-80 cursor-pointer flex-row items-center justify-center border-[2.5px] border-[#E5E5E5] bg-white'
        >
          <div className='flex h-[33px] w-[60px] items-center justify-center border-r-[1.4px] border-black/10'>
            <img src={Google} className='h-[23px] w-[23px]' />
          </div>
          <span className='w-full text-[12px] leading-[22.75px] font-medium tracking-[-0.15px] text-[#515151]'>
            구글로 로그인
          </span>
        </div>
        {/* 카카오 로그인 버튼 */}
        <div
          onClick={() => handleSocialLogin('kakao')}
          className='mb-[31px] flex h-11 w-80 cursor-pointer flex-row items-center justify-center border-[2.5px] border-[#F9E000] bg-[#F9E000]'
        >
          <div className='flex h-[33px] w-[60px] items-center justify-center border-r-[1.4px] border-black/10'>
            <img src={Kakao} className='h-5 w-5' />
          </div>
          <span className='w-full text-[12px] leading-[22.75px] font-medium tracking-[-0.15px] text-[#3C1E1E]'>
            카카오톡으로 로그인
          </span>
        </div>
      </div>

      {/* 약관 안내 */}
      <span className='text-text-secondary mt-2 pb-[53px] text-center text-[10px] leading-[18px] font-normal tracking-[-0.15px] whitespace-pre-line'>
        최초 로그인 시{' '}
        <Link
          to='/Login' // TODO: 기획 제공 시 반영
          className='decoration-text-secondary underline underline-offset-2'
        >
          이용약관
        </Link>
        과{' '}
        <Link
          to='/Login' // TODO: 기획 제공 시 반영
          className='decoration-text-secondary underline underline-offset-2'
        >
          개인정보 취급방침
        </Link>
        {'\n'}에 동의하는 것으로 간주됩니다.
      </span>
    </div>
  );
};

export default Login;
