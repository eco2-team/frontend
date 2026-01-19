/**
 * 마크다운 문법 제거 유틸
 * - 채팅 제목, 미리보기 등에서 사용
 */

/**
 * 마크다운 문법을 제거하여 순수 텍스트로 변환
 * - [text](url) → text (링크)
 * - ![alt](url) → '' (이미지 제거)
 * - **text** → text (볼드)
 * - *text* → text (이탤릭)
 * - `code` → code (인라인 코드)
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';

  return (
    text
      // 이미지 링크 제거: ![alt](url) → ''
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // [None](url) 패턴 제거 (이미지 생성 결과)
      .replace(/\[None\]\([^)]+\)/g, '')
      // 일반 링크: [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 볼드: **text** → text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // 이탤릭: *text* → text
      .replace(/\*([^*]+)\*/g, '$1')
      // 인라인 코드: `code` → code
      .replace(/`([^`]+)`/g, '$1')
      // 연속 공백 정리
      .replace(/\s+/g, ' ')
      .trim()
  );
};
