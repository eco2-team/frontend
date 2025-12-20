#!/bin/bash
set -e

# 현재 브랜치명 가져오기
BRANCH_NAME=$(git symbolic-ref --short HEAD)

# 브랜치명 규칙: (prefix)/(기능설명)/(이름)
# prefix: feat, fix, refactor, style, chore
# 기능설명: 소문자, 숫자, -, _
# 이름: suji_chae 또는 chaehyun_kim
if [[ ! $BRANCH_NAME =~ ^(feat|fix|refactor|style|chore)\/[A-Za-z0-9._-]+\/(suji_chae|chaehyun_kim)$ ]]; then
  echo "❌ [브랜치 이름 규칙 위반]"
  echo "브랜치명 형식:"
  echo "  prefix/기능설명/이름"
  echo ""
  echo "허용된 prefix:"
  echo "  feat/     → 새로운 기능 개발"
  echo "  fix/      → 버그 수정"
  echo "  refactor/ → 리팩토링"
  echo "  style/    → 스타일, 포맷 변경"
  echo "  chore/    → 기타 변경사항"
  echo ""
  echo ""
  exit 1
fi

echo "✅ [브랜치 이름 규칙 통과] ($BRANCH_NAME)"
