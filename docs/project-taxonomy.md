# TokSim Project Taxonomy

분류 기준일: 2026-05-19 | Day 4 완료 기준

---

## Tech Stack Tags

- `sveltekit-2.57`: SvelteKit ^2.57.0, Svelte 5 Runes 모드 프레임워크
- `svelte-5.55-runes`: Svelte 5 ($state, $derived) 반응성 시스템
- `cloudflare-pages`: 배포 플랫폼, adapter-cloudflare ^7.2.8
- `gemini-flash-api`: Google Gemini REST API (2.5-flash, 2.0-flash, 1.5-flash)
- `html2canvas-1.4`: DOM→PNG 캡처 라이브러리
- `vite-8`: 빌드 도구
- `vitest-4`: 테스트 프레임워크
- `typescript-6`: 타입 시스템
- `css-scoped-svelte`: Svelte scoped styles + 인라인 CSS (외부 CSS 프레임워크 없음)

---

## Problem Domain Tags

- `chat-parsing`: 카카오톡 PC/모바일 텍스트를 구조화 데이터로 변환
- `date-time-parsing`: 한국어 날짜/시간 포맷 (오전/오후, 년월일) 파싱
- `media-type-detection`: 사진/동영상/이모티콘/음성/파일/삭제 메시지 분류
- `multiline-message`: 여러 줄에 걸친 메시지를 하나로 합치는 로직
- `frontend-statistics`: AI 없이 JS로 통계 계산 (답장 속도, 시간대 분포, 단어 빈도 등)
- `korean-nlp-tokenization`: 한국어 공백 분리 토큰화 + 불용어/조사 처리
- `ai-text-analysis`: LLM으로 말투/성격/관계 역학 분석
- `ai-prompt-engineering`: 한국어 분석 프롬프트 + JSON 응답 스키마 설계
- `image-card-generation`: 결과를 9:16 이미지 카드로 변환 (html2canvas)
- `viral-sharing`: 결과 이미지를 SNS로 공유하는 바이럴 루프
- `rate-limiting`: Gemini 무료 티어 하루 250건 쿼터 보호
- `session-data-passing`: sessionStorage로 페이지 간 데이터 전달 (서버 미저장)
- `file-upload-drag-drop`: txt 파일 업로드 + 드래그&드롭 입력 경로

---

## Solution Pattern Tags

- `model-fallback-chain`: Gemini 2.5→2.0→1.5 순차 시도, retryable 에러(429/5xx) 시 다음 모델로 전환
- `graceful-degradation`: AI 분석 실패해도 기본 통계는 정상 표시
- `pre-scan-then-parse`: 파싱 시작 전 전체 텍스트를 한 번 스캔해서 첫 날짜 헤더를 찾고 초기값 설정
- `min-max-sweep`: 메시지 배열을 순회하며 min/max timestamp으로 startDate/endDate 계산 (인덱스 의존 제거)
- `time-rollover-detection`: 시간이 역행하면(오후→오전) 다음 날로 자동 rollover
- `sampling-for-cost`: AI에 전체 대화 대신 50개 샘플만 전송 (최근 20 + 랜덤 30, 시간순 재정렬)
- `client-side-compute`: 기본 통계를 프론트엔드 JS에서 처리해 API 비용 $0
- `session-storage-bridge`: 브라우저 탭 내에서만 데이터 유지, 탭 닫으면 자동 폐기 (프라이버시)
- `hidden-input-label`: file input을 숨기고 label을 버튼처럼 보이게 하는 패턴
- `abort-controller-timeout`: fetch에 30초 AbortController 타임아웃 적용
- `json-mode-llm`: Gemini responseMimeType: "application/json"으로 구조화 응답 강제
- `env-fallback-chain`: `$env/dynamic/private` ?? `platform.env` 순서로 Cloudflare 환경변수 접근
- `midnight-based-day-count`: 달력 날짜 자정 기준으로 totalDays 계산 (off-by-one 방지)
- `duo-group-mode-split`: 참여자 수 기준으로 duo/group 모드 분기 (프롬프트, UI, 통계 모두)
- `watermark-branding`: 결과 이미지 하단에 서비스 URL 워터마크 삽입

---

## Issue Category Tags

### 날짜/시간 파싱
- `date-header-missing`: 드래그 복사 시 첫 날짜 헤더 누락 → 오늘 날짜 fallback 오차 (day 4 수정: pre-scan)
- `day-off-by-one-js-date`: JavaScript Date의 day는 1-based인데 month처럼 0-based로 착각 (kakao.ts:60, spec 버그)
- `totaldays-off-by-one`: Math.ceil + 1로 같은 날 대화가 2일로 카운트 (day 2 수정: midnight 기준)
- `negative-totaldays`: 첫 메시지 fallback 날짜(2026)와 실제 대화(2024) 시간차로 -721일 (day 4 수정)
- `time-rollover-midnight`: 오후 11시→오전 1시 전환 시 날짜 자동 증가 필요

### AI/API 연동
- `gemini-503-overload`: Gemini 2.5-flash 모델 과부하로 503 UNAVAILABLE 반환
- `gemini-429-quota`: 무료 티어 일일 쿼터 초과 시 429 반환
- `static-vs-dynamic-env`: Cloudflare Pages에서 $env/static/private는 빌드 타임, runtime은 $env/dynamic/private 또는 platform.env 필요
- `debug-error-leak`: 디버깅용 Gemini 원본 에러를 클라이언트에 노출한 채 배포 (day 4 정리)
- `json-fence-strip`: Gemini가 ```json 펜스를 포함한 응답 반환 시 파싱 전 strip 필요

### DOM/브라우저
- `html2canvas-font-timing`: document.fonts.ready 대기 후 캡처해야 폰트 누락 방지
- `html2canvas-failure`: html2canvas 캡처 실패 시 스크린샷 안내 fallback 필요
- `svelte5-proxy-console`: Svelte 5 $state가 콘솔에 Proxy(Object)로 표시 (정상 동작, 혼동 주의)
- `sessionstorage-date-revival`: JSON 직렬화 시 Date 객체가 문자열로 변환 → 역직렬화 시 new Date() 복원 필요

### 플랫폼 호환성
- `ios-no-web-share-target`: iOS는 Web Share Target API를 전혀 지원하지 않음
- `ios-chrome-no-pwa`: iOS Chrome에서 PWA "홈 화면에 추가" 불가 (Safari/WebKit만 허용)
- `pwa-android-only-roi`: PWA + Web Share Target이 Android Chrome에서만 동작 → 유지비 대비 효용 낮아 제거

### 한국어 NLP
- `korean-particle-unsplit`: "상의"/"상의만"/"상의로"가 별도 토큰으로 집계됨 (미해결)
- `unicode-emoji-in-words`: 이모지가 단어 빈도에 포함될 가능성 (미해결)
- `stopword-coverage`: 한국어 조사/감탄사 불용어 목록 커버리지 부족 (미해결)

---

## Reusable Components

- `kakao-parser`: 카카오톡 PC/모바일 대화 텍스트 파서. 날짜 헤더 감지, 멀티라인 합치기, 미디어 분류, 시스템 메시지 스킵 포함. 다른 한국어 채팅 분석 프로젝트에 그대로 사용 가능. (`src/lib/parser/kakao.ts`)
- `chat-statistics-analyzer`: 채팅 메시지 배열로부터 답장 속도, 시간대/요일 분포, 단어 빈도, 대화 시작 횟수 등 통계 산출. 메신저 무관 범용 구조. (`src/lib/analyzer/statistics.ts`)
- `message-sampler`: 대화 배열에서 AI 분석용 대표 샘플 50개 추출 (최근 20 + 랜덤 30, 시간순 재정렬). LLM 비용 최적화에 범용 적용 가능. (`src/lib/analyzer/sampler.ts`)
- `gemini-fallback-endpoint`: 3개 Gemini 모델 폴백 체인 + 30초 타임아웃 + retryable 에러 판별. 다른 Gemini 기반 프로젝트에 패턴 복사 가능. (`src/routes/api/analyze/+server.ts`)
- `result-card-carousel`: CSS scroll-snap 기반 9:16 카드 캐러셀. 모바일 스와이프 + 데스크톱 화살표 + 도트 인디케이터. (`src/lib/components/CardCarousel.svelte`)
- `html2canvas-download-button`: DOM 요소→PNG 캡처 + a.download 저장. 폰트 대기, 실패 fallback 포함. (`src/lib/components/DownloadButton.svelte`)
- `cloudflare-env-pattern`: `$env/dynamic/private` ?? `platform.env` 이중 fallback으로 Cloudflare Pages에서 안정적 환경변수 접근

---

## Anti-Patterns Discovered

- `today-fallback-for-missing-dates`: 날짜 헤더 없을 때 오늘 날짜로 fallback하면 과거 대화와 2년 차이 발생 → pre-scan으로 첫 날짜 헤더를 미리 찾아야 함
- `index-based-date-range`: messages[0]/messages[last]로 startDate/endDate 계산하면 비정렬 데이터에서 오류 → min/max sweep 필요
- `ceil-plus-one-day-count`: Math.ceil(diff/dayMs) + 1은 같은 날 대화를 2일로 카운트 → 자정 기준 Math.round + 1 사용
- `static-env-on-cloudflare`: Cloudflare Pages에서 $env/static/private 사용하면 빌드 타임 값만 주입됨 → runtime에서 비어있을 수 있음
- `raw-api-error-to-client`: 디버깅용으로 Gemini 원본 에러를 클라이언트에 노출하면 API 키 힌트 등 민감 정보 유출 위험 → 서버 로그만
- `pwa-for-cross-platform-share`: PWA + Web Share Target을 크로스 플랫폼 공유 수단으로 사용하려는 시도 → iOS 미지원으로 Android-only 기능이 됨, 유지비 대비 효용 없음
- `single-model-dependency`: 단일 AI 모델에 의존하면 그 모델 과부하 시 서비스 전체 먹통 → 반드시 폴백 체인 구성
- `space-tokenization-for-korean`: 한국어를 공백만으로 토큰화하면 조사가 붙은 채로 분리됨 → 조사 스트립 룰 필요 (미구현)

---

## Cross-Reference: Worklog → Tag Mapping

| Worklog | 관련 태그 |
|---------|-----------|
| day01 | `chat-parsing`, `date-header-missing`, `kakao-parser`, `time-rollover-detection` |
| day02 | `frontend-statistics`, `totaldays-off-by-one`, `midnight-based-day-count`, `session-storage-bridge` |
| day03 | `ai-text-analysis`, `model-fallback-chain`, `gemini-503-overload`, `static-vs-dynamic-env`, `sampling-for-cost` |
| day04 | `negative-totaldays`, `pre-scan-then-parse`, `file-upload-drag-drop`, `pwa-for-cross-platform-share`, `debug-error-leak` |
