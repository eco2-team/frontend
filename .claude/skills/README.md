# Claude Code Skills for EcoEco Frontend

> AI 에이전트가 이코에코 프론트엔드 코드베이스를 유지보수하고 개선할 때 참조하는 Skills 모음

## 📚 Skills 개요

6개의 전문 스킬로 구성된 계층 구조:

```
.claude/skills/
├── agent-feature/              # Agent 페이지 구현
├── data-integrity/             # 데이터 무결성 관리
├── troubleshooting/            # 문제 해결 가이드
├── code-quality/               # 코드 품질 관리
├── vercel-react-best-practices/ # Vercel 공식 성능 최적화
└── webapp-testing/             # 웹앱 테스트 (기존)
```

## 1. Agent Feature Skill

**경로**: `agent-feature/`
**설명**: Agent 페이지 구현 스킬 (SSE 스트리밍, 사이드바, 마크다운 렌더링)

**사용 시기**:
- Agent 채팅 UI 구현
- SSE 토큰 스트리밍
- 이미지/위치 정보 통합

**주요 References**:
- `frontend-stack.md`: 기술 스택, 컨벤션
- `api-spec.md`: API 엔드포인트, SSE 형식
- `component-design.md`: 컴포넌트 설계
- `existing-code-reference.md`: 재사용 가능한 코드

## 2. Data Integrity Skill

**경로**: `data-integrity/`
**설명**: 데이터 무결성과 일관성 관리 (IndexedDB v3, Optimistic Updates)

**사용 시기**:
- IndexedDB 스키마 설계
- Optimistic Update 구현
- Eventual Consistency 패턴

**주요 References**:
- `indexeddb-schema.md`: v3 스키마, 계층 구조, ID 매핑
- `message-ordering.md`: created_at 기반 순서 보장
- `optimistic-updates.md`: 상태 전이, Reconcile 로직

**핵심 개념**:
- 3계층 아키텍처: React State → IndexedDB → Backend DB
- User isolation: user_id + session_id
- 30초 retention window
- 7일 TTL cleanup

## 3. Troubleshooting Skill

**경로**: `troubleshooting/`
**설명**: 실전 문제 해결 가이드 (빌드 에러, 이미지 업로드, SSE 연결)

**사용 시기**:
- TypeScript 컴파일 에러
- ESLint 규칙 위반
- Vercel 배포 실패
- 이미지 업로드 400 에러
- SSE 타임아웃/중복 수신

**주요 References**:
- `build-errors.md`: TypeScript/ESLint/Vercel 에러 패턴
- `image-upload-fix.md`: 이미지 업로드 진단 및 해결

**일반적인 패턴**:
- Race condition 방지 (ref flag)
- Memory leak 방지 (cleanup 함수)
- 에러 로깅 (context 포함)

## 4. Code Quality Skill

**경로**: `code-quality/`
**설명**: 코드 품질 관리 (Prettier, ESLint, TypeScript, Agent Skills)

**사용 시기**:
- 코드 컨벤션 확인
- 품질 메트릭 검증
- Agent Skills 활용 패턴

**주요 References**:
- `conventions.md`: 전체 품질 검증 리포트 (12개 섹션)
- `agent-skills.md`: Vercel AI SDK 활용 패턴

**필수 검증**:
- Prettier 100% 통과
- ESLint 0 에러, 0 경고
- TypeScript 빌드 성공
- Git 규칙 준수

## 5. Vercel React Best Practices Skill

**경로**: `vercel-react-best-practices/`
**설명**: Vercel 공식 React 성능 최적화 (AI 에이전트용, 40+ 규칙)

**출처**: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
**버전**: 1.0.0 (2026년 1월)

**사용 시기**:
- Waterfall 제거 필요
- 번들 크기 초과
- 서버/클라이언트 성능 최적화

**주요 References**:
- `react-performance.md`: Vercel 공식 40+ 규칙 전문

**우선순위 구조**:
```
CRITICAL
├─ Waterfalls 제거 (5 규칙) ← #1 성능 킬러
└─ 번들 크기 최적화 (5 규칙)

HIGH
└─ 서버 사이드 성능 (7 규칙)

MEDIUM-HIGH
└─ 클라이언트 데이터 페칭 (4 규칙)

MEDIUM
├─ 리렌더 최적화 (7 규칙)
└─ 렌더링 성능 (7 규칙)

LOW-MEDIUM
└─ JavaScript 성능 (12 규칙)

LOW
└─ 고급 패턴 (2 규칙)
```

**핵심 규칙**:
- Defer await until needed
- Better-all (dependency-based parallelization)
- Avoid barrel file imports
- React.cache() for deduplication
- Dynamic imports for heavy components

## 6. Webapp Testing Skill

**경로**: `webapp-testing/`
**설명**: 웹앱 테스트 스킬 (기존)

**사용 시기**: 테스트 시나리오 작성

## 🎯 Skills 사용 흐름

### 새 기능 구현 시

```
1. agent-feature/SKILL.md
   ├─ 컴포넌트 설계 확인
   └─ API 스펙 확인

2. code-quality/SKILL.md
   ├─ 컨벤션 준수
   └─ Import 순서

3. vercel-react-best-practices/SKILL.md
   ├─ Waterfall 제거
   └─ 번들 크기 확인

4. data-integrity/SKILL.md (필요 시)
   ├─ IndexedDB 저장
   └─ Optimistic Update
```

### 문제 해결 시

```
1. troubleshooting/SKILL.md
   ├─ 증상별 의사결정 트리
   └─ 해결 방법 참조

2. troubleshooting/references/
   ├─ build-errors.md (빌드 실패)
   └─ image-upload-fix.md (이미지 에러)
```

### 코드 리뷰 시

```
1. code-quality/SKILL.md
   ├─ Prettier/ESLint 검증
   └─ TypeScript 컴파일

2. code-quality/references/conventions.md
   ├─ 전체 체크리스트
   └─ 품질 메트릭
```

## 📖 References 구조

각 skill은 SKILL.md + references/ 계층 구조:

```
{skill-name}/
├── SKILL.md              # 개요, 의사결정 트리, 핵심 패턴
└── references/
    ├── {reference-1}.md  # 상세 가이드/리포트
    └── {reference-2}.md
```

**SKILL.md**: 빠른 참조용 (개요, 의사결정 트리, 핵심 패턴)
**references/**: 상세 문서 (전체 리포트, 검증 결과, 코드 예제)

## 🔄 Skills 업데이트

### Agent Feature
- Frontend 컨벤션 변경 시
- API 스펙 변경 시

### Data Integrity
- IndexedDB 스키마 변경 시
- Reconcile 정책 변경 시

### Troubleshooting
- 새로운 에러 패턴 발견 시
- 해결 방법 추가 시

### Code Quality
- 컨벤션 변경 시
- ESLint 규칙 추가 시

### Vercel React Best Practices
- Vercel agent-skills 저장소 업데이트 시
- 새 버전 릴리즈 시 (Watch GitHub releases)

## 🤝 기여 방법

1. **새 Skill 추가**:
   ```bash
   mkdir -p .claude/skills/{skill-name}/references
   touch .claude/skills/{skill-name}/SKILL.md
   ```

2. **Reference 추가**:
   ```bash
   touch .claude/skills/{skill-name}/references/{reference-name}.md
   ```

3. **Skill 업데이트**:
   - SKILL.md의 의사결정 트리 갱신
   - References 링크 추가
   - README.md 업데이트

## 📚 외부 리소스

### Vercel
- [Vercel Blog - React Best Practices](https://vercel.com/blog/introducing-react-best-practices)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- [Better-all Library](https://github.com/shuding/better-all)

### Backend
- Event Router 리포트: `/Users/mango/workspace/SeSACTHON/backend-event-router-improvement/docs/reports/`

## 📝 버전

**Frontend Skills**: v2.0.0 (2026-01-23)
- docs/reports/ → .claude/skills/ 마이그레이션
- Vercel React Best Practices 통합
- 계층 구조 도입 (SKILL.md + references/)

**이전 버전**: v1.0.0
- docs/reports/ 기반 리포트
- agent-feature, webapp-testing 스킬

## 🔍 빠른 참조

| 문제 | 참조 Skill | 섹션 |
|------|-----------|------|
| 빌드 에러 | troubleshooting | build-errors.md |
| 이미지 업로드 실패 | troubleshooting | image-upload-fix.md |
| IndexedDB 설계 | data-integrity | indexeddb-schema.md |
| 메시지 순서 | data-integrity | message-ordering.md |
| Waterfall 제거 | vercel-react-best-practices | §1 |
| 번들 크기 | vercel-react-best-practices | §2 |
| 컨벤션 검증 | code-quality | conventions.md |
| Agent UI 구현 | agent-feature | component-design.md |

---

**유지보수**: Claude Code Agent
**최종 업데이트**: 2026-01-23
**프로젝트**: 이코에코 Frontend
