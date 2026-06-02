# 입력 마찰 해소 — 인앱브라우저 탈출 + 가벼운 입력 (Design Spec)

작성일: 2026-06-02 | 상태: 설계 승인됨 (구현 전) | 선행: 클릭-백 루프 1단계(`docs/NEXT-SESSION.md`)

## 1. 문제

톡심 수익 루프의 끊긴 2개 마디 중 **입력 마찰**(나머지 하나). 클릭-백 루프가 사람들을 **카톡 인앱브라우저(모바일)** 로 데려오는데, 정작 자기 톡을 분석하려면 `대화 내보내기 → 텍스트 → 파일 저장 → 톡심 와서 업로드`라는 무거운 절차를 거쳐야 한다. 병목은 **절차 마찰**(사용자 확인).

북극성: **안 불편하게 · 가볍게 "한번 해볼까?" 싶게 · 시간 안 들이고 → 유저 수↑.**

## 2. 검증된 사실 (설계 근거)

- **카톡 인앱브라우저는 파일 업로드/다운로드/클립보드를 막는다** (한국 개발자 공통 문제). 즉 바이럴 모바일 유입자는 인앱브라우저 안에서 **입력 자체가 불가능**할 수 있다. → 진짜 villain은 export가 아니라 인앱브라우저.
- **`navigator.clipboard.readText()`는 Android WebView에서 동작 안 함** → "클립보드 자동 읽기" 마법은 핵심 청중에게 불가.
- 인앱브라우저 탈출 표준 방법: 딥링크 `location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(targetUrl)`, 또는 수동(우상단 더보기 ⋯ → "다른 브라우저로 열기").
- 카톡 텍스트 내보내기는 이메일/파일 저장 중심(깔끔한 clipboard 복사 경로 미보장).

출처: burndogfather.com/271, inblog.ai(spencer-tech), github.com/mdn/browser-compat-data/issues/20867.

## 3. 설계

### 3.1 🔑 키스톤 — 인앱브라우저 탈출
UA에 `KAKAOTALK` 포함 시(= 카톡 인앱브라우저) 감지하고, **입력 가능한 외부 브라우저로 한 탭에 보낸다.** 이 한 수가 파일 업로드·클립보드·(미래)설치를 동시에 푼다.

- 감지: `isKakaoInApp(ua)` — UA에 `KAKAOTALK` (대소문자 무시).
- 탈출(자동 시도): `openExternalKakao(url)` → `location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url)`.
- **UX**: 입력 영역 위에 눈에 띄는 배너 — "카톡 안에서는 파일 업로드가 막혀 있어요. [Chrome/Safari로 열기]" + 수동 안내(우상단 ⋯ → 다른 브라우저로 열기) fallback.
- 배너는 인앱브라우저일 때만 노출. 외부 브라우저/PC에선 숨김.
- iOS 분기: `openExternal` 딥링크가 iOS 카톡에서 안 먹으면 수동 안내(공유 → Safari) 우선 노출. (실기기 검증 항목)

### 3.2 입력을 가볍게 (탈출 이후, 외부 브라우저 기준)
1. **파일 선택 즉시 자동 분석** — 현재는 업로드 후 별도 `분석하기` 탭 필요. 파일 읽힌 직후 유효하면 바로 `handleAnalyze()` 트리거(탭 1회 제거). 실패 시 기존 에러 표시.
2. **붙여넣기 즉시 자동 분석** — textarea `onpaste`(또는 값 변경) 시 유효한 카톡 포맷이면 자동 분석. 수동 `분석하기` 버튼은 fallback로 유지.
3. **기기 자동감지 단일 추천 가이드** — 현재 android/ios/pc 3탭을 사용자가 직접 고름. UA로 자동 선택해 **내 기기 경로 하나만 크게**, 나머지는 "다른 기기에서 가져오기"로 접기. 톤은 "10초면 돼요".

### 3.3 컴포넌트 / 파일 경계
| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `src/lib/utils/inapp.ts` | `isKakaoInApp(ua)`, `detectPlatform(ua)`('android'\|'ios'\|'pc'), `openExternalKakao(url)` — 순수/부수효과 분리, 테스트 가능 | Create |
| `src/lib/components/InAppBrowserNotice.svelte` | 인앱 감지 시 배너 + 외부열기 버튼 + 수동 fallback 안내 | Create |
| `src/routes/+page.svelte` | 배너 마운트, 자동분석(onpaste/onchange), 가이드 기기 자동선택 | Modify |
| `tests/utils/inapp.test.ts` | UA 파싱 분기(KAKAOTALK/Android/iOS/PC) | Create |

`/r/[type]/+page.svelte`의 CTA(`🔥 내 단톡방 캐릭터 분석하기`)는 이번 범위에선 그대로 두되, 클릭 시 `/`로 가면 거기서 배너가 받는다. (CTA 자체 외부열기 분기는 후속 옵션)

### 3.4 데이터 흐름
1. 페이지 로드 → `onMount`에서 `navigator.userAgent`로 `isKakaoInApp`/`detectPlatform` 판정(클라이언트 전용).
2. 인앱이면 배너 노출 → 버튼 탭 → `openExternalKakao(location.href)` → 외부 브라우저에서 같은 URL 재오픈.
3. 외부 브라우저에서 입력(파일 선택 또는 붙여넣기) → 유효 시 자동 `handleAnalyze()` → 기존 파이프라인(`parseKakaoChat` → `analyzeStatistics` → sessionStorage → `/result`) 그대로.
4. 가이드는 `detectPlatform` 결과로 기본 탭 자동 선택.

### 3.5 에러 처리 (기존 유지 + 최소 추가)
- 파일/텍스트 검증·에러 메시지는 현행 그대로(`readFile`, msgCount<30 등).
- 자동 분석은 **유효할 때만** 트리거(파싱 성공 + 최소 건수 충족). 미달이면 자동 트리거 안 하고 사용자가 더 넣게 둠(기존 에러 메시지 재사용).
- `openExternalKakao` 실패(딥링크 미동작)는 감지 불가 → 수동 안내 문구를 배너에 항상 병기해 fallback.

### 3.6 테스트
- `inapp.test.ts`: 대표 UA 문자열로 `isKakaoInApp`(카톡 인앱 true / 일반 Chrome·Safari false), `detectPlatform`(android/ios/pc) 단위 테스트.
- 자동분석/배너 UI는 기존 `parseKakaoChat`·`analyzeStatistics` 회귀로 파이프라인 보호 + dev 서버 + browse로 시각 검증(인앱 UA 위장: `useragent` 명령으로 KAKAOTALK UA 주입 후 배너 노출 확인).

## 4. 범위 밖 (후속)
- 클립보드 자동읽기(WebView 차단으로 보류).
- Web Share Target PWA(설치 필요 → 첫 유입자엔 무거움; 재방문자용으로 추후).
- `/r/[type]` CTA의 직접 외부열기 분기.
- 입력 없이 보는 데모/맛보기(동기 마찰 영역 — 이번 범위 아님).

## 5. 구현 1순위 spike (실기기 검증)
1. `kakaotalk://web/openExternal?url=` 이 Android/iOS 카톡 인앱브라우저에서 실제로 외부 브라우저를 여는가.
2. iOS 카톡 인앱(WKWebView)은 `<input type=file>` 업로드가 되는가(되면 iOS는 탈출 없이도 가능 → 배너를 Android 우선으로).
3. 안 되면 기기별 분기(Android=자동 딥링크, iOS=수동 공유→Safari 안내).

## 6. 성공 기준
- 카톡 인앱브라우저 진입 시 **막다른 길 없이** 외부 브라우저로 갈 1탭 경로가 항상 보인다.
- 외부 브라우저에서 파일 선택/붙여넣기 후 **별도 버튼 탭 없이** 결과로 진입한다.
- 가이드가 내 기기에 맞는 한 경로만 먼저 보여 "가볍다"고 느껴진다.
