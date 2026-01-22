---
name: code-quality
description: 코드 품질 관리 스킬. Prettier/ESLint/TypeScript 컨벤션, Agent Skills 활용 패턴, 코드 리뷰 체크리스트.
---

# Code Quality Management Skill

> 일관된 코드 스타일과 높은 품질을 유지하는 가이드

## 1. 개요

이코에코 프론트엔드 프로젝트의 코드 품질 기준과 검증 방법을 정의합니다:
- **Prettier**: 자동 포맷팅
- **ESLint**: 코드 린팅
- **TypeScript**: 타입 안전성
- **Agent Skills**: Vercel AI SDK 활용 패턴

## 2. 품질 기준

### 2.1 컨벤션 준수

| 항목 | 기준 | 검증 방법 |
|------|------|----------|
| Prettier | 100% 통과 | `npx prettier --check` |
| ESLint | 0 에러, 0 경고 | `npx eslint` |
| TypeScript | 빌드 성공 | `npm run build` |
| Git | 브랜치/커밋 규칙 | Pre-commit hook |

### 2.2 코드 메트릭

| 메트릭 | 목표 | 평가 |
|--------|------|------|
| Cyclomatic Complexity | <15 | 양호 |
| Function Length | <50 lines | 권장 |
| JSDoc Coverage | >80% | 권장 |
| Test Coverage | >70% | 목표 |

## 3. 의사결정 트리

```
코드 품질 검증
    │
    ├─ Prettier 검증?
    │   └─ npx prettier --check src/**/*.ts
    │
    ├─ ESLint 검증?
    │   └─ npx eslint src/**/*.ts
    │
    ├─ TypeScript 검증?
    │   └─ npm run build
    │
    ├─ Agent Skills 활용?
    │   └─ references/agent-skills.md 참조
    │
    └─ 전체 검증 리포트?
        └─ references/conventions.md 참조
```

## 4. 핵심 컨벤션

### 4.1 Prettier 설정

```javascript
// .prettierrc
{
  semi: true,              // 세미콜론 필수
  singleQuote: true,       // 싱글 쿼트
  trailingComma: 'all',    // 후행 쉼표
  tabWidth: 2,             // 탭 너비 2
  printWidth: 80,          // 라인 길이 80
  jsxSingleQuote: true     // JSX 싱글 쿼트
}
```

**자동 수정**:
```bash
npx prettier --write src/**/*.ts
```

### 4.2 ESLint 규칙

**주요 규칙**:
- `@typescript-eslint/no-this-alias`: 화살표 함수 사용
- `@typescript-eslint/no-unused-vars`: _ prefix로 표시
- `@typescript-eslint/no-explicit-any`: 최소화 (레거시 제외)

**수정 패턴**:
```typescript
// ❌ no-this-alias 위반
const self = this;
function callback() {
  self.method();
}

// ✅ 화살표 함수
const callback = () => {
  this.method();
};
```

### 4.3 TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**필수 사항**:
- 모든 함수 파라미터 타입 명시
- 명시적 반환 타입 (복잡한 함수)
- 미사용 변수 제거 또는 _ prefix

### 4.4 Import 순서

```typescript
// 1. React & 외부 라이브러리
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 내부 컴포넌트
import { AgentSidebar } from '@/components/agent';

// 3. 훅
import { useAgentSSE } from '@/hooks/agent/useAgentSSE';

// 4. 서비스 & 타입
import { AgentService } from '@/api/services/agent';
import type { ChatSummary } from '@/api/services/agent';

// 5. 상수 & 유틸
import { AGENT_CONFIG } from '@/constants/AgentConfig';
```

### 4.5 파일 네이밍

| 유형 | 컨벤션 | 예시 |
|------|--------|------|
| 컴포넌트 | PascalCase | `AgentContainer.tsx` |
| 훅 | camelCase + use | `useAgentSSE.ts` |
| 타입 | PascalCase | `AgentTypes.ts` |
| 서비스 | kebab-case + .service | `agent.service.ts` |
| 유틸 | camelCase | `messageUtils.ts` |

## 5. Agent Skills 활용

### 5.1 Vercel AI SDK 패턴

**권장 패턴**: `references/agent-skills.md` 참조

```typescript
// 1. Tool 정의
const tools = {
  weather: {
    description: 'Get weather information',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      // ...
    },
  },
};

// 2. Agent 실행
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools,
  system: 'You are a helpful assistant.',
  messages,
});

// 3. SSE 스트리밍
for await (const chunk of result.textStream) {
  setStreamingText(prev => prev + chunk);
}
```

### 5.2 Error Boundaries

```typescript
// ErrorBoundary.tsx
class AgentErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AgentError]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <AgentErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 5.3 React 19 Patterns

**useOptimistic**:
```typescript
const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  messages,
  (state, newMessage) => [...state, newMessage]
);

// Optimistic update
addOptimisticMessage(userMessage);
await sendMessage(userMessage);
```

## 6. 코드 리뷰 체크리스트

### 6.1 필수 확인

```
[ ] Prettier 포맷팅 통과
[ ] ESLint 0 에러, 0 경고
[ ] TypeScript 빌드 성공
[ ] 파일 네이밍 규칙 준수
[ ] Import 순서 준수
```

### 6.2 권장 확인

```
[ ] JSDoc 주석 작성 (public API)
[ ] 복잡한 로직 인라인 주석
[ ] 에러 핸들링 구현
[ ] Memory leak 방지 (cleanup)
[ ] Race condition 방지
```

### 6.3 선택 확인

```
[ ] 단위 테스트 작성
[ ] E2E 테스트 시나리오
[ ] 성능 최적화 (useMemo, useCallback)
[ ] 접근성 (ARIA labels)
```

## 7. Git 규칙

### 7.1 브랜치 네이밍

```
{prefix}/{기능설명}/{이름}

허용된 prefix:
- feat/    새로운 기능
- fix/     버그 수정
- refactor/ 리팩토링
- style/   스타일/포맷
- chore/   기타 변경
```

### 7.2 커밋 메시지

```
{type}[(scope)]: {subject}

예시:
feat(agent): IndexedDB v3 스키마 계층화
fix: TypeScript 빌드 에러 수정
docs: Chat ID 검증 리포트 추가
style: Prettier 포맷팅 적용
```

## 8. 자동화

### 8.1 Pre-commit Hook

```bash
# .husky/pre-commit
npx prettier --write --staged
npx eslint --fix --staged
```

### 8.2 CI/CD (Vercel)

```yaml
# 자동 검증
- TypeScript 컴파일
- ESLint
- Build 성공 여부

# 실패 시 배포 차단
```

## 9. 참조 문서

| 파일 | 내용 |
|------|------|
| `references/conventions.md` | 전체 품질 검증 리포트 |
| `references/agent-skills.md` | Vercel AI SDK 활용 패턴 |

## 10. 체크리스트

코드 제출 전:

```bash
# 1. 포맷팅
npx prettier --write src/**/*.ts

# 2. 린팅
npx eslint src/**/*.ts --fix

# 3. 빌드
npm run build

# 4. Git
git add -A
git commit -m "feat: 기능 추가"

# 5. Push
git push
```

## 11. 예외 처리

### 11.1 레거시 코드

**as any 사용 허용**:
```typescript
// v1 마이그레이션 (레거시 인덱스)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(msgStore as any).createIndex('legacy-index', 'old_field');
```

### 11.2 외부 라이브러리

**타입 선언 누락 시**:
```typescript
// @ts-ignore
import UnknownLibrary from 'unknown-library';
```

### 11.3 성능 최적화

**의도적 any 사용**:
```typescript
// 성능 critical 경로에서 타입 체크 생략
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fastPath = (data: any) => {
  // ...
};
```

## 12. 트러블슈팅

빌드/린팅 문제 시:
- `../troubleshooting/references/build-errors.md` 참조
- ESLint 규칙별 해결 방법 확인
- TypeScript 컴파일 에러 패턴 매칭
