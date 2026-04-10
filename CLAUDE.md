# TokSim (톡심) - 카카오톡 대화 분석 AI 웹서비스

## 프로젝트 개요
카카오톡 대화를 붙여넣으면 AI가 말투, 성격, 관계 역학을 분석해주는 웹 서비스.
설치 없이 웹에서 바로 사용 가능하며, 예쁜 결과 카드를 SNS로 공유할 수 있다.

## 기술 스택
- **프레임워크**: SvelteKit (Svelte 5, Runes 모드)
- **배포**: Cloudflare Pages (`@sveltejs/adapter-cloudflare`)
- **AI API**: Google Gemini Flash (무료 티어, 하루 250건)
- **결과 이미지**: html2canvas 또는 Satori
- **공유**: Kakao SDK (카카오톡 공유)
- **수익화**: Google AdSense

## 핵심 원칙
- **비용 최소화**: AI API 호출을 줄이기 위해 기본 통계는 프론트엔드 JS에서 처리
- **프라이버시**: 대화 데이터를 서버에 저장하지 않음. 분석 후 즉시 폐기
- **모바일 퍼스트**: 주 타겟이 모바일 사용자 (카톡 대화 복사 → 붙여넣기)
- **바이럴 설계**: 결과를 공유하고 싶어지는 UX/UI

## 프로젝트 구조
```
src/
├── routes/
│   ├── +page.svelte              # 랜딩 페이지 (대화 입력)
│   ├── result/
│   │   └── +page.svelte          # 결과 페이지
│   └── api/
│       └── analyze/
│           └── +server.ts        # Gemini API 호출 (서버 엔드포인트)
├── lib/
│   ├── parser/
│   │   └── kakao.ts              # 카카오톡 대화 파싱 (텍스트 → 구조화 데이터)
│   ├── analyzer/
│   │   └── statistics.ts         # 프론트엔드 통계 분석 (AI 호출 없이)
│   ├── components/
│   │   ├── ResultCard.svelte     # 공유용 결과 카드 컴포넌트
│   │   └── ShareButtons.svelte   # 카카오/인스타 공유 버튼
│   └── types/
│       └── index.ts              # TypeScript 타입 정의
└── app.html
```

## 카카오톡 대화 포맷
PC 카카오톡에서 Ctrl+S로 내보낸 txt 파일 또는 모바일에서 복사한 텍스트를 파싱한다.
일반적인 포맷:
```
2024년 1월 15일 오후 3:42, 홍길동 : 안녕하세요
2024년 1월 15일 오후 3:43, 김철수 : 네 안녕하세요!
```

## 개발 명령어
```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 후 프리뷰
npx wrangler pages deploy .svelte-kit/cloudflare   # Cloudflare 배포
```

## 환경 변수
```
GEMINI_API_KEY=       # Google Gemini API 키 (Cloudflare Pages 환경변수로 설정)
```

## 작업 기록 규칙
- 매 개발 일차 종료 시 `worklog/dayNN.md` 파일을 작성한다 (예: `worklog/day01.md`).
- 포함할 섹션: **목표 / 완료한 작업(파일별) / 발견+수정한 버그 / 검증 결과 / 커밋 히스토리 / 미처리 과제 / 다음 날 시작 지점**.
- 파일 참조는 상대 경로 markdown 링크로 작성한다 (`[kakao.ts](../src/lib/parser/kakao.ts)`).
- `CLAUDE.md` / `PLAN.md`는 매일 갱신하지 않는다 — 구조나 방향이 바뀔 때만 수정.
- 작업일지는 **별도 커밋**으로 push하여 개발 커밋과 분리한다.
- 새 세션을 시작할 때는 가장 최근 `worklog/dayNN.md`를 먼저 읽고 맥락을 파악한다.

## 배포
- `main` 브랜치에 push하면 Cloudflare Pages가 자동으로 빌드 + 배포한다.
- 프로덕션 URL: https://toksim.pages.dev
- Cloudflare Pages 프로젝트명: `toksim`
