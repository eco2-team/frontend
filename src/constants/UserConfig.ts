export const ProfileLabels = {
  nickname: '닉네임',
  phone_number: '휴대폰 번호',
  login: '간편 로그인',
} as const;

export const USER_FIELD_MAP = {
  nickname: 'nickname',
  phone_number: 'phone_number',
  login: 'provider',
} as const;

export const CanEditKey = 'nickname';

export const STORAGE_USER_KEY = 'userInfo';
