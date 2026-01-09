const OWNED_CHARACTERS_KEY = 'owned_characters';

/**
 * 보유 캐릭터 목록 조회 (localStorage)
 */
export const getOwnedCharacters = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(OWNED_CHARACTERS_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * 보유 캐릭터 목록 저장 (서버 동기화 시 사용)
 */
export const setOwnedCharacters = (names: string[]) => {
  localStorage.setItem(OWNED_CHARACTERS_KEY, JSON.stringify(names));
};

/**
 * 캐릭터 추가 (Optimistic Update)
 */
export const addOwnedCharacter = (name: string) => {
  const list = getOwnedCharacters();
  if (!list.includes(name)) {
    list.push(name);
    setOwnedCharacters(list);
  }
};

/**
 * 캐시 클리어 (로그아웃 시)
 */
export const clearOwnedCharacters = () => {
  localStorage.removeItem(OWNED_CHARACTERS_KEY);
};

/**
 * 신규 캐릭터 여부 확인
 */
export const isNewCharacter = (name: string): boolean => {
  return !getOwnedCharacters().includes(name);
};

