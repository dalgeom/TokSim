# Compound Engineering: Phase 1 바이럴 엔진

Generated: 2026-05-19
Branch: main (commit 417fd10)
Scope: 네온 다크 테마, 결과 이미지 카드, 그룹채팅, 테스트 인프라

---

## 1. Problem Types Encountered (15건)

| # | Category | Problem | Detected By |
|---|----------|---------|------------|
| 1 | data-flow | 날짜 헤더 없는 드래그 복사 파싱 실패 | 수동 테스트 (Day 1) |
| 2 | data-flow | bare 날짜 라인 정규식 미인식 | 수동 테스트 (Day 1) |
| 3 | data-flow | 미디어 메시지 변형 포맷 미감지 | 수동 테스트 (Day 1) |
| 4 | data-flow | totalDays off-by-one (같은 날 = 2일) | 수동 테스트 (Day 2) |
| 5 | architecture | Cloudflare Pages에서 static env import 불안정 | 배포 후 (Day 3) |
| 6 | architecture | Gemini 단일 모델 503 → 서비스 전체 먹통 | 프로덕션 (Day 3) |
| 7 | security | 디버그 에러 메시지 프로덕션 노출 | 코드 리뷰 (Day 4) |
| 8 | data-flow | fallback "오늘 날짜" → -721일 버그 | 사용자 보고 (Day 4) |
| 9 | architecture | PWA Web Share Target → iOS 미지원 | 실기기 테스트 (Day 4) |
| 10 | data-flow | sessionStorage 전체 ChatData → 5MB 한계 | Spec 리뷰 |
| 11 | ui/ux | 모바일 카카오톡 한 번에 한 메시지만 복사 | 실기기 확인 |
| 12 | architecture | AI 프롬프트 1:1 전용 → 그룹 부적합 | Spec 리뷰 |
| 13 | performance | Gemini 무한 대기 (타임아웃 미설정) | Spec 리뷰 |
| 14 | data-flow | kakao.ts:60 day-1 버그 (Date day는 1-based) | Eng 리뷰 |
| 15 | performance | html2canvas scale(0.25) DOM 캡처 깨짐 | 6-Reviewer 앙상블 |

**패턴:** 15건 중 7건(47%)이 data-flow. 대부분 실제 데이터로 테스트할 때 발견. Spec/Eng 리뷰에서 사전 발견된 것은 4건.

---

## 2. What Worked

| # | Technique | Evidence |
|---|-----------|----------|
| 1 | 프론트엔드 통계 + AI는 해석만 | Gemini 250건/일 쿼터 보호. statistics.ts 247줄 |
| 2 | 메시지 샘플링 (최근 20 + 랜덤 30) | ~2,000 토큰 입력. sampler.ts |
| 3 | 3-모델 폴백 체인 | 503 장애 우회 성공. +server.ts |
| 4 | sessionStorage 경량화 (stats+samples만) | ~50KB vs 수 MB. +page.svelte |
| 5 | PC/모바일 정규식 분리 | 간섭 없는 독립 매칭. kakao.ts |
| 6 | 멀티라인 이어붙이기 | 매칭 실패 줄 → 이전 메시지에 합침 |
| 7 | html2canvas 스케일 복원 트릭 | 캡처 전 원본 크기 복원 → 캡처 → 축소 복원 |
| 8 | duo/group 자동 감지 (참여자 3명+) | 사용자 선택 UI 불필요 |
| 9 | CSS 변수 기반 테마 시스템 | 전체 사이트 일관성. app.css 13개 변수 |

## 3. What Failed / Required Iteration

| # | Approach | Root Cause | Resolution |
|---|----------|-----------|------------|
| 1 | PWA + Web Share Target | iOS 미지원 (3커밋 낭비) | 전면 제거 |
| 2 | `$env/static/private` | Cloudflare Pages 런타임 주입 | `$env/dynamic/private` + platform.env |
| 3 | 디버그 에러 노출 | 수정 후 되돌리기 잊음 | 사용자 친화 메시지 상수화 |
| 4 | "오늘" fallback 날짜 | 실제 데이터 범위와 충돌 | pre-scan으로 첫 헤더 찾기 |
| 5 | Math.ceil 기반 totalDays | 시간차가 0.x일 → ceil=1 → +1=2 | 자정 기준 정규화 + Math.round |

---

## 4. Prevention Strategies

| Problem Class | Root Cause Pattern | Prevention | Automatable? |
|--------------|-------------------|------------|-------------|
| 날짜 off-by-one | JS Date 암묵적 보정 | 입출력 일치 assert | Yes: parameterized 경계값 테스트 |
| fallback 충돌 | 편의적 fallback이 도메인 무시 | "미정" 상태 또는 pre-scan | Yes: invariant 체크 (startDate <= endDate) |
| DOM 캡처 불일치 | CSS transform이 캡처에 영향 | offscreen 원본 크기 렌더 | Partial: E2E 해상도 assert |
| 비동기 상태 누락 | goto 후 컴포넌트 파괴 | 모든 exit path에서 명시적 reset | Yes: custom lint rule |
| 입력 크기 폭주 | 크기 가드 누락 | 모든 입력 경로에 크기 제한 | Yes: 단위 테스트 |
| 외부 API 단일 장애점 | 단일 모델 의존 | 폴백 체인 + timeout + graceful degradation | Yes: mock integration 테스트 |
| 디버그 코드 노출 | 수정 후 되돌리기 잊음 | 에러 메시지 상수/enum 강제 | Yes: 응답 body 검증 테스트 |
| 정규식 포맷 불일치 | 카카오톡 버전별 차이 | fixture 파일 축적 + regression | Yes: fixture 기반 테스트 |
| 직렬화 한계 | Date → string 자동 변환 | 직렬화/역직렬화 헬퍼 | Yes: round-trip 테스트 |
| 플랫폼 API 미지원 | 구현 후 발견 | caniuse 사전 조사 체크리스트 | Partial: caniuse API CI |

**3대 근본 원인:**
1. 암묵적 변환에 의존 (Date, JSON)
2. fallback 값의 도메인 무시
3. 비동기 흐름의 비정상 경로 미열거

---

## 5. Tags & Classification

### Tech Stack
`sveltekit-2`, `svelte-5-runes`, `cloudflare-pages`, `gemini-flash`, `html2canvas`, `vitest`, `typescript`

### Problem Domains
`chat-parsing`, `korean-nlp`, `ai-prompt-engineering`, `image-generation`, `viral-sharing`, `rate-limiting`, `neon-dark-theme`

### Solution Patterns
`model-fallback-chain`, `pre-scan-then-parse`, `sampling-for-cost`, `session-storage-lightweight`, `dual-env-fallback`, `scale-restore-capture`, `auto-mode-detection`, `css-variable-theming`

### Reusable Components
- `kakao.ts` — 카카오톡 PC/모바일 파서 (fixture 기반 테스트 포함)
- `statistics.ts` — 채팅 통계 분석기 (duo/group 모드)
- `sampler.ts` — 비용 최적화 메시지 샘플러
- `+server.ts` — Gemini 폴백 체인 + 타임아웃 패턴
- `DownloadButton.svelte` — html2canvas 스케일 복원 캡처
- `CardCarousel.svelte` — 스크롤 스냅 + 도트 인디케이터

### Anti-Patterns
- `today-fallback` — "모르면 오늘" fallback은 시간 역전 버그의 원인
- `single-model-dependency` — 무료 티어 API는 반드시 폴백 체인
- `pwa-for-cross-platform` — iOS Web Share Target 미지원 확인 안 하고 구현
- `debug-error-in-prod` — 디버그용 에러 노출 후 되돌리기 잊음
- `static-env-on-edge` — Cloudflare Pages는 런타임 env 주입

---

## 6. Documentation Gaps (즉시 조치 필요)

| File | Status | Action |
|------|--------|--------|
| CLAUDE.md | outdated | 프로젝트 구조 업데이트 (신규 컴포넌트 4개, tests/, sampler.ts) |
| PLAN.md 섹션 11 | outdated | 완료 항목 체크 |
| worklog/ | missing day05+ | 바이럴 엔진 구현 기록 보충 |
| static/og-image.png | missing | OG 이미지 생성 필요 |

---

## 7. Next Session Checklist

다음 세션에서 ce:plan (6단계)을 실행하면 이 문서의 모든 학습이 자동으로 반영됩니다:
- [ ] 날짜 파싱 변경 시 → 경계값 parameterized 테스트 추가
- [ ] 외부 API 추가 시 → 폴백 체인 + 타임아웃 패턴 적용
- [ ] DOM 캡처 기능 시 → 스케일 복원 패턴 확인
- [ ] fallback 값 설정 시 → 도메인 범위 내 유효성 검증
- [ ] 새 플랫폼 API 사용 시 → caniuse 사전 조사
