# TokSim Phase 1: 바이럴 엔진 Spec

## 목표

카카오톡 대화 분석 결과를 공유하고 싶은 이미지 카드로 만들어 바이럴 루프를 구축한다.
수익 목표: AdSense로 첫 수익 경험. 월 ₩100,000 이하 OK.

## 범위

### In scope
- 네온 다크 테마 (전체 사이트)
- 결과 이미지 카드 (9:16, DUO 3장 / GROUP 3장)
- html2canvas → PNG 다운로드 + 워터마크
- 그룹채팅 기본 통계 + AI 분석
- 대화 분량 제한 (30~5,000건)
- AdSense 영역 (승인 전 빈 영역)
- SEO 메타태그 + OG 이미지
- vitest + 파서/통계 테스트 ~15개
- 버그 수정: kakao.ts:60 날짜 day-1

### NOT in scope
- 멀티 메신저 파서 (WhatsApp, Telegram, Discord)
- i18n (영어) / 글로벌 시장
- 구독/결제 (Stripe, PayPal)
- PDF 리포트 / 시계열 비교
- Reply Simulator (Phase 2)
- KV Rate Limiting (Gemini 429로 대체)
- E2E 테스트 (단위 테스트만)
- 관계맵 시각화 (Phase 2)

## 아키텍처

```
[Landing +page.svelte]
   │ paste/upload
   ▼
[kakao.ts] parseKakaoChat(raw) → ChatData
   │
   ├── participants >= 3 → GROUP
   └── participants <= 2 → DUO
   │
   ├── analyzeStatistics(chatData) → Statistics
   ├── sampleMessages(chatData)    → SampledMessage[] (각 200자 제한)
   │
   ▼ sessionStorage 저장 (~50KB):
   { statistics, samples, mode: 'duo'|'group' }
   │
   ▼
[result/+page.svelte]
   ├── [상단] CardCarousel (ResultCard × 3)
   │     └── DownloadButton (html2canvas → PNG)
   ├── [중단] AI 분석 → /api/analyze (30초 타임아웃)
   ├── [하단] 상세 통계
   └── [최하단] AdBanner + 푸터
```

## 컴포넌트 명세

### ResultCard.svelte
- Props: `type: 'summary'|'personality'|'relationship'|'chatking'|'participation'`, `data: CardData`
- 크기: 1080 × 1920 px (9:16)
- 배경: linear-gradient(135deg, #0a0a0a, #1a1a2e)
- 포인트: #a855f7 (퍼플), #ec4899 (핑크), #3b82f6 (블루)
- 폰트: Pretendard (한글), Inter (영문/숫자)
- 워터마크: 하단 중앙, "toksim.pages.dev", #ffffff80
- 큰 숫자 강조: font-size 3rem+, font-weight 800, 네온 컬러 그라데이션 텍스트

### CardCarousel.svelte
- Props: `cards: CardData[]`
- 수평 스크롤 스냅 (CSS scroll-snap)
- 모바일: 스와이프. 데스크톱: 좌우 화살표
- 하단에 도트 인디케이터

### DownloadButton.svelte
- Props: `targetRef: HTMLElement`, `filename: string`
- html2canvas로 타겟 요소 캡처 → a.download로 PNG 저장
- `document.fonts.ready` 대기 후 캡처
- 실패 시: "스크린샷으로 저장해주세요 📸" 안내 표시
- 로딩 상태: 버튼에 스피너

### AdBanner.svelte
- AdSense 스크립트 삽입 래퍼
- 승인 전: `min-height: 90px` 빈 div (레이아웃 시프트 방지)
- 승인 후: `<ins class="adsbygoogle">` + 스크립트

## 결과 카드 내용

### DUO 모드 (1:1 대화)

**카드 1 - 요약:**
- 대화 온도 (0~100) 큰 숫자 + 온도계 바
- AI 한 줄 총평 (자극적/재미있는 톤)
- 총 메시지 수, 대화 기간

**카드 2 - 말투/성격:**
- 참여자 A vs B 나란히 비교
- 각자 말투 유형 배지 ("리액션형", "츤데레형" 등)
- 성격 키워드 3개 (#솔직한 #유머러스 #다정한)

**카드 3 - 관계 역학:**
- 관계 역학 한 줄 ("A 주도 / B 반응형")
- 핵심 수치: 먼저 연락 비율, 평균 답장 속도 비교

### GROUP 모드 (3명+)

**카드 1 - 요약:**
- 그룹 분위기 ("웃음 가득 단톡방" 등)
- AI 한 줄 총평
- 총 메시지 수, 참여자 수, 대화 기간

**카드 2 - 채팅왕:**
- 메시지 수 1등 (이름 + 메시지 수 큰 숫자)
- 대화 시작왕 (가장 많이 먼저 말 건 사람)

**카드 3 - 참여도:**
- 전체 참여자 메시지 비율 수평 바 차트
- 각 참여자 이름 + 비율(%)

## 그룹채팅 통계 확장

### statistics.ts 추가 필드
- `tikitaka: Map<string, Map<string, number>>` - A→B 연속 발화 횟수
- `hourlyKing: string[]` (24개) - 시간대별 최다 메시지 참여자

### types/index.ts 확장
```typescript
export interface AIAnalysis {
  participants: ParticipantPersona[];
  conversationTemperature: number;  // duo only
  relationshipDynamic: string;       // duo only
  oneLineSummary: string;
  groupMood?: string;                // group only
  mvp?: string;                      // group only (채팅왕 이름)
}

export interface Statistics {
  // 기존 필드 유지
  mode: 'duo' | 'group';
  tikitaka?: { from: string; to: string; count: number }[];  // group only
  hourlyKing?: string[];  // group only (24개)
}
```

### AI 프롬프트 분기

`buildPrompt(stats, samples, mode)`:
- duo: 기존 프롬프트 (대화 온도, 관계 역학, 썸 판정)
- group: 그룹 분위기, 채팅왕 선정 이유, 한 줄 총평 요청
  - 응답 스키마에 `groupMood`, `mvp` 포함
  - `conversationTemperature`, `relationshipDynamic` 생략

## 네온 다크 테마

### CSS 변수 (app.css)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a2e;
  --bg-card: #16162a;
  --bg-input: #1e1e3a;
  --neon-purple: #a855f7;
  --neon-pink: #ec4899;
  --neon-blue: #3b82f6;
  --text-primary: #e5e5e5;
  --text-secondary: #a0a0b0;
  --text-muted: #666680;
  --border: #2a2a4a;
}
```

### 적용 범위
- 전체 사이트 (랜딩 + 결과 + 카드)
- 기존 #fee500 (카카오 노랑) → 네온 퍼플/핑크로 대체
- 기존 #f8f8f8 (밝은 카드 배경) → #16162a로 대체
- 기존 #333 (텍스트) → #e5e5e5로 대체

## 에러 처리

| 상황 | 처리 | 사용자 메시지 |
|------|------|-------------|
| sessionStorage 저장 실패 | 통계+샘플만 저장. 그래도 실패 시 에러 | "데이터를 저장할 수 없습니다" |
| Gemini 전체 429 | 기존 폴백 체인 유지 | "오늘 분석이 마감되었습니다. 내일 다시 이용해주세요" |
| Gemini 30초 타임아웃 | AbortController + signal | "분석 시간이 초과되었습니다. 다시 시도해주세요" |
| html2canvas 실패 | try/catch | "스크린샷으로 저장해주세요 📸" |
| 대화 30건 미만 | 파싱 후 체크 | "대화가 너무 짧아서 분석할 수 없어요 (최소 30건)" |
| 대화 5,000건 초과 | 최근 5,000건 사용 | "최근 대화 5,000건으로 분석했어요" |
| 샘플 메시지 200자 초과 | 잘라내기 | (사용자 비노출) |

## AdSense

- `app.html`에 AdSense 스크립트 태그 추가 (승인 후 활성화)
- 결과 페이지 AI 섹션과 상세 통계 사이에 AdBanner 배치
- 승인 전: 빈 영역 유지 (min-height로 레이아웃 시프트 방지)
- 승인 조건: 충분한 콘텐츠 + 트래픽. 런칭 후 2~4주 내 신청.

## SEO

- OG 태그: title, description, image, url, type
- `og:image`: static/og-image.png (1200×630, 네온 다크 디자인, 서비스명 + 한줄 설명)
- robots.txt: 기본 허용
- sitemap.xml: 정적 (/ 만)

## 테스트

### 프레임워크
vitest (SvelteKit 기본 호환)

### 테스트 파일
```
tests/
  ├── parser/
  │   ├── kakao.test.ts
  │   │   ├── PC 포맷 파싱 (정상)
  │   │   ├── 모바일 포맷 파싱 (정상)
  │   │   ├── 날짜 헤더 없는 대화 (fallback 날짜)
  │   │   ├── 시스템 메시지 스킵
  │   │   ├── 멀티라인 메시지
  │   │   ├── 미디어 타입 감지 (photo/video/emoticon/voice/file/deleted)
  │   │   ├── 빈 입력
  │   │   ├── 오전/오후 12시 경계
  │   │   ├── 날짜 day-1 버그 수정 확인
  │   │   └── 그룹채팅 (3명+) 참여자 감지
  │   └── fixtures/
  │       ├── pc-duo.txt
  │       ├── mobile-duo.txt
  │       ├── pc-group.txt
  │       └── no-header.txt
  └── analyzer/
      └── statistics.test.ts
          ├── 참여자별 메시지 수/비율
          ├── 시간대/요일 분포
          ├── 단어 빈도 (stopwords 필터링)
          ├── 답장 속도 계산
          └── 그룹채팅 티키타카 계산
```

## 버그 수정

### kakao.ts:60 날짜 day-1
```
Before: parseInt(m[3], 10) - 1
After:  parseInt(m[3], 10)
```
JavaScript Date의 day 파라미터는 1-based. month만 0-based.

## 배포

- Cloudflare Pages 자동 배포 (main push)
- 프로덕션 URL: https://toksim.pages.dev
- KV 바인딩 불필요 (Rate limiting 제거)
- 환경변수: GEMINI_API_KEY (기존)

## 구현 순서

### Lane A (독립)
1. vitest 설정 + 파서/통계 테스트

### Lane B (순차)
2. 네온 다크 테마 (app.css + 전체 페이지)
3. 결과 이미지 카드 컴포넌트 + html2canvas + 다운로드
4. AdSense 영역 + SEO + OG 이미지

### Lane C (순차)
5. 그룹채팅 통계 확장 (statistics.ts + types)
6. AI 그룹 프롬프트 + 30초 타임아웃 + 429 메시지 개선

### 실행
A + B + C 병렬 시작. 각 lane 내부는 순차. 모두 완료 후 모바일 최종 QA.
