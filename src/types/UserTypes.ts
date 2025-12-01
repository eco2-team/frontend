import type { CanEditKey, ProfileLabels } from '@/constants/UserConfig';

export type ProfileLabelType = keyof typeof ProfileLabels;

export type UserType = {
  label: ProfileLabelType;
  value: string;
};

export type CanEditKeyType = typeof CanEditKey;

export type UserInfoResponse = {
  nickname: string;
  username: string;
  phone_number: string | null;
  provider: string;
};
