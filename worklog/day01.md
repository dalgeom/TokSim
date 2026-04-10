# 1일차 작업일지 (2026-04-10)

## 목표
전체 데이터 파이프라인의 시작점인 **카카오톡 대화 파서**와 **랜딩 페이지 최소 골격**을 만들고, `git push → Cloudflare Pages 자동 배포` 흐름을 검증한다.

## 완료한 작업

### 1. 인프라: Cloudflare Pages 자동 배포 연결
- Cloudflare 계정 생성 (hyun7219@gmail.com)
- `dalgeom/TokSim` GitHub repo를 Cloudflare Pages 프로젝트 `toksim`에 연결
- Framework preset: **SvelteKit**, build command `npm run build`, output `.svelte-kit/cloudflare`
- 배포 URL: **https://toksim.pages.dev**
- 이후 `main` 브랜치에 push하면 자동 빌드 + 배포되는 파이프라인 완성

### 2. 타입 정의 ([src/lib/types/index.ts](../src/lib/types/index.ts))
모든 하위 모듈이 공유할 핵심 자료구조:
- `MessageType`: `text | photo | video | emoticon | voice | file | deleted | system`
- `Message`: `{ timestamp, sender, content, type }`
- `Participant`: `{ name, messageCount }`
- `ChatData`: `{ messages, participants, startDate, endDate }`
- `ParseResult`: `{ success, data?, error? }`

### 3. 카카오톡 파서 ([src/lib/parser/kakao.ts](../src/lib/parser/kakao.ts))
**지원하는 입력 포맷:**
- **PC 내보내기 txt**: `--------------- 2026년 4월 9일 목요일 ---------------` 날짜 헤더 + `[홍길동] [오후 3:42] 메시지` 라인
- **PC 창에서 드래그 복사**: 날짜 헤더가 없거나 대시 없이 `2026년 4월 9일 목요일`만 있는 케이스
- **모바일 복사 포맷**: `2024년 1월 15일 오후 3:42, 홍길동 : 내용` 한 줄 포맷

**처리 로직:**
- 날짜 헤더가 전혀 없으면 `오늘 날짜`로 fallback
- 시간이 역행(예: 오후 11시 → 오전 1시)하면 다음 날로 자동 rollover
- 여러 줄에 걸친 메시지는 이전 메시지 `content`에 이어붙임
- 시스템 메시지("님이 들어왔습니다/나갔습니다/초대했습니다" 등)는 무시
- 미디어 메시지 자동 분류:
  - `사진`, `사진 6장`, `<사진>`, `<사진 3장>` → `photo`
  - `동영상`, `<동영상>` → `video`
  - `이모티콘`, `<이모티콘>` → `emoticon`
  - `음성메시지`, `<음성메시지>` → `voice`
  - `파일:`, `파일`, `<파일>` → `file`
  - `삭제된 메시지입니다.` → `deleted`
- 반환: `ParseResult` (성공 시 정렬된 메시지 + 참여자 카운트 + 기간)

### 4. 랜딩 페이지 ([src/routes/+page.svelte](../src/routes/+page.svelte))
Svelte 5 runes (`$state`) 기반 최소 UI:
- 타이틀 "톡심" + 한 줄 카피
- 대화 붙여넣기 textarea (placeholder에 예시 형식 포함)
- "분석하기" 버튼 (빈 입력 시 disabled)
- 파싱 결과 요약: 전체 메시지 수, 참여자별 카운트, 기간
- 에러 발생 시 빨간 텍스트로 표시
- 자세한 파싱 결과는 `console.log`로 출력 (2일차 UI 작업 전 임시)
- 카카오톡 브랜드 컬러(#fee500) 기반 스타일링

## 실제 테스트에서 발견 + 수정한 버그

1. **드래그 복사 대화에 날짜 헤더가 없어 파싱 실패**
   → `currentDate`가 null이면 파싱이 안 되던 로직을 "오늘 날짜로 fallback + 시간 역행 시 rollover"로 변경

2. **`2026년 4월 9일 목요일` 같은 bare 날짜 라인을 인식 못 함**
   → `DATE_HEADER_RE` 정규식에서 양쪽 대시를 optional로 풀고 요일(`목요일`) 접미사 허용

3. **`음성메시지`, `<동영상>`, `삭제된 메시지입니다` 등 미디어 변형 포맷 미감지**
   → `detectType()`에 패턴 추가, `MessageType`에 `voice` / `deleted` 추가

## 실제 검증 결과
태규 ↔ 임현진 카톡 대화 (약 120여 줄) 드래그 복사 → 파싱 성공:
- 122 메시지, 2 참여자 정확히 추출
- 타임스탬프 정상 (날짜 헤더 수정 후)
- F12 콘솔에서 `Proxy(Object)`로 보이는 건 Svelte 5 `$state` 래핑 (정상)

## 커밋 히스토리
| 해시 | 메시지 |
|---|---|
| `b4ecd50` | Day 1: Add KakaoTalk parser and minimal landing page |
| `6364428` | Fix parser to handle drag-copied chat without date headers |
| `3d8feb8` | Accept date headers without dash separators |
| `1e5ccd4` | Detect voice, deleted, and angle-bracket media messages |

## 현재 프로젝트 구조
```
src/
├── lib/
│   ├── parser/
│   │   └── kakao.ts         ✅ 1일차 완료
│   └── types/
│       └── index.ts         ✅ 1일차 완료
└── routes/
    ├── +layout.svelte
    └── +page.svelte         ✅ 1일차 최소 버전 (결과는 console.log)
```

## 미처리로 남은 것 / 2일차 이후 과제
- **통계 분석기** (`src/lib/analyzer/statistics.ts`) — 답장 속도, 시간대별 분포, 요일별 패턴, 단어 빈도, ㅋ/ㅎ/ㅠ 카운트, 미디어 비율 등
- **결과 페이지** (`src/routes/result/+page.svelte`) — 통계 시각화, AI 분석 결과 카드
- **Gemini API 연동** (`src/routes/api/analyze/+server.ts`) — 통계 요약 + 대화 샘플 50개만 전송하는 비용 절감 구조
- **공유용 카드 이미지 생성** (`html2canvas` 또는 `Satori`)
- **카카오톡 공유 SDK 연동**
- **사용자 플로우**: 현재 `+page.svelte`에서 파싱 결과를 `/result`로 넘기는 라우팅 미구현 (2일차에 `sessionStorage` 또는 URL state로 처리 예정)
- **에러 UX**: 파싱 실패 시 "어떤 형식이 지원되는지" 가이드 추가 필요
- **파서 추가 대응 여지**: 단체 채팅방 시스템 메시지, 지도/연락처/투표 공유 등 특수 메시지

## 2일차 시작 지점
프론트엔드 통계 분석기 (`src/lib/analyzer/statistics.ts`) 작성 → 결과 페이지 기본 UI → 파싱 결과를 결과 페이지로 넘기는 라우팅 처리.
