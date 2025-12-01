import type { CHARACTER_DATA } from '@/constants/CharacterInfo';

export type CharacterType = 'main' | 'sub';

export type CharacterItem = {
  characterType: CharacterType;
  wasteName: string;
  middle_category: string; // API response
  characterName: string;
  wasteImage: string;
  characterImage: string;
  description: string;
  subDescription: string;
};

export type CharacterDataMap = Record<string, CharacterItem>;

type CharacterDataType = typeof CHARACTER_DATA;

/** "paper" | "paperProduct" | "pet" | ... | "sofa" */
export type CharacterKey = keyof CharacterDataType;

/** "페이피" | 팩토리" | " 페티" | ... | "푸키" */
export type CharacterNames =
  CharacterDataType[keyof CharacterDataType]['characterName'];
