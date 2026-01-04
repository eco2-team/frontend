import { STORAGE_USER_KEY } from '@/constants/UserConfig';
import type { UserInfoResponse } from '@/types/UserTypes';

export const getStorageUserInfo = (): UserInfoResponse | null => {
  const user = localStorage.getItem(STORAGE_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setStorageUserInfo = (user: UserInfoResponse) => {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
};

export const updateStorageNickname = (newNickname: string) => {
  const user = getStorageUserInfo();
  if (!user) return;

  user.nickname = newNickname;
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
};

export const clearStorageUserInfo = () => {
  localStorage.removeItem(STORAGE_USER_KEY);
};
