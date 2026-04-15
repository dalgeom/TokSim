# 4일차 작업일지 (2026-04-10)

## 목표
입력 UX의 근본 개선(드래그 복사 → 파일 업로드)과 결정적 버그(`대화한 날 = -721`) 수정. 초반에 PWA + Web Share Target까지 붙여봤지만 iOS가 Web Share Target을 전혀 지원하지 않는 사실을 테스트 중 확인하고, **플랫폼 공통으로 동작하는 것만 남기자**는 방향으로 선회해서 PWA 레이어를 전부 제거. 최종 입력 경로는 **붙여넣기 + txt 파일 업로드** 두 가지.

## 완료한 작업

### 1. 파서 / 통계 날짜 버그 수정 ([src/lib/parser/kakao.ts](../src/lib/parser/kakao.ts))
사용자가 붙여넣은 3개월치 대화에서 **"대화한 날 = -721"** 이라는 음수가 나온 버그.

**원인 1: 파서의 "오늘 날짜 fallback" 오차**
- 드래그 복사는 첫 화면에 보이는 메시지부터 시작되는데, 그 앞에 날짜 헤더가 없음
- 기존 코드는 날짜 헤더 없을 때 `오늘 날짜(2026-04-10)`로 fallback
- 뒤쪽에서 `2024년 1월 30일` 헤더가 등장하면 그때부터 2024년 날짜 사용 → 첫 메시지(2026)와 나머지(2024) 사이 시간차가 2년
- 해결: **파싱 시작 전에 한 번 pre-scan해서 첫 번째 날짜 헤더를 찾고**, 발견하면 그 날짜의 **하루 전**을 초기 `currentDate`로 설정. (카톡 드래그 복사는 첫 화면의 메시지가 보통 그 다음 날짜 헤더의 직전 날 것이기 때문)

**원인 2: `startDate`/`endDate`를 `messages[0]`/`messages[last]`로 단순 계산**
- 메시지가 시간순이 아니면 엉뚱한 값이 나옴 (버그 1과 상호작용하면 음수 days까지 나옴)
- 해결: 전체 메시지를 순회하면서 **min/max timestamp**로 계산

두 수정을 합쳐 같은 대화로 재테스트 → `대화한 날`이 실제 범위로 정상 표시.

### 2. 파일 업로드 + 드래그&드롭 ([src/routes/+page.svelte](../src/routes/+page.svelte))
랜딩 페이지에 두 가지 새로운 입력 경로:
- **파일 선택 버튼**: `<input type="file" accept=".txt,text/plain">`에 `<label>`을 씌워서 큰 버튼처럼 보이게 (hidden input + label 패턴)
- **드래그&드롭**: textarea 컨테이너에 `ondragover`/`ondragleave`/`ondrop` 이벤트, dragging 상태일 때 노란 오버레이 "파일을 놓아주세요"
- `readFile()`: `.txt` 확장자/MIME 체크, 20MB 사이즈 가드, `file.text()`로 읽어서 textarea에 채움
- 파일 선택 후 input value를 비워서 같은 파일 재선택 가능하게 함

### 3. 플랫폼별 가이드 탭 (재편)
처음엔 Android/iOS/PC 3탭을 만들면서 **"PWA 설치하면 공유 시트에서 톡심 바로"** 같은 PWA 유도 문구를 넣었다가, 나중에 PWA 제거하면서 가이드도 **두 경로(복사 붙여넣기 / 파일 업로드)**를 나란히 안내하는 구조로 재작성:
- 각 탭 안에 **방법 1 (복사 붙여넣기)**, **방법 2 (txt 파일 업로드)** 두 h3 섹션
- 플랫폼별 구체 단계: Android/iOS는 `☰ → ⚙️ → 대화 내용 내보내기 → 텍스트만 보내기/텍스트로 공유 → 파일에 저장`, PC는 우클릭 드래그 선택 또는 `⋮ → 대화 내용 내보내기`
- 상단에 "두 가지 방법이 있어요: ..." 한 줄 intro 추가

### 4. AI 분석 에러 메시지 정리 ([src/routes/api/analyze/+server.ts](../src/routes/api/analyze/+server.ts))
3일차에서 Gemini 503 디버깅을 위해 **원본 에러 메시지를 그대로 클라이언트에 노출**하던 코드를 사용자 친화적 메시지로 복원:
- 400 → "요청 형식이 올바르지 않습니다"
- 403 → "AI 분석 권한 확인에 실패했습니다"
- 기타 non-retryable → "AI 분석 중 오류가 발생했습니다"
- 모든 모델 폴백 실패 → "AI 분석 서비스가 일시적으로 혼잡합니다. 1~2분 후 다시 시도해주세요"
- 각 시도 실패 사유는 서버 로그에만 남김

## 시도했다가 제거한 작업 (PWA + Web Share Target)

### 배경
모바일 사용자 UX를 근본적으로 끌어올리려고 PWA 설치 + Web Share Target을 구현. 목표는 "카톡 → 대화 내보내기 → 공유 시트에서 톡심 선택 → 자동 로드" 흐름.

### 구현했던 것
- `static/manifest.webmanifest` (standalone display, share_target 선언)
- `static/icon.svg` + `scripts/generate-icons.mjs` (sharp 기반 PNG 생성: 192x192, 512x512, maskable 512, apple-touch 180)
- `src/service-worker.ts` (빌드 산출물/정적 파일 캐싱, `/api/*`와 `/share`는 스킵)
- `src/routes/share/+server.ts` (POST FormData 받아서 sessionStorage에 담아주는 HTML 브리지 반환)
- `src/routes/+page.svelte`의 `onMount`에서 `toksim:sharedText` 읽어서 textarea에 채움
- `src/app.html`에 manifest link, apple-touch-icon, theme-color, apple-mobile-web-app-capable 메타

### 제거 결정 이유
1. **iOS는 Web Share Target을 전혀 지원하지 않음** — Apple이 iOS의 모든 브라우저에서 Web Share Target API를 막아놨음. 설령 Safari로 설치해도 카톡 공유 시트에 톡심이 등장하지 않음.
2. **iOS Chrome은 PWA 설치 자체가 불가능** — Apple 정책상 "홈 화면에 추가"는 Safari/WebKit에만 허용. iOS Chrome 사용자는 설치 버튼 자체를 못 봄.
3. **결국 Android Chrome에서만 동작하는 기능** — 이걸 위해 정적 자산과 service worker, PNG 생성 파이프라인까지 관리하는 건 유지비 대비 효용이 낮음.
4. 사용자 판단: "플랫폼 공통으로 동작하는 것만 남기자" → PWA 레이어 전면 제거.

### 되돌리기
- `sharp` devDependency 제거 (`npm uninstall sharp`)
- PNG 4개, manifest, service worker, `/share` 엔드포인트, generate-icons 스크립트 전부 삭제
- `app.html`에서 PWA 관련 메타 모두 제거, SVG favicon + theme-color만 남김
- 랜딩 페이지의 `sharedText` 처리 로직 제거
- 가이드 탭도 "설치하면 공유 시트에서" 문구 전부 걷어내고 **복사/파일 업로드 두 경로만** 안내

## 검증 결과
- ✅ `-721` 버그 해결 확인 (사용자 재테스트)
- ✅ 파일 업로드 + 드래그&드롭 기능 정상 동작 (로컬 빌드 검증)
- ✅ AI 분석 에러 메시지 사용자 친화적으로 복원
- ✅ PWA 전면 제거 후 빌드 성공

## 커밋 히스토리
| 해시 | 메시지 |
|---|---|
| `8eb4322` | Fix negative totalDays when chat starts mid-day without header |
| `e71c7a2` | Day 4: Add file upload, drag-drop, and platform guide tabs |
| `fd929d1` | Day 4: Make TokSim installable as PWA with Web Share Target ← 이후 제거 |
| `f5ab04e` | Clean up Day 3 debug error strings in /api/analyze |
| `5ce1a07` | Generate PNG icons so mobile Chrome accepts PWA install ← 이후 제거 |
| `7e32933` | Warn iOS users to use Safari, not Chrome, for PWA install ← 이후 제거 |
| `c361d7a` | Remove PWA and Web Share Target, keep paste + file upload only |

## 현재 프로젝트 구조
```
src/
├── app.html                      # favicon + theme-color만
├── lib/
│   ├── analyzer/
│   │   ├── sampler.ts            ✅ 3일차
│   │   └── statistics.ts         ✅ 2일차
│   ├── parser/
│   │   └── kakao.ts              ✅ 1·2·4일차 (pre-scan, min/max dates)
│   └── types/
│       └── index.ts              ✅ 1·2·3일차
└── routes/
    ├── +layout.svelte
    ├── +page.svelte              ✅ 4일차: 파일 업로드, 드롭, 플랫폼 가이드 탭
    ├── api/
    │   └── analyze/
    │       └── +server.ts        ✅ 3·4일차 (폴백 체인, 에러 정리)
    └── result/
        └── +page.svelte          ✅ 2·3일차

static/
├── icon.svg                       # favicon만
└── robots.txt
```

## 미처리로 남은 것 / 5일차 이후 과제

### 우선순위 A (런칭 전 필수)
- **🔒 Rate limiting** — 무료 티어 하루 250건 쿼터 보호. Cloudflare KV에 IP별 카운터 또는 클라이언트 sessionStorage 기반.
- **📣 공유 기능 (바이럴 엔진)** — 결과 카드 이미지 생성 (`html2canvas` or `Satori`) + 다운로드 버튼. 카카오톡 공유 SDK는 후순위.

### 우선순위 B
- **한국어 조사 스트립** — `상의`/`상의만`/`상의로` 통합
- **유니코드 이모지 필터** — 단어 빈도에서 이모지 제거
- **AI 프롬프트 튜닝** — few-shot 예시 추가, 단체 채팅 분기
- **단체 채팅방 UI** — 3인 이상 참여자 처리

### 우선순위 C
- SEO 메타태그 / Open Graph 이미지
- 분석 히스토리 (localStorage)
- 다크모드
- 차트 라이브러리 업그레이드

## 5일차 시작 지점
**공유 기능 구현 + Rate limiting** 두 축이 핵심.

1. **Rate limiting 먼저** (바이럴되면 쿼터 보호가 필수): Cloudflare KV binding 또는 `request.headers.get('cf-connecting-ip')` 기반 in-memory 카운터로 간단히 시작. `src/routes/api/analyze/+server.ts` 앞단에 붙임.
2. **결과 카드 컴포넌트** `src/lib/components/ResultCard.svelte`: AI 결과 + 핵심 통계를 인스타 스토리 비율(9:16) 또는 정사각형(1:1)로 배치
3. **`html2canvas`로 이미지 변환** + 다운로드 버튼. 카카오톡 공유 SDK는 그 다음 단계.

여유 있으면 **한국어 조사 스트립**도 곁다리로 추가. 간단한 룰(`은/는/이/가/을/를/의/로/에/에서/만/도` 접미사 제거)만 해도 단어 빈도 품질이 확 올라감.
