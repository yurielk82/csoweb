---
name: csoweb-domain
description: csoweb DDD 도메인 패턴 가이드. 정산(settlement), 회사(company), 사용자(user), CSO매칭 등 도메인 코드 작성 시 사용. 새 엔티티, 유스케이스, 리포지토리 추가 시 자동 적용.
---

# csoweb 도메인 패턴

## 트리거

- 새 도메인 엔티티/값 객체 추가
- 새 유스케이스 작성
- 리포지토리 구현
- 비즈니스 규칙 변경

## 워크플로우

### 1단계: 기존 패턴 스캔
```
1. 대상 도메인 디렉토리 확인: src/domain/{도메인명}/
2. 기존 유스케이스 패턴 확인: src/application/{도메인명}/
3. 기존 리포지토리 구현 확인: src/infrastructure/supabase/
```

### 2단계: 패턴 준수 구현
`references/ddd-patterns.md` 읽고 아래 규칙에 따라 구현.

### 3단계: 검증
- domain 코드에 `@supabase`, `import ... from 'infrastructure'` 없는지 확인
- 유스케이스가 리포지토리 인터페이스만 참조하는지 확인
- 테스트 파일이 유스케이스와 같은 디렉토리에 있는지 확인

## 안티패턴

- domain에서 Supabase 클라이언트 직접 import 금지
- application에서 `@supabase/supabase-js` import 금지
- 유스케이스 안에 UI 로직(toast, redirect) 삽입 금지
- 리포지토리 인터페이스에 Supabase 특정 타입 사용 금지
