# TokSim Phase 1: 바이럴 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오톡 대화 분석 결과를 공유하고 싶은 네온 다크 이미지 카드로 만들어 바이럴 루프를 구축한다.

**Architecture:** 기존 SvelteKit 앱에 네온 다크 테마, 결과 이미지 카드(html2canvas), 그룹채팅 지원을 추가. sessionStorage에 통계+샘플만 저장하여 크기 제한 해결. Gemini 429를 rate limit으로 활용.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Cloudflare Pages, Gemini Flash API, html2canvas, vitest

**Spec:** `docs/superpowers/specs/2026-05-18-viral-engine-design.md`

---

## File Structure

### New files
| File | Purpose |
|------|---------|
| `src/lib/components/ResultCard.svelte` | 9:16 공유 카드 (네온 다크) |
| `src/lib/components/CardCarousel.svelte` | 수평 스크롤 카드 컨테이너 |
| `src/lib/components/DownloadButton.svelte` | html2canvas → PNG 다운로드 |
| `src/lib/components/AdBanner.svelte` | AdSense 래퍼 |
| `src/app.css` | 글로벌 CSS 변수 (네온 다크 테마) |
| `tests/parser/kakao.test.ts` | 파서 단위 테스트 |
| `tests/parser/fixtures/pc-duo.txt` | PC 포맷 테스트 데이터 |
| `tests/parser/fixtures/mobile-duo.txt` | 모바일 포맷 테스트 데이터 |
| `tests/parser/fixtures/pc-group.txt` | 그룹채팅 테스트 데이터 |
| `tests/parser/fixtures/no-header.txt` | 날짜헤더 없는 테스트 데이터 |
| `tests/analyzer/statistics.test.ts` | 통계 단위 테스트 |
| `vitest.config.ts` | vitest 설정 |
| `static/og-image.png` | OG 이미지 (1200×630) |
| `static/sitemap.xml` | 사이트맵 |
| `static/robots.txt` | robots.txt |

### Modified files
| File | Changes |
|------|---------|
| `src/lib/types/index.ts` | mode 필드, 그룹 통계 타입, AIAnalysis 확장 |
| `src/lib/parser/kakao.ts` | line 60 날짜 버그 수정 |
| `src/lib/analyzer/statistics.ts` | 그룹채팅 통계 (티키타카, hourlyKing) |
| `src/lib/analyzer/sampler.ts` | 메시지 200자 제한 |
| `src/routes/+page.svelte` | 테마 + sessionStorage 변경 + 분량 제한 |
| `src/routes/result/+page.svelte` | 테마 + 카드 캐러셀 + AdBanner |
| `src/routes/+layout.svelte` | 글로벌 CSS import + 폰트 |
| `src/routes/api/analyze/+server.ts` | 그룹 프롬프트 + 타임아웃 + 429 메시지 |
| `src/app.html` | 폰트 프리로드 + AdSense 스크립트 영역 |
| `package.json` | vitest + html2canvas 의존성 |

---

## Lane A: 테스트 인프라

### Task 1: vitest 설정

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: vitest + 관련 패키지 설치**

```bash
npm install -D vitest @sveltejs/vite-plugin-svelte
```

- [ ] **Step 2: vitest.config.ts 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		alias: {
			$lib: resolve('./src/lib')
		}
	}
});
```

- [ ] **Step 3: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 섹션에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 빈 테스트로 vitest 동작 확인**

```bash
npx vitest run
```
Expected: 0 tests found (에러 없이 종료)

- [ ] **Step 5: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

### Task 2: 파서 테스트 데이터 + 기본 테스트

**Files:**
- Create: `tests/parser/fixtures/pc-duo.txt`
- Create: `tests/parser/fixtures/mobile-duo.txt`
- Create: `tests/parser/fixtures/pc-group.txt`
- Create: `tests/parser/fixtures/no-header.txt`
- Create: `tests/parser/kakao.test.ts`

- [ ] **Step 1: PC 포맷 1:1 테스트 데이터 작성**

```
// tests/parser/fixtures/pc-duo.txt
--------------- 2024년 1월 15일 월요일 ---------------
[홍길동] [오후 3:42] 안녕하세요
[김철수] [오후 3:43] 네 반가워요!
[홍길동] [오후 3:44] 오늘 날씨 좋네요
[김철수] [오후 3:45] 사진
[홍길동] [오후 3:46] 이모티콘
[김철수] [오후 3:47] 동영상
[홍길동] [오후 3:48] 음성메시지
[김철수] [오후 3:49] 삭제된 메시지입니다.
[홍길동] [오후 3:50] 여러 줄
메시지입니다
```

- [ ] **Step 2: 모바일 포맷 1:1 테스트 데이터 작성**

```
// tests/parser/fixtures/mobile-duo.txt
2024년 1월 15일 오후 3:42, 홍길동 : 안녕하세요
2024년 1월 15일 오후 3:43, 김철수 : 네 반가워요!
2024년 1월 15일 오후 3:44, 홍길동 : 오늘 날씨 좋네요
```

- [ ] **Step 3: 그룹채팅 테스트 데이터 작성**

```
// tests/parser/fixtures/pc-group.txt
--------------- 2024년 1월 15일 월요일 ---------------
[홍길동] [오후 3:42] 안녕하세요
[김철수] [오후 3:43] 네!
[이영희] [오후 3:44] 반가워요
[홍길동] [오후 3:45] 오늘 뭐해요?
[김철수] [오후 3:46] 공부요
[이영희] [오후 3:47] 저도요
[홍길동] [오후 3:48] 열공!
[김철수] [오후 3:49] 화이팅
```

- [ ] **Step 4: 날짜 헤더 없는 테스트 데이터 작성**

```
// tests/parser/fixtures/no-header.txt
[홍길동] [오후 3:42] 안녕하세요
[김철수] [오후 3:43] 네 반가워요!
```

- [ ] **Step 5: 파서 기본 테스트 작성**

```typescript
// tests/parser/kakao.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseKakaoChat } from '$lib/parser/kakao';

function fixture(name: string): string {
	return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8');
}

describe('parseKakaoChat', () => {
	it('빈 입력 시 에러 반환', () => {
		const result = parseKakaoChat('');
		expect(result.success).toBe(false);
		expect(result.error).toContain('비어있습니다');
	});

	it('PC 포맷 1:1 대화 파싱', () => {
		const result = parseKakaoChat(fixture('pc-duo.txt'));
		expect(result.success).toBe(true);
		expect(result.data!.participants).toHaveLength(2);
		expect(result.data!.messages.length).toBeGreaterThanOrEqual(8);
	});

	it('모바일 포맷 파싱', () => {
		const result = parseKakaoChat(fixture('mobile-duo.txt'));
		expect(result.success).toBe(true);
		expect(result.data!.participants).toHaveLength(2);
		expect(result.data!.messages).toHaveLength(3);
	});

	it('그룹채팅 참여자 3명 이상 감지', () => {
		const result = parseKakaoChat(fixture('pc-group.txt'));
		expect(result.success).toBe(true);
		expect(result.data!.participants.length).toBeGreaterThanOrEqual(3);
	});

	it('날짜 헤더 없는 대화 파싱 (오늘 날짜 사용)', () => {
		const result = parseKakaoChat(fixture('no-header.txt'));
		expect(result.success).toBe(true);
		expect(result.data!.messages).toHaveLength(2);
	});

	it('미디어 타입 감지', () => {
		const result = parseKakaoChat(fixture('pc-duo.txt'));
		const types = result.data!.messages.map((m) => m.type);
		expect(types).toContain('photo');
		expect(types).toContain('emoticon');
		expect(types).toContain('video');
		expect(types).toContain('voice');
		expect(types).toContain('deleted');
	});

	it('멀티라인 메시지 처리', () => {
		const result = parseKakaoChat(fixture('pc-duo.txt'));
		const multiline = result.data!.messages.find((m) => m.content.includes('\n'));
		expect(multiline).toBeDefined();
		expect(multiline!.content).toContain('여러 줄');
		expect(multiline!.content).toContain('메시지입니다');
	});

	it('시스템 메시지 스킵', () => {
		const raw = `--------------- 2024년 1월 15일 월요일 ---------------
홍길동님이 들어왔습니다.
[홍길동] [오후 3:42] 안녕`;
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);
		expect(result.data!.messages).toHaveLength(1);
	});

	it('오전 12시 = 0시, 오후 12시 = 12시', () => {
		const raw = `--------------- 2024년 1월 15일 월요일 ---------------
[홍길동] [오전 12:05] 자정 메시지
[김철수] [오후 12:05] 정오 메시지`;
		const result = parseKakaoChat(raw);
		expect(result.data!.messages[0].timestamp.getHours()).toBe(0);
		expect(result.data!.messages[1].timestamp.getHours()).toBe(12);
	});

	it('날짜 헤더의 day가 정확하게 파싱됨 (day-1 버그 수정 확인)', () => {
		const raw = `--------------- 2024년 1월 15일 월요일 ---------------
[홍길동] [오후 3:42] 테스트`;
		const result = parseKakaoChat(raw);
		expect(result.data!.messages[0].timestamp.getDate()).toBe(15);
	});
});
```

- [ ] **Step 6: 테스트 실행**

```bash
npx vitest run tests/parser/kakao.test.ts
```
Expected: 1 FAIL (날짜 day-1 버그 때문에 마지막 테스트 실패)

- [ ] **Step 7: 커밋 (테스트만)**

```bash
git add tests/
git commit -m "test: add KakaoTalk parser unit tests with fixtures"
```

---

### Task 3: kakao.ts 날짜 버그 수정

**Files:**
- Modify: `src/lib/parser/kakao.ts:60`

- [ ] **Step 1: 버그 수정**

`src/lib/parser/kakao.ts` line 60:
```
Before: parseInt(m[3], 10) - 1
After:  parseInt(m[3], 10)
```

- [ ] **Step 2: 테스트 재실행**

```bash
npx vitest run tests/parser/kakao.test.ts
```
Expected: ALL PASS

- [ ] **Step 3: 커밋**

```bash
git add src/lib/parser/kakao.ts
git commit -m "fix: correct date header day parsing (day is 1-based, not 0-based)"
```

---

### Task 4: 통계 테스트

**Files:**
- Create: `tests/analyzer/statistics.test.ts`

- [ ] **Step 1: 통계 테스트 작성**

```typescript
// tests/analyzer/statistics.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeStatistics } from '$lib/analyzer/statistics';
import type { ChatData, Message } from '$lib/types';

function makeMsg(sender: string, content: string, hour: number, day: number = 15): Message {
	return {
		timestamp: new Date(2024, 0, day, hour, 0),
		sender,
		content,
		type: 'text'
	};
}

function makeChatData(messages: Message[]): ChatData {
	const senders = new Map<string, number>();
	for (const m of messages) {
		senders.set(m.sender, (senders.get(m.sender) ?? 0) + 1);
	}
	return {
		messages,
		participants: Array.from(senders.entries()).map(([name, messageCount]) => ({ name, messageCount })),
		startDate: messages[0].timestamp,
		endDate: messages[messages.length - 1].timestamp
	};
}

describe('analyzeStatistics', () => {
	it('참여자별 메시지 수 계산', () => {
		const data = makeChatData([
			makeMsg('A', '안녕', 10),
			makeMsg('A', '반가워', 10),
			makeMsg('B', '네', 10),
		]);
		const stats = analyzeStatistics(data);
		const a = stats.participants.find((p) => p.name === 'A')!;
		const b = stats.participants.find((p) => p.name === 'B')!;
		expect(a.messageCount).toBe(2);
		expect(b.messageCount).toBe(1);
		expect(a.messageRatio).toBeCloseTo(2 / 3);
	});

	it('시간대별 분포 계산', () => {
		const data = makeChatData([
			makeMsg('A', '아침', 9),
			makeMsg('A', '점심', 12),
			makeMsg('A', '저녁', 21),
		]);
		const stats = analyzeStatistics(data);
		expect(stats.hourlyDistribution[9]).toBe(1);
		expect(stats.hourlyDistribution[12]).toBe(1);
		expect(stats.hourlyDistribution[21]).toBe(1);
		expect(stats.hourlyDistribution[0]).toBe(0);
	});

	it('단어 빈도에서 stopwords 필터링', () => {
		const data = makeChatData([
			makeMsg('A', '진짜 맛있다 진짜 좋다 맛있다', 10),
		]);
		const stats = analyzeStatistics(data);
		const words = stats.topWords.map((w) => w.word);
		expect(words).toContain('맛있다');
		expect(words).not.toContain('진짜');
	});

	it('ㅋㅎㅠ 카운트', () => {
		const data = makeChatData([
			makeMsg('A', 'ㅋㅋㅋ 웃기다 ㅎㅎ', 10),
			makeMsg('B', 'ㅠㅠ 슬프다', 10),
		]);
		const stats = analyzeStatistics(data);
		const a = stats.participants.find((p) => p.name === 'A')!;
		const b = stats.participants.find((p) => p.name === 'B')!;
		expect(a.kCount).toBe(3);
		expect(a.hCount).toBe(2);
		expect(b.tearCount).toBe(2);
	});
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run tests/analyzer/statistics.test.ts
```
Expected: ALL PASS

- [ ] **Step 3: 커밋**

```bash
git add tests/analyzer/
git commit -m "test: add statistics analyzer unit tests"
```

---

## Lane B: 네온 다크 테마 + 결과 카드

### Task 5: 글로벌 CSS 변수 + 폰트 설정

**Files:**
- Create: `src/app.css`
- Modify: `src/app.html`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: app.css 작성 (CSS 변수)**

```css
/* src/app.css */
:root {
	--bg-primary: #0a0a0a;
	--bg-secondary: #1a1a2e;
	--bg-card: #16162a;
	--bg-input: #1e1e3a;
	--neon-purple: #a855f7;
	--neon-pink: #ec4899;
	--neon-blue: #3b82f6;
	--neon-gradient: linear-gradient(135deg, #a855f7, #ec4899);
	--text-primary: #e5e5e5;
	--text-secondary: #a0a0b0;
	--text-muted: #666680;
	--border: #2a2a4a;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	background: var(--bg-primary);
	color: var(--text-primary);
	font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
}
```

- [ ] **Step 2: app.html에 Pretendard 폰트 프리로드 추가**

`src/app.html`의 `<head>` 안에 추가:
```html
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```

- [ ] **Step 3: +layout.svelte에 app.css import**

`src/routes/+layout.svelte` 상단에 추가:
```svelte
<script>
	import '../app.css';
	let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 4: 로컬에서 확인**

```bash
npm run dev
```
브라우저에서 배경이 #0a0a0a(검정)이고 텍스트가 #e5e5e5(밝은 회색)인지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/app.css src/app.html src/routes/+layout.svelte
git commit -m "feat: add neon dark theme CSS variables and Pretendard font"
```

---

### Task 6: 랜딩 페이지 네온 다크 적용

**Files:**
- Modify: `src/routes/+page.svelte` (전체 `<style>` 섹션)

- [ ] **Step 1: +page.svelte의 scoped CSS를 네온 다크로 변경**

기존 밝은 테마 컬러를 CSS 변수로 교체. 주요 변경:
- `background: #fee` → `background: rgba(236, 72, 153, 0.1)` (에러 배경)
- `color: #333` → `color: var(--text-primary)` 
- `border: 2px solid #ddd` → `border: 2px solid var(--border)`
- `.analyze-btn` background: `#fee500` → `var(--neon-gradient)` + `color: white`
- `.help` background: `#f8f8f8` → `var(--bg-card)`
- `.tab.active` border-bottom: `#fee500` → `var(--neon-purple)`
- `.callout` border-left: `#fee500` → `var(--neon-pink)`
- `h1` color: `#fee500` → neon gradient text (`background: var(--neon-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent`)
- `.file-btn` border: `#fee500` → `var(--neon-purple)`

모든 `font-family` 선언 제거 (app.css에서 body에 설정됨).

- [ ] **Step 2: 로컬 확인**

```bash
npm run dev
```
랜딩 페이지가 네온 다크 테마로 표시되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: apply neon dark theme to landing page"
```

---

### Task 7: sessionStorage 저장 방식 변경 + 분량 제한

**Files:**
- Modify: `src/routes/+page.svelte:53-73`
- Modify: `src/routes/result/+page.svelte:17-69`

- [ ] **Step 1: +page.svelte의 handleAnalyze 수정**

`src/routes/+page.svelte`의 `handleAnalyze()` 함수 (line 53-73)를 수정:

```typescript
import { analyzeStatistics } from '$lib/analyzer/statistics';
import { sampleMessages } from '$lib/analyzer/sampler';
```
(상단 import에 추가)

`handleAnalyze` 함수 내부 (line 58 이후):
```typescript
function handleAnalyze() {
	if (!rawText.trim() || isProcessing) return;
	isProcessing = true;
	errorMsg = null;

	const result = parseKakaoChat(rawText);
	if (!result.success || !result.data) {
		errorMsg = result.error ?? '파싱에 실패했습니다.';
		isProcessing = false;
		return;
	}

	const msgCount = result.data.messages.length;
	if (msgCount < 30) {
		errorMsg = '대화가 너무 짧아서 분석할 수 없어요 (최소 30건)';
		isProcessing = false;
		return;
	}

	if (msgCount > 5000) {
		result.data.messages = result.data.messages.slice(-5000);
	}

	const mode = result.data.participants.length >= 3 ? 'group' : 'duo';
	const stats = analyzeStatistics(result.data);
	const samples = sampleMessages(result.data);

	try {
		const toStore = JSON.stringify({
			statistics: stats,
			sampleMessages: samples,
			mode,
			truncated: msgCount > 5000 ? msgCount : null
		});
		sessionStorage.setItem('toksim:result', toStore);
		goto('/result');
	} catch (e) {
		errorMsg = '데이터를 저장할 수 없습니다. 대화량을 줄여보세요.';
		console.error(e);
		isProcessing = false;
	}
}
```

- [ ] **Step 2: result/+page.svelte의 onMount 수정**

sessionStorage 키 변경 + 데이터 구조 변경:

```typescript
onMount(() => {
	try {
		const stored = sessionStorage.getItem('toksim:result');
		if (!stored) {
			error = '분석할 대화 데이터가 없습니다.';
			return;
		}
		const parsed = JSON.parse(stored);
		stats = parsed.statistics;
		mode = parsed.mode;
		truncated = parsed.truncated;

		// Date 복원 (JSON 직렬화로 문자열이 됨)
		if (stats) {
			stats.startDate = new Date(stats.startDate);
			stats.endDate = new Date(stats.endDate);
		}

		if (stats) {
			runAIAnalysis(stats, parsed.sampleMessages, mode);
		}
	} catch (e) {
		error = '데이터를 불러오는 중 오류가 발생했습니다.';
		console.error(e);
	}
});
```

result/+page.svelte 상단에 state 추가:
```typescript
let mode = $state<'duo' | 'group'>('duo');
let truncated = $state<number | null>(null);
```

`reviveChatData` 함수와 `chatDataRef` state 제거 (더 이상 불필요).

- [ ] **Step 3: sampler.ts에 200자 제한 추가**

`src/lib/analyzer/sampler.ts`의 `toSample` 함수 수정:
```typescript
function toSample(m: Message): SampledMessage {
	return {
		sender: m.sender,
		content: m.content.slice(0, 200),
		timestamp: m.timestamp.toISOString()
	};
}
```

- [ ] **Step 4: 테스트 + 로컬 확인**

```bash
npx vitest run
npm run dev
```
기존 플로우(붙여넣기 → 분석 → 결과)가 정상 동작하는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/routes/+page.svelte src/routes/result/+page.svelte src/lib/analyzer/sampler.ts
git commit -m "feat: store only stats+samples in sessionStorage, add message limits"
```

---

### Task 8: ResultCard 컴포넌트

**Files:**
- Create: `src/lib/components/ResultCard.svelte`

- [ ] **Step 1: ResultCard 컴포넌트 작성**

```svelte
<!-- src/lib/components/ResultCard.svelte -->
<script lang="ts">
	import type { Statistics, AIAnalysis } from '$lib/types';

	type CardType = 'summary' | 'personality' | 'relationship' | 'chatking' | 'participation';

	let {
		type,
		stats,
		aiAnalysis,
		mode
	}: {
		type: CardType;
		stats: Statistics;
		aiAnalysis: AIAnalysis | null;
		mode: 'duo' | 'group';
	} = $props();

	function formatDate(d: Date): string {
		return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function pct(ratio: number): string {
		return `${(ratio * 100).toFixed(1)}%`;
	}

	function temperatureColor(t: number): string {
		if (t >= 80) return '#ec4899';
		if (t >= 60) return '#a855f7';
		if (t >= 40) return '#3b82f6';
		return '#666680';
	}
</script>

<div class="card" data-type={type}>
	<div class="card-inner">
		{#if type === 'summary' && mode === 'duo' && aiAnalysis}
			<p class="card-label">대화 분석</p>
			<p class="big-number" style="color: {temperatureColor(aiAnalysis.conversationTemperature)}">
				{aiAnalysis.conversationTemperature}°
			</p>
			<p class="card-sublabel">대화 온도</p>
			<div class="temp-bar-wrap">
				<div class="temp-bar-fill" style="width: {aiAnalysis.conversationTemperature}%; background: {temperatureColor(aiAnalysis.conversationTemperature)};"></div>
			</div>
			<p class="one-liner">"{aiAnalysis.oneLineSummary}"</p>
			<p class="meta">{stats.totalMessages.toLocaleString()}개 메시지 · {stats.totalDays}일</p>

		{:else if type === 'summary' && mode === 'group' && aiAnalysis}
			<p class="card-label">그룹 분석</p>
			<p class="group-mood">{aiAnalysis.groupMood ?? '활발한 단톡방'}</p>
			<p class="one-liner">"{aiAnalysis.oneLineSummary}"</p>
			<p class="meta">{stats.participants.length}명 · {stats.totalMessages.toLocaleString()}개 메시지 · {stats.totalDays}일</p>

		{:else if type === 'personality' && aiAnalysis}
			<p class="card-label">말투 & 성격</p>
			<div class="persona-grid">
				{#each aiAnalysis.participants as p (p.name)}
					<div class="persona-item">
						<p class="persona-name">{p.name}</p>
						<p class="persona-style">{p.speechStyle}</p>
						<p class="persona-keywords">
							{#each p.personalityKeywords as k}
								<span>#{k}</span>
							{/each}
						</p>
					</div>
				{/each}
			</div>

		{:else if type === 'relationship' && aiAnalysis}
			<p class="card-label">관계 역학</p>
			<p class="relationship-text">{aiAnalysis.relationshipDynamic}</p>
			{#if stats.participants.length >= 2}
				<div class="compare-row">
					<div class="compare-item">
						<p class="compare-name">{stats.participants[0].name}</p>
						<p class="compare-value">{stats.participants[0].conversationStarts}회</p>
						<p class="compare-label">먼저 연락</p>
					</div>
					<div class="compare-vs">VS</div>
					<div class="compare-item">
						<p class="compare-name">{stats.participants[1].name}</p>
						<p class="compare-value">{stats.participants[1].conversationStarts}회</p>
						<p class="compare-label">먼저 연락</p>
					</div>
				</div>
			{/if}

		{:else if type === 'chatking'}
			<p class="card-label">채팅왕</p>
			<p class="big-name">{stats.participants[0].name}</p>
			<p class="big-number">{stats.participants[0].messageCount.toLocaleString()}</p>
			<p class="card-sublabel">메시지</p>

		{:else if type === 'participation'}
			<p class="card-label">참여도</p>
			<div class="participation-bars">
				{#each stats.participants as p (p.name)}
					<div class="p-row">
						<span class="p-name">{p.name}</span>
						<div class="p-bar">
							<div class="p-fill" style="width: {p.messageRatio * 100}%"></div>
						</div>
						<span class="p-pct">{pct(p.messageRatio)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<p class="watermark">toksim.pages.dev</p>
</div>

<style>
	.card {
		width: 1080px;
		height: 1920px;
		background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 80px;
		position: relative;
		overflow: hidden;
		/* 화면에서는 축소 표시 */
		transform-origin: top left;
	}

	.card-inner {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 40px;
		text-align: center;
	}

	.card-label {
		font-size: 36px;
		color: #666680;
		text-transform: uppercase;
		letter-spacing: 4px;
		margin: 0;
	}

	.big-number {
		font-size: 160px;
		font-weight: 800;
		margin: 0;
		line-height: 1;
	}

	.big-name {
		font-size: 72px;
		font-weight: 800;
		color: #a855f7;
		margin: 0;
	}

	.card-sublabel {
		font-size: 32px;
		color: #a0a0b0;
		margin: 0;
	}

	.temp-bar-wrap {
		width: 100%;
		height: 16px;
		background: #2a2a4a;
		border-radius: 8px;
		overflow: hidden;
	}

	.temp-bar-fill {
		height: 100%;
		border-radius: 8px;
	}

	.one-liner {
		font-size: 40px;
		font-weight: 600;
		color: #e5e5e5;
		line-height: 1.4;
		margin: 0;
		padding: 0 20px;
	}

	.meta {
		font-size: 28px;
		color: #666680;
		margin: 0;
	}

	.group-mood {
		font-size: 56px;
		font-weight: 800;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0;
	}

	.persona-grid {
		width: 100%;
		display: flex;
		gap: 40px;
		justify-content: center;
	}

	.persona-item {
		background: #16162a;
		border-radius: 20px;
		padding: 40px;
		flex: 1;
		max-width: 400px;
	}

	.persona-name {
		font-size: 36px;
		font-weight: 700;
		color: #e5e5e5;
		margin: 0 0 12px;
	}

	.persona-style {
		font-size: 32px;
		color: #a855f7;
		font-weight: 600;
		margin: 0 0 20px;
	}

	.persona-keywords {
		font-size: 28px;
		color: #a0a0b0;
		margin: 0;
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.relationship-text {
		font-size: 44px;
		font-weight: 700;
		color: #ec4899;
		margin: 0;
		line-height: 1.3;
	}

	.compare-row {
		display: flex;
		align-items: center;
		gap: 40px;
		width: 100%;
		justify-content: center;
	}

	.compare-item { text-align: center; }
	.compare-name { font-size: 32px; color: #a0a0b0; margin: 0 0 8px; }
	.compare-value { font-size: 56px; font-weight: 800; color: #e5e5e5; margin: 0; }
	.compare-label { font-size: 24px; color: #666680; margin: 4px 0 0; }
	.compare-vs { font-size: 36px; color: #666680; font-weight: 700; }

	.participation-bars {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.p-row {
		display: grid;
		grid-template-columns: 200px 1fr 100px;
		align-items: center;
		gap: 20px;
	}

	.p-name { font-size: 28px; color: #e5e5e5; text-align: left; }
	.p-bar { height: 24px; background: #2a2a4a; border-radius: 12px; overflow: hidden; }
	.p-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #ec4899); border-radius: 12px; }
	.p-pct { font-size: 28px; color: #a0a0b0; text-align: right; }

	.watermark {
		position: absolute;
		bottom: 40px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 24px;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		letter-spacing: 2px;
	}
</style>
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/components/ResultCard.svelte
git commit -m "feat: add ResultCard component (9:16 neon dark share card)"
```

---

### Task 9: DownloadButton 컴포넌트

**Files:**
- Create: `src/lib/components/DownloadButton.svelte`
- Modify: `package.json` (html2canvas 설치)

- [ ] **Step 1: html2canvas 설치**

```bash
npm install html2canvas
```

- [ ] **Step 2: DownloadButton 작성**

```svelte
<!-- src/lib/components/DownloadButton.svelte -->
<script lang="ts">
	import html2canvas from 'html2canvas';

	let {
		targetElement,
		filename = 'toksim-card.png'
	}: {
		targetElement: HTMLElement | null;
		filename?: string;
	} = $props();

	let loading = $state(false);
	let fallback = $state(false);

	async function download() {
		if (!targetElement || loading) return;
		loading = true;
		fallback = false;

		try {
			await document.fonts.ready;
			const canvas = await html2canvas(targetElement, {
				scale: 1,
				useCORS: true,
				backgroundColor: '#0a0a0a',
				width: 1080,
				height: 1920
			});
			const url = canvas.toDataURL('image/png');
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
		} catch (e) {
			console.error('html2canvas failed:', e);
			fallback = true;
		} finally {
			loading = false;
		}
	}
</script>

<button class="dl-btn" onclick={download} disabled={loading || !targetElement}>
	{#if loading}
		<span class="spinner"></span> 생성 중...
	{:else}
		📥 이미지 저장
	{/if}
</button>
{#if fallback}
	<p class="fallback-msg">이미지 생성에 실패했어요. 스크린샷으로 저장해주세요 📸</p>
{/if}

<style>
	.dl-btn {
		padding: 0.6rem 1.2rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.dl-btn:hover:not(:disabled) {
		border-color: var(--neon-purple);
	}
	.dl-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid var(--border);
		border-top-color: var(--neon-purple);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.fallback-msg {
		font-size: 0.8rem;
		color: var(--neon-pink);
		margin: 0.4rem 0 0;
	}
</style>
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/components/DownloadButton.svelte package.json package-lock.json
git commit -m "feat: add DownloadButton with html2canvas PNG generation"
```

---

### Task 10: CardCarousel 컴포넌트

**Files:**
- Create: `src/lib/components/CardCarousel.svelte`

- [ ] **Step 1: CardCarousel 작성**

```svelte
<!-- src/lib/components/CardCarousel.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let scrollContainer = $state<HTMLElement | null>(null);
	let activeIndex = $state(0);
	let cardCount = $state(0);

	function updateIndex() {
		if (!scrollContainer) return;
		const cards = scrollContainer.querySelectorAll('.card-slot');
		cardCount = cards.length;
		const scrollLeft = scrollContainer.scrollLeft;
		const width = scrollContainer.clientWidth;
		activeIndex = Math.round(scrollLeft / width);
	}

	function scrollTo(index: number) {
		if (!scrollContainer) return;
		const width = scrollContainer.clientWidth;
		scrollContainer.scrollTo({ left: index * width, behavior: 'smooth' });
	}
</script>

<div class="carousel">
	<div class="scroll-container" bind:this={scrollContainer} onscroll={updateIndex}>
		{@render children()}
	</div>
	{#if cardCount > 1}
		<div class="dots">
			{#each Array(cardCount) as _, i}
				<button
					class="dot"
					class:active={i === activeIndex}
					onclick={() => scrollTo(i)}
					aria-label="카드 {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel {
		width: 100%;
		margin-bottom: 1.5rem;
	}
	.scroll-container {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		gap: 1rem;
		padding: 0 0 0.5rem;
		scrollbar-width: none;
	}
	.scroll-container::-webkit-scrollbar { display: none; }
	.scroll-container > :global(.card-slot) {
		flex: 0 0 100%;
		scroll-snap-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border);
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.dot.active {
		background: var(--neon-purple);
	}
</style>
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/components/CardCarousel.svelte
git commit -m "feat: add CardCarousel with scroll snap and dot indicators"
```

---

### Task 11: 결과 페이지에 카드 캐러셀 통합 + 네온 다크 적용

**Files:**
- Modify: `src/routes/result/+page.svelte`

- [ ] **Step 1: 결과 페이지에 import 추가 + 카드 섹션 삽입**

result/+page.svelte 상단 import에 추가:
```typescript
import CardCarousel from '$lib/components/CardCarousel.svelte';
import ResultCard from '$lib/components/ResultCard.svelte';
import DownloadButton from '$lib/components/DownloadButton.svelte';
```

AI 분석 섹션(`{:else if aiAnalysis}`) 안의 맨 위, line 133 부근에 카드 캐러셀 삽입:

```svelte
{:else if aiAnalysis}
	<!-- 공유 카드 -->
	<CardCarousel>
		{#if mode === 'duo'}
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[0]}>
					<ResultCard type="summary" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[0]} filename="toksim-summary.png" />
			</div>
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[1]}>
					<ResultCard type="personality" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[1]} filename="toksim-personality.png" />
			</div>
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[2]}>
					<ResultCard type="relationship" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[2]} filename="toksim-relationship.png" />
			</div>
		{:else}
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[0]}>
					<ResultCard type="summary" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[0]} filename="toksim-group-summary.png" />
			</div>
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[1]}>
					<ResultCard type="chatking" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[1]} filename="toksim-chatking.png" />
			</div>
			<div class="card-slot">
				<div class="card-preview" bind:this={cardRefs[2]}>
					<ResultCard type="participation" {stats} {aiAnalysis} {mode} />
				</div>
				<DownloadButton targetElement={cardRefs[2]} filename="toksim-participation.png" />
			</div>
		{/if}
	</CardCarousel>
```

state 추가:
```typescript
let cardRefs = $state<(HTMLElement | null)[]>([null, null, null]);
```

카드 프리뷰 CSS:
```css
.card-preview {
	width: 100%;
	max-width: 360px;
	aspect-ratio: 9 / 16;
	overflow: hidden;
	border-radius: 12px;
}
.card-preview > :global(.card) {
	transform: scale(calc(360 / 1080));
	transform-origin: top left;
}
```

- [ ] **Step 2: 결과 페이지 전체 CSS를 네온 다크로 변경**

기존 밝은 테마 컬러를 CSS 변수로 전부 교체 (Task 6과 동일 패턴).

- [ ] **Step 3: 로컬 확인**

```bash
npm run dev
```
대화 분석 후 결과 페이지 상단에 카드 캐러셀이 표시되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/result/+page.svelte
git commit -m "feat: integrate card carousel into result page with neon dark theme"
```

---

## Lane C: 그룹채팅 + AI 확장

### Task 12: 타입 확장

**Files:**
- Modify: `src/lib/types/index.ts`

- [ ] **Step 1: Statistics에 mode + 그룹 필드 추가**

`src/lib/types/index.ts`의 Statistics 인터페이스 (line 85-102)에 추가:
```typescript
export interface Statistics {
	// ... 기존 필드 유지 ...
	mediaTotals: { photo: number; video: number; emoticon: number; voice: number; file: number };
	mode: 'duo' | 'group';
	tikitaka?: { from: string; to: string; count: number }[];
}
```

AIAnalysis 인터페이스에 그룹 필드 추가:
```typescript
export interface AIAnalysis {
	participants: ParticipantPersona[];
	conversationTemperature: number;
	relationshipDynamic: string;
	oneLineSummary: string;
	groupMood?: string;
	mvp?: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/types/index.ts
git commit -m "feat: extend types for group chat support (mode, tikitaka, groupMood, mvp)"
```

---

### Task 13: 통계 그룹채팅 확장

**Files:**
- Modify: `src/lib/analyzer/statistics.ts`

- [ ] **Step 1: analyzeStatistics에 mode 파라미터 + 티키타카 계산 추가**

`statistics.ts`의 메인 루프(line 140) 안에 티키타카 추적 추가. 루프 앞에:
```typescript
const tikitakaMap = new Map<string, Map<string, number>>();
```

루프 안 (line 178 이후, prev와 sender가 다를 때):
```typescript
if (prev && m.sender !== prev.sender) {
	const gap = minutesBetween(m.timestamp, prev.timestamp);
	if (gap <= REPLY_WINDOW_MINUTES) {
		// 기존 reply 로직 유지
		s.replySum += gap;
		s.replyCount++;
	}
	// 티키타카 추적
	if (gap <= 5) { // 5분 이내 연속 발화
		if (!tikitakaMap.has(prev.sender)) tikitakaMap.set(prev.sender, new Map());
		const inner = tikitakaMap.get(prev.sender)!;
		inner.set(m.sender, (inner.get(m.sender) ?? 0) + 1);
	}
}
```

반환 객체에 추가:
```typescript
const mode = participants.length >= 3 ? 'group' : 'duo';

const tikitaka = mode === 'group'
	? Array.from(tikitakaMap.entries()).flatMap(([from, toMap]) =>
		Array.from(toMap.entries()).map(([to, count]) => ({ from, to, count }))
	).sort((a, b) => b.count - a.count).slice(0, 10)
	: undefined;

return {
	// ... 기존 필드 ...
	mode,
	tikitaka
};
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run
```
Expected: ALL PASS (기존 테스트 + 새 티키타카 필드)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/analyzer/statistics.ts
git commit -m "feat: add group chat statistics (tikitaka tracking, mode detection)"
```

---

### Task 14: AI 그룹 프롬프트 + 타임아웃

**Files:**
- Modify: `src/routes/api/analyze/+server.ts`

- [ ] **Step 1: buildPrompt에 mode 분기 추가**

함수 시그니처 변경:
```typescript
function buildPrompt(stats: Statistics, samples: AnalyzeRequest['sampleMessages'], mode: 'duo' | 'group'): string {
```

group 모드 분기 추가 (기존 duo 프롬프트 유지 + group 프롬프트 새로 작성):
```typescript
if (mode === 'group') {
	return `당신은 한국어 카카오톡 그룹 대화를 분석하는 전문가입니다. 아래 데이터를 분석하여 JSON으로만 응답하세요.

[참여자 통계]
${participantLines}

[대화 샘플 ${samples.length}개]
${sampleLines}

[분석 지침]
- groupMood: 그룹 분위기를 한 마디로 표현. 예: "웃음 가득 단톡방", "업무 위주 그룹", "심야 수다방"
- mvp: 분위기 메이커 또는 가장 활발한 참여자 이름 (통계 기반)
- participants: 각 참여자의 말투 유형과 성격 키워드 3개
- oneLineSummary: 이 단톡방을 한 줄로 요약. 재치있고 임팩트있게.
- 모든 문자열은 한국어로 작성하세요.

[응답 스키마]
{
  "participants": [{ "name": "이름", "speechStyle": "말투", "personalityKeywords": ["키워드1", "키워드2", "키워드3"] }],
  "groupMood": "그룹 분위기",
  "mvp": "채팅왕 이름",
  "conversationTemperature": 0,
  "relationshipDynamic": "",
  "oneLineSummary": "한 줄 총평"
}`;
}
// 기존 duo 프롬프트는 그대로 유지 (return 문)
```

- [ ] **Step 2: POST 핸들러에서 mode 전달**

AnalyzeRequest 타입에 mode 추가 (types/index.ts):
```typescript
export interface AnalyzeRequest {
	statistics: Statistics;
	sampleMessages: { sender: string; content: string; timestamp: string }[];
	mode: 'duo' | 'group';
}
```

POST 핸들러에서:
```typescript
const prompt = buildPrompt(payload.statistics, payload.sampleMessages, payload.mode ?? 'duo');
```

- [ ] **Step 3: 30초 타임아웃 추가**

Gemini fetch 호출에 AbortController 추가. 루프 시작 부분:
```typescript
for (const model of GEMINI_MODELS) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30000);
	try {
		const geminiRes = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: requestBody,
			signal: controller.signal
		});
		clearTimeout(timeout);
		// ... 기존 로직 ...
	} catch (e) {
		clearTimeout(timeout);
		if (e instanceof DOMException && e.name === 'AbortError') {
			attemptErrors.push(`${model}:timeout`);
			continue;
		}
		// ... 기존 에러 처리 ...
	}
}
```

- [ ] **Step 4: 429 전체 실패 메시지 변경**

마지막 에러 응답 (line 144 부근):
```typescript
const allRateLimit = attemptErrors.every((e) => e.includes(':429'));
const body: AnalyzeResponse = {
	success: false,
	error: allRateLimit
		? '오늘 분석이 마감되었습니다. 내일 다시 이용해주세요 🙏'
		: 'AI 분석 서비스가 일시적으로 혼잡합니다. 1~2분 후 다시 시도해주세요.'
};
```

- [ ] **Step 5: result/+page.svelte에서 mode 전달**

`runAIAnalysis` 함수를 수정하여 mode를 API에 전달:
```typescript
body: JSON.stringify({ statistics, sampleMessages: samples, mode })
```

- [ ] **Step 6: 커밋**

```bash
git add src/routes/api/analyze/+server.ts src/lib/types/index.ts src/routes/result/+page.svelte
git commit -m "feat: add group chat AI prompt, 30s timeout, daily limit message"
```

---

## 마무리

### Task 15: AdSense + SEO + OG

**Files:**
- Create: `src/lib/components/AdBanner.svelte`
- Create: `static/robots.txt`
- Create: `static/sitemap.xml`
- Modify: `src/routes/+page.svelte` (OG 태그)
- Modify: `src/routes/result/+page.svelte` (AdBanner 삽입)

- [ ] **Step 1: AdBanner 컴포넌트**

```svelte
<!-- src/lib/components/AdBanner.svelte -->
<div class="ad-banner">
	<!-- AdSense 승인 후 <ins class="adsbygoogle"> 삽입 -->
</div>

<style>
	.ad-banner {
		min-height: 90px;
		background: var(--bg-card);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		font-size: 0.8rem;
	}
</style>
```

- [ ] **Step 2: robots.txt + sitemap.xml**

```
# static/robots.txt
User-agent: *
Allow: /
Sitemap: https://toksim.pages.dev/sitemap.xml
```

```xml
<!-- static/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://toksim.pages.dev/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

- [ ] **Step 3: OG 태그 추가**

`src/routes/+page.svelte`의 `<svelte:head>`:
```svelte
<svelte:head>
	<title>톡심 - 카카오톡 대화 AI 분석</title>
	<meta name="description" content="카카오톡 대화를 붙여넣으면 AI가 말투, 성격, 관계를 분석해드려요" />
	<meta property="og:title" content="톡심 - 카카오톡 대화 AI 분석" />
	<meta property="og:description" content="카카오톡 대화를 붙여넣으면 AI가 말투, 성격, 관계를 분석해드려요" />
	<meta property="og:image" content="https://toksim.pages.dev/og-image.png" />
	<meta property="og:url" content="https://toksim.pages.dev" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
```

- [ ] **Step 4: result/+page.svelte에 AdBanner 삽입**

AI 섹션과 상세 통계 사이에:
```svelte
import AdBanner from '$lib/components/AdBanner.svelte';
```
```svelte
</section> <!-- ai-section 종료 -->
<AdBanner />
<section class="block"> <!-- 통계 시작 -->
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/components/AdBanner.svelte static/robots.txt static/sitemap.xml src/routes/+page.svelte src/routes/result/+page.svelte
git commit -m "feat: add AdSense placeholder, SEO meta tags, robots.txt, sitemap"
```

---

### Task 16: 최종 QA + 빌드 확인

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 2: 프로덕션 빌드**

```bash
npm run build
```
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: 프리뷰 확인**

```bash
npm run preview
```
브라우저에서 전체 플로우 확인:
1. 랜딩 페이지 네온 다크
2. 대화 붙여넣기 → 분석
3. 결과 카드 3장 표시
4. 이미지 다운로드 동작
5. 모바일 반응형 확인

- [ ] **Step 4: 커밋 (필요 시 수정 후)**

```bash
git add -A
git commit -m "chore: final QA fixes"
```
