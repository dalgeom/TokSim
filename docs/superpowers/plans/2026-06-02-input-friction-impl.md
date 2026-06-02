# 입력 마찰 해소 Implementation Plan (인앱브라우저 탈출 + 가벼운 입력)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카톡 인앱브라우저에 막힌 모바일 유입자를 외부 브라우저로 1탭에 탈출시키고, 파일 선택·붙여넣기 즉시 자동 분석 + 기기 자동감지 가이드로 입력을 가볍게 만든다.

**Architecture:** ① 순수 UA 유틸(`inapp.ts`)이 카톡 인앱 감지·플랫폼 판정·외부열기 딥링크 생성. ② `InAppBrowserNotice.svelte`가 인앱일 때 외부열기 배너. ③ 홈(`+page.svelte`)이 배너 마운트 + 기기 자동감지 가이드 + 파일/붙여넣기 자동분석. 검증은 spec(`docs/superpowers/specs/2026-06-02-input-friction-inapp-escape-design.md`).

**Tech Stack:** SvelteKit 5(runes) · vitest · 기존 파서/분석 파이프라인 재사용.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `src/lib/utils/inapp.ts` | `isKakaoInApp`/`detectPlatform`/`kakaoExternalUrl`/`openExternalKakao` | Create |
| `tests/utils/inapp.test.ts` | UA 분기 단위 테스트 | Create |
| `src/lib/components/InAppBrowserNotice.svelte` | 인앱 감지 배너 + 외부열기 버튼 + 수동 fallback | Create |
| `src/routes/+page.svelte` | 배너 마운트 + 기기감지 가이드 + 파일/붙여넣기 자동분석 | Modify |

---

## Task 1: UA 유틸 (`src/lib/utils/inapp.ts`)

**Files:**
- Create: `src/lib/utils/inapp.ts`
- Test: `tests/utils/inapp.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `tests/utils/inapp.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { isKakaoInApp, detectPlatform, kakaoExternalUrl } from '$lib/utils/inapp';

const UA = {
	androidKakao:
		'Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.5.0',
	iosKakao:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.5.0',
	desktopChrome:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	mobileSafari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
};

describe('isKakaoInApp', () => {
	it('카톡 인앱 UA 감지', () => {
		expect(isKakaoInApp(UA.androidKakao)).toBe(true);
		expect(isKakaoInApp(UA.iosKakao)).toBe(true);
	});
	it('일반 브라우저는 false', () => {
		expect(isKakaoInApp(UA.desktopChrome)).toBe(false);
		expect(isKakaoInApp(UA.mobileSafari)).toBe(false);
	});
});

describe('detectPlatform', () => {
	it('android/ios/pc 구분', () => {
		expect(detectPlatform(UA.androidKakao)).toBe('android');
		expect(detectPlatform(UA.iosKakao)).toBe('ios');
		expect(detectPlatform(UA.mobileSafari)).toBe('ios');
		expect(detectPlatform(UA.desktopChrome)).toBe('pc');
	});
});

describe('kakaoExternalUrl', () => {
	it('openExternal 딥링크 + url 인코딩', () => {
		expect(kakaoExternalUrl('https://toksim.pages.dev/')).toBe(
			'kakaotalk://web/openExternal?url=https%3A%2F%2Ftoksim.pages.dev%2F'
		);
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/utils/inapp.test.ts`
Expected: FAIL — `Cannot find module '$lib/utils/inapp'`

- [ ] **Step 3: 구현** — `src/lib/utils/inapp.ts`

```typescript
export type Platform = 'android' | 'ios' | 'pc';

/** UA에 KAKAOTALK 포함 = 카톡 인앱브라우저(파일 업로드/클립보드 차단 환경). */
export function isKakaoInApp(ua: string): boolean {
	return /kakaotalk/i.test(ua);
}

export function detectPlatform(ua: string): Platform {
	if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
	if (/android/i.test(ua)) return 'android';
	return 'pc';
}

/** 카톡 인앱 → 외부 브라우저 탈출 딥링크. */
export function kakaoExternalUrl(targetUrl: string): string {
	return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(targetUrl);
}

export function openExternalKakao(targetUrl: string): void {
	window.location.href = kakaoExternalUrl(targetUrl);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/utils/inapp.test.ts`
Expected: PASS (3 describe, 5 assertions 그룹)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/utils/inapp.ts tests/utils/inapp.test.ts
git commit -m "feat(utils): 카톡 인앱 감지 + 외부브라우저 탈출 딥링크"
```

---

## Task 2: 인앱 배너 컴포넌트 (`InAppBrowserNotice.svelte`)

**Files:**
- Create: `src/lib/components/InAppBrowserNotice.svelte`

- [ ] **Step 1: 구현** — `src/lib/components/InAppBrowserNotice.svelte`

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { isKakaoInApp, detectPlatform, openExternalKakao, type Platform } from '$lib/utils/inapp';

	let show = $state(false);
	let platform = $state<Platform>('pc');

	onMount(() => {
		const ua = navigator.userAgent;
		show = isKakaoInApp(ua);
		platform = detectPlatform(ua);
	});

	function openExternal() {
		openExternalKakao(window.location.href);
	}
</script>

{#if show}
	<div class="notice">
		<p class="head">⚠️ 카톡 안에서는 파일 업로드가 막혀 있어요</p>
		<p class="body">아래 버튼으로 기본 브라우저에서 열면 바로 분석할 수 있어요.</p>
		<button class="open-btn" onclick={openExternal}>
			{platform === 'ios' ? '🧭 Safari로 열기' : '🌐 Chrome으로 열기'}
		</button>
		<p class="fallback">
			안 열리면: 우측 상단 <strong>⋯</strong> → <strong>다른 브라우저로 열기</strong>
		</p>
	</div>
{/if}

<style>
	.notice {
		background: rgba(236, 72, 153, 0.12);
		border: 1px solid var(--neon-pink, #ec4899);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}
	.head {
		margin: 0 0 0.3rem;
		font-weight: 800;
		color: var(--text-primary, #e5e5e5);
		font-size: 1rem;
	}
	.body {
		margin: 0 0 0.8rem;
		font-size: 0.9rem;
		color: var(--text-secondary, #b9b9d0);
	}
	.open-btn {
		padding: 0.8rem 1.4rem;
		background: linear-gradient(135deg, var(--neon-purple, #a855f7), var(--neon-pink, #ec4899));
		color: #fff;
		border: none;
		border-radius: 10px;
		font-size: 1.05rem;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
	}
	.fallback {
		margin: 0.7rem 0 0;
		font-size: 0.8rem;
		color: var(--text-muted, #8a8aa6);
	}
	.fallback strong {
		color: var(--text-secondary, #b9b9d0);
	}
</style>
```

- [ ] **Step 2: 타입체크**

Run: `npm run check`
Expected: 신규 파일 0 error (기존 `tests/parser/kakao.test.ts` 3건은 사전존재 — 무시).

- [ ] **Step 3: 커밋**

```bash
git add src/lib/components/InAppBrowserNotice.svelte
git commit -m "feat(input): 카톡 인앱 외부브라우저 탈출 배너"
```

---

## Task 3: 홈 통합 (`src/routes/+page.svelte`)

배너 마운트 + 기기 자동감지 가이드 + 파일/붙여넣기 자동분석. 기존 `handleAnalyze`를 `runAnalysis(showErrors)`로 리팩터해 DRY 유지(명시적 버튼=에러표시, 자동=조용히).

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: import 추가** (스크립트 상단, 기존 import 블록)

기존:
```svelte
	import { goto } from '$app/navigation';
	import { parseKakaoChat } from '$lib/parser/kakao';
	import { analyzeStatistics } from '$lib/analyzer/statistics';
	import { sampleMessages } from '$lib/analyzer/sampler';
	import ChatPreview from '$lib/components/ChatPreview.svelte';
```
교체:
```svelte
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { parseKakaoChat } from '$lib/parser/kakao';
	import { analyzeStatistics } from '$lib/analyzer/statistics';
	import { sampleMessages } from '$lib/analyzer/sampler';
	import ChatPreview from '$lib/components/ChatPreview.svelte';
	import InAppBrowserNotice from '$lib/components/InAppBrowserNotice.svelte';
	import { detectPlatform } from '$lib/utils/inapp';
```

- [ ] **Step 2: 기기 자동감지 onMount 추가** (상태 선언 직후, `activateTextarea` 함수 위)

기존:
```svelte
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	function activateTextarea() {
```
교체:
```svelte
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	onMount(() => {
		// 내 기기에 맞는 가이드를 기본 선택(android/ios/pc)
		activeGuide = detectPlatform(navigator.userAgent);
	});

	function activateTextarea() {
```

- [ ] **Step 3: `handleAnalyze` → `runAnalysis` 리팩터 + 자동분석 함수** (기존 `handleAnalyze` 전체 교체)

기존(`handleAnalyze` 함수 전체, 약 65~112행):
```svelte
	function handleAnalyze() {
		if (!rawText.trim() || isProcessing) return;

		if (rawText.length > 5 * 1024 * 1024) {
			errorMsg = '텍스트가 너무 큽니다 (5MB 초과). 대화량을 줄여주세요.';
			return;
		}

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

		const stats = analyzeStatistics(result.data);
		const samples = sampleMessages(result.data);

		try {
			const toStore = JSON.stringify({
				statistics: stats,
				sampleMessages: samples,
				mode: stats.mode,
				truncated: msgCount > 5000 ? msgCount : null
			});
			sessionStorage.setItem('toksim:result', toStore);
			isProcessing = false;
			goto('/result');
		} catch (e) {
			errorMsg = '데이터를 저장할 수 없습니다. 대화량을 줄여보세요.';
			console.error(e);
			isProcessing = false;
		}
	}
```
교체:
```svelte
	// showErrors=true: 명시적 분석(에러 표시) / false: 자동 분석(유효할 때만 조용히 진행)
	function runAnalysis(showErrors: boolean) {
		if (!rawText.trim() || isProcessing) return;

		if (rawText.length > 5 * 1024 * 1024) {
			if (showErrors) errorMsg = '텍스트가 너무 큽니다 (5MB 초과). 대화량을 줄여주세요.';
			return;
		}

		const result = parseKakaoChat(rawText);
		if (!result.success || !result.data) {
			if (showErrors) errorMsg = result.error ?? '파싱에 실패했습니다.';
			return;
		}

		const msgCount = result.data.messages.length;
		if (msgCount < 30) {
			if (showErrors) errorMsg = '대화가 너무 짧아서 분석할 수 없어요 (최소 30건)';
			return;
		}

		isProcessing = true;
		errorMsg = null;

		if (msgCount > 5000) {
			result.data.messages = result.data.messages.slice(-5000);
		}

		const stats = analyzeStatistics(result.data);
		const samples = sampleMessages(result.data);

		try {
			const toStore = JSON.stringify({
				statistics: stats,
				sampleMessages: samples,
				mode: stats.mode,
				truncated: msgCount > 5000 ? msgCount : null
			});
			sessionStorage.setItem('toksim:result', toStore);
			isProcessing = false;
			goto('/result');
		} catch (e) {
			if (showErrors) errorMsg = '데이터를 저장할 수 없습니다. 대화량을 줄여보세요.';
			console.error(e);
			isProcessing = false;
		}
	}

	function handleAnalyze() {
		runAnalysis(true);
	}

	// 붙여넣기/파일선택 후 유효하면 버튼 탭 없이 자동 진행(조용히)
	function tryAutoAnalyze() {
		runAnalysis(false);
	}

	function onTextareaPaste() {
		// 바인딩(rawText) 반영 후 자동 분석 시도
		setTimeout(() => tryAutoAnalyze(), 0);
	}
```

- [ ] **Step 4: 파일 선택 시 자동 분석** (`handleFileSelect` 내부)

기존:
```svelte
	async function handleFileSelect(file: File) {
		errorMsg = null;
		try {
			rawText = await readFile(file);
			showPreview = false;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : '파일을 읽을 수 없습니다.';
		}
	}
```
교체:
```svelte
	async function handleFileSelect(file: File) {
		errorMsg = null;
		try {
			rawText = await readFile(file);
			showPreview = false;
			handleAnalyze(); // 파일은 명시적 행동 → 에러 표시하며 즉시 분석
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : '파일을 읽을 수 없습니다.';
		}
	}
```

- [ ] **Step 5: textarea에 onpaste 연결** (input-section의 textarea)

기존:
```svelte
				<textarea
					bind:this={textareaEl}
					bind:value={rawText}
					placeholder="카카오톡 대화를 여기에 붙여넣으세요"
					rows="12"
					disabled={isProcessing}
					onfocus={() => (showPreview = false)}
				></textarea>
```
교체:
```svelte
				<textarea
					bind:this={textareaEl}
					bind:value={rawText}
					placeholder="카카오톡 대화를 여기에 붙여넣으세요"
					rows="12"
					disabled={isProcessing}
					onfocus={() => (showPreview = false)}
					onpaste={onTextareaPaste}
				></textarea>
```

- [ ] **Step 6: 배너 마운트** (`<section class="input-section">` 바로 위)

기존:
```svelte
	<section class="input-section">
		<div
			class="drop-zone"
```
교체:
```svelte
	<InAppBrowserNotice />

	<section class="input-section">
		<div
			class="drop-zone"
```

- [ ] **Step 7: 회귀 테스트 + 타입체크 + 빌드**

Run: `npm test`
Expected: 기존 + 신규 전부 PASS.

Run: `npm run check`
Expected: 신규 코드 0 error (kakao.test.ts 3건 사전존재 제외).

Run: `npm run build`
Expected: 성공.

- [ ] **Step 8: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat(input): 인앱 배너 + 기기감지 가이드 + 파일/붙여넣기 자동분석"
```

---

## Task 4: 시각 검증 + 실기기 spike

- [ ] **Step 1: 인앱 배너 시각 검증 (UA 위장)**

`npm run dev -- --port 5182` (백그라운드) → browse로:
```
$B useragent "Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.5.0"
$B goto http://localhost:5182/
$B wait ".notice"
$B screenshot scripts/_inapp.png --selector ".notice"
```
Expected: 배너 노출(⚠️ 헤드 + "Chrome으로 열기" 버튼 + 우상단 ⋯ fallback). Read로 확인 후 `scripts/_inapp.png` 삭제. (빌드 전 dev 서버 반드시 종료 — vite 충돌 방지.)

- [ ] **Step 2: 일반 브라우저에선 배너 숨김 확인**

```
$B useragent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
$B goto http://localhost:5182/
$B is hidden ".notice"
```
Expected: `.notice` 없음/숨김 + PC 가이드 탭 기본 선택.

- [ ] **Step 3: 실기기 spike (사용자 협조 필요 — 코드 외)**

실제 카톡 인앱브라우저(Android/iOS)에서: ① 배너 "열기" 버튼이 외부 브라우저를 여는가 ② iOS는 딥링크 미동작 시 fallback 안내로 충분한가 ③ iOS 카톡 인앱이 `<input type=file>` 업로드가 되는가. 결과에 따라 iOS 분기 보강(후속).

---

## Self-Review

**Spec coverage:**
- 키스톤 인앱 탈출(spec §3.1) → Task 1(`isKakaoInApp`/`kakaoExternalUrl`/`openExternalKakao`) + Task 2(배너) + Task 3 Step6(마운트) ✅
- 파일 선택 즉시 자동분석(§3.2-1) → Task 3 Step4 ✅
- 붙여넣기 즉시 자동분석(§3.2-2) → Task 3 Step3(`tryAutoAnalyze`/`onTextareaPaste`) + Step5(onpaste) ✅
- 기기 자동감지 가이드(§3.2-3) → Task 3 Step2(`detectPlatform` → activeGuide) ✅
- 컴포넌트/파일 경계(§3.3) → File Structure 일치 ✅
- 에러 처리(§3.5: 자동=조용, 명시=에러) → `runAnalysis(showErrors)` ✅
- 테스트(§3.6) → Task 1 단위 + Task 4 시각/UA위장 ✅
- spike(§5) → Task 4 Step3 ✅
- 범위 밖(§4: 클립보드 자동읽기/Share Target) → 미포함(의도적) ✅

**Placeholder scan:** 없음. 모든 코드 step에 실제 코드 포함.

**Type consistency:** `Platform`('android'|'ios'|'pc')가 `detectPlatform` 반환 ↔ `activeGuide` 타입 ↔ `InAppBrowserNotice` platform state 동일. `runAnalysis(showErrors:boolean)` ↔ `handleAnalyze`/`tryAutoAnalyze` 일관. `kakaoExternalUrl`/`openExternalKakao` 시그니처 Task1↔Task2 일치.

**Known risk:** `openExternal` 딥링크의 실제 동작은 실기기에서만 확정(Task 4 Step3). 코드는 항상 수동 fallback 안내를 병기해 딥링크 실패에도 막다른 길 없음.
