# 3일차 작업일지 (2026-04-10)

## 목표
2일차에 완성된 기본 통계 위에 **Gemini Flash 기반 AI 분석 레이어**를 얹어서, 사용자가 결과 페이지에 진입하면 AI가 자동으로 말투·성격·관계 역학을 분석한 카드를 보여주도록 만든다.

## 완료한 작업

### 0. 사전 준비 (사용자 작업)
- Google AI Studio에서 Gemini API 키 발급 (무료 티어)
- Cloudflare Pages 대시보드 `toksim` 프로젝트 Settings → Variables and Secrets에 `GEMINI_API_KEY`를 **Secret** 타입으로 등록
- 로컬 개발용 `.env` 파일 생성 (`.gitignore`에 이미 포함되어 있어 실수 커밋 방지됨)

### 1. AI 분석 타입 정의 ([src/lib/types/index.ts](../src/lib/types/index.ts))
- `ParticipantPersona`: 참여자별 말투 유형 + 성격 키워드 3개
- `AIAnalysis`: 참여자 persona 배열 + 대화 온도(0~100) + 관계 역학 설명 + 한 줄 총평
- `AnalyzeRequest`: 클라이언트→서버 요청 형식 (Statistics + sampleMessages)
- `AnalyzeResponse`: 서버 응답 형식 (success/analysis/error)

### 2. 메시지 샘플러 ([src/lib/analyzer/sampler.ts](../src/lib/analyzer/sampler.ts))
Gemini API 비용 최소화 원칙 구현:
- **텍스트 메시지만 필터링** (미디어 메시지는 샘플에 불필요)
- 메시지가 **50개 이하**면 전체 전송
- 50개 초과면 **최근 20개 + 과거에서 랜덤 30개** 선택
- 선택한 50개를 타임스탬프 순으로 재정렬해서 자연스러운 문맥 유지
- 예상 입력 토큰 ~2,000 / 출력 ~500 → 무료 티어 하루 250건에 여유

### 3. Gemini API 엔드포인트 ([src/routes/api/analyze/+server.ts](../src/routes/api/analyze/+server.ts))
SvelteKit `+server.ts`로 POST 엔드포인트 구현:
- 요청 바디 검증 (`statistics`, `sampleMessages` 필수)
- 한국어 프롬프트에 통계 요약 + 샘플 대화를 주입
- Gemini REST API에 `responseMimeType: "application/json"`으로 호출 (JSON 모드)
- 응답 텍스트에서 ```json 블록을 떼고 `JSON.parse`
- 스키마 검증 (participants/temperature/dynamic/summary 필수 필드 체크)
- **모델 폴백 체인**: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash` 순서로 시도. 429/500/502/503/504 중 하나 나오면 다음 모델로 자동 재시도
- 모든 실패 시 각 모델별 실패 사유를 에러 메시지에 합산해서 반환

### 4. 결과 페이지 AI 연동 ([src/routes/result/+page.svelte](../src/routes/result/+page.svelte))
- `onMount`에서 통계 계산 직후 `runAIAnalysis(chatData, stats)` 자동 호출
- `fetch('/api/analyze')`로 서버 엔드포인트 호출
- 로딩 상태: 노란 스피너 + "AI가 대화를 분석 중입니다..." 메시지
- 성공: AI 카드 렌더링 (한 줄 총평 → 대화 온도 바 → 관계 역학 → 참여자별 말투 배지 + 성격 키워드 칩)
- 실패: "일시적으로 사용 불가" 안내, 기본 통계는 정상 표시 (graceful degradation)
- 대화 온도 숫자에 따라 색상 변화: 0~20 남색 → 20~40 파랑 → 40~60 노랑 → 60~80 주황 → 80~100 빨강

## 발견 + 수정한 버그 / 이슈

### 🐛 Gemini 503 UNAVAILABLE (모델 과부하)
**증상**: 첫 테스트에서 `gemini-2.5-flash`가 `{"error":{"code":503,"message":"This model is currently experiencing high demand..."}}` 반환.

**진단 과정**:
1. 초기 구현은 `gemini-2.0-flash` 단일 모델에 `$env/static/private` 사용 → 429 반환됨
2. 디버깅용으로 Gemini 원본 에러를 그대로 클라이언트에 노출하도록 변경
3. `$env/static/private` → `$env/dynamic/private` + `platform.env` fallback으로 변경 (Cloudflare Pages runtime env 주입 방식에 맞게)
4. 모델을 `gemini-2.5-flash`로 올렸더니 이번엔 503 UNAVAILABLE → Google 쪽 일시 과부하임을 확인

**해결**: 단일 모델에 의존하면 그 모델이 과부하 날 때마다 서비스가 먹통이 됨. **세 모델 폴백 체인**을 구현해서 retryable 에러(429/5xx) 시 다음 모델로 자동 전환. 재배포 후 정상 동작 확인.

### 💡 Cloudflare Pages 환경변수 주입 방식
- `$env/static/private`는 빌드 타임에 값 주입 → Cloudflare Pages에서는 런타임 `platform.env`로 들어오므로 static은 불안정할 수 있음
- `$env/dynamic/private`는 런타임에 읽음 → Cloudflare Pages에 더 적합
- 양쪽을 모두 지원하기 위해 `env.GEMINI_API_KEY ?? platform.env.GEMINI_API_KEY` 순서로 fallback

## 검증 결과
실제 카톡 대화(157 메시지, 1일 분량) 붙여넣어 확인:
- ✅ "분석하기" → `/result` 이동
- ✅ 스피너 로딩 후 AI 카드 렌더링
- ✅ 한 줄 총평: `"사랑이 넘치다 못해 꿀 떨어지는, 매일이 신혼 같은 커플의 대화"`
- ✅ 대화 온도: **93°** (빨간색 바)
- ✅ 관계 역학: `"임현진이 다정하게 대화를 주도하고 ❤움❤이 애교와 유머로 화답하는 연인 관계"`
- ✅ 임현진 말투: **애정표현형**, 키워드: #다정한 #적극적인 #배려심 있는
- ✅ 상대방 말투: **애교형**, 키워드: #애교있는 #솔직한 #유머러스한
- ✅ 기본 통계 섹션도 정상 표시

## 커밋 히스토리
| 해시 | 메시지 |
|---|---|
| `733c5a0` | Day 3: Integrate Gemini AI analysis |
| `ba7a2c3` | Debug Gemini 429: surface real error, use dynamic env, try 2.5-flash |
| `587ccdb` | Fall back across Gemini models on 5xx/429 |

## 현재 프로젝트 구조
```
src/
├── lib/
│   ├── analyzer/
│   │   ├── sampler.ts       ✅ 3일차 완료 (AI용 메시지 샘플링)
│   │   └── statistics.ts    ✅ 2일차 완료
│   ├── parser/
│   │   └── kakao.ts         ✅ 1일차 완료
│   └── types/
│       └── index.ts         ✅ 1·2·3일차 누적 (AIAnalysis 등 추가)
└── routes/
    ├── +layout.svelte
    ├── +page.svelte         ✅ 2일차: sessionStorage + goto 라우팅
    ├── api/
    │   └── analyze/
    │       └── +server.ts   ✅ 3일차 완료 (Gemini 폴백 체인)
    └── result/
        └── +page.svelte     ✅ 2·3일차 (AI 카드 섹션 추가)
```

## 미처리로 남은 것 / 4일차 이후 과제

### 디버깅 임시 코드 정리 필요
- 현재 엔드포인트는 **Gemini 원본 에러 메시지를 그대로 클라이언트에 노출** 중. 안정화 확인되면 사용자 친화적 메시지로 복원 필요 (예: 429 → "한도 초과", 5xx → "일시 사용 불가", 그 외 → "AI 분석 실패")

### Rate limiting
- 현재 IP/사용자별 호출 제한 없음. 악의적 호출로 Gemini 하루 250건 쿼터가 순식간에 소진될 수 있음
- 간단한 구현: Cloudflare KV에 IP별 카운터 두거나, 아니면 `sessionStorage` 기반 클라이언트 측 제한 (브라우저 세션당 N회)
- 본격 런칭 전엔 반드시 필요

### 공유 기능 (MVP의 바이럴 엔진)
- 결과 카드 이미지 생성 (`html2canvas` 또는 `Satori`)
- 카카오톡 공유 SDK 연동 (Kakao JS SDK)
- 링크 복사, 인스타그램 스토리 최적화
- 결과를 shareable URL로 만들지 여부 결정 (프라이버시 원칙상 전체 대화는 공유 불가, AI 결과만 공유 가능)

### 프롬프트 품질 개선
- 현재는 한 번에 모든 걸 뽑으려다 보니 온도·역학·총평 기준이 조금 가벼움
- 샘플 예시를 프롬프트에 몇 개 넣어서 few-shot으로 품질 올리는 것도 고려
- 2인 vs 3인 이상 단체 채팅 구분해서 프롬프트 분기

### 2일차 미처리 계속 이월
- 한국어 조사 스트립 (`상의` vs `상의만`)
- 유니코드 이모지 필터링
- 단체 채팅방 UI 대응

## 4일차 시작 지점
**에러 메시지 정리 + 공유 기능 구현**이 핵심:
1. 엔드포인트 에러 메시지를 사용자 친화적으로 다시 변경 (디버깅 모드 해제)
2. 결과 카드 컴포넌트 `src/lib/components/ResultCard.svelte` 작성 — AI 결과 + 핵심 통계를 예쁜 카드 레이아웃에 담기
3. `html2canvas`로 카드 → 이미지 변환
4. Kakao JS SDK로 카카오톡 공유 버튼 구현 (`src/lib/components/ShareButtons.svelte`)
5. 링크 복사, 다운로드 버튼

여유 있으면 rate limiting도 같이 붙이는 게 좋음 — 공유가 터지면 쿼터 소진 위험이 현실이 됨.
