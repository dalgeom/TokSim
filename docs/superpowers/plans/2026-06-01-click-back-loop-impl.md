# 클릭-백 루프 구현 Implementation Plan (안 C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단톡방 통계만으로 결정론적 "캐릭터 타입 배지"를 산출하고, 타입별 `/r/[type]` SSR 랜딩(정적 OG)으로 클릭-백 루프를 복원한다.

**Architecture:** ① 순수함수 분류기 v3(`classifier.ts`)가 `ParticipantStats[]` → 타입 슬러그. ② 타입 콘텐츠 맵(`badges/types.ts`)이 슬러그 → {이름·태그라인·설명·액센트·레어도·OG경로}. ③ `/r/[type]` 프리렌더 라우트가 슬러그별 정적 HTML+OG 메타 생성, 봇은 정적 2:1 OG PNG를 미리보기로 봄. C+ 하이브리드(fragment 개인화, 서버 무전송).

**Tech Stack:** SvelteKit 5(runes) · adapter-cloudflare · vitest · 정적 OG PNG(mockup HTML → browse 스크린샷)

**Scope (이번 단계 = NEXT-SESSION 추천 다음):** ⓐ 분류기 v3 이식 · ⓑ `/r/[type]` SSR 라우트+랜딩 · ⓒ 타입별 OG PNG. 
**Out of scope (즉시 후속):** 결과 페이지 공유 버튼 wiring(click-back §4), 전체공개 reveal(taxonomy §6), 듀오 타입.

**확정 결정 (NEXT-SESSION):** 안 C · C+ 하이브리드 · 분류기 v3 · 비주얼 B+A · 영문 슬러그 · 에너지뱀파이어 이름 유지.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `src/lib/badges/types.ts` | 타입 콘텐츠 맵(11종) + `BadgeSlug` 타입 + `getBadge`/`BADGE_SLUGS`/`BADGE_LIST` | Create |
| `src/lib/analyzer/classifier.ts` | 분류기 v3 순수함수 `classifyGroup` | Create |
| `tests/badges/types.test.ts` | 콘텐츠 맵 무결성 | Create |
| `tests/analyzer/classifier.test.ts` | 분류기 v3 동작·floor·fallback | Create |
| `src/routes/r/[type]/+page.ts` | prerender + entries + load(슬러그 검증) | Create |
| `src/routes/r/[type]/+page.svelte` | 랜딩(OG 메타 SSR + C+ 개인화 + CTA + 갤러리) | Create |
| `static/og/{slug}.png` (×11) | 타입별 정적 2:1 OG 카드 | Create (생성) |
| `scripts/og-gen.html` | OG PNG 생성용 단일카드 렌더러(mockup CSS 재사용) | Create (임시) |

슬러그 매핑(영문): king 수다왕 · moodmaker 분위기메이커 · vampire 에너지뱀파이어 · seenzone 읽씹왕 · ghost 유령 · reactionbot 무한리액션봇 · essayist 장문주의자 · factbomber 팩트폭격기 · photobomber 사진폭격기 · emojirich 이모티콘부자 · normal 평범한수다러(fallback).

---

## Task 0: Worktree 격리 + 브랜치

- [ ] **Step 1: worktree 생성**

`superpowers:using-git-worktrees` skill로 격리 워크스페이스 생성(브랜치 `feat/click-back-loop`). TokSim이 git repo가 아니면 in-place 진행하고 이 태스크 스킵.

Run: `git -C D:/OneDrive/DEV_WORK/TokSim status` 로 repo 여부 확인.

---

## Task 1: 타입 콘텐츠 맵 (`src/lib/badges/types.ts`)

**Files:**
- Create: `src/lib/badges/types.ts`
- Test: `tests/badges/types.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `tests/badges/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { BADGE_TYPES, BADGE_SLUGS, BADGE_LIST, getBadge } from '$lib/badges/types';

describe('BADGE_TYPES', () => {
	it('11종(10 + fallback) 정의, 슬러그 유일', () => {
		expect(BADGE_SLUGS.length).toBe(11);
		expect(new Set(BADGE_SLUGS).size).toBe(11);
		expect(BADGE_SLUGS).toContain('normal');
	});

	it('모든 배지가 필수 필드를 가짐', () => {
		for (const b of BADGE_LIST) {
			expect(b.slug).toBeTruthy();
			expect(b.emoji).toBeTruthy();
			expect(b.name).toBeTruthy();
			expect(b.tagline).toBeTruthy();
			expect(b.description).toBeTruthy();
			expect(b.accent).toMatch(/^#[0-9a-f]{6}$/i);
			expect(b.accent2).toMatch(/^#[0-9a-f]{6}$/i);
			expect(b.rarity).toBeTruthy();
		}
	});

	it('getBadge: 유효 슬러그 반환, 무효 슬러그 undefined', () => {
		expect(getBadge('vampire')?.name).toBe('에너지뱀파이어');
		expect(getBadge('nope')).toBeUndefined();
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/badges/types.test.ts`
Expected: FAIL — `Cannot find module '$lib/badges/types'`

- [ ] **Step 3: 구현** — `src/lib/badges/types.ts`

```typescript
export type BadgeSlug =
	| 'king' | 'moodmaker' | 'vampire' | 'seenzone' | 'ghost'
	| 'reactionbot' | 'essayist' | 'factbomber' | 'photobomber'
	| 'emojirich' | 'normal';

export interface BadgeType {
	slug: BadgeSlug;
	emoji: string;
	name: string;
	tagline: string;      // og:title 보조 / 카드 헤드
	description: string;  // og:description / 랜딩 본문
	accent: string;       // 카드 액센트 1 (#hex)
	accent2: string;      // 카드 액센트 2 (#hex)
	rarity: string;       // LEGENDARY/EPIC/RARE/UNCOMMON/SECRET/COMMON
	statN: string;        // 정적 카드 우상단 스탯 숫자(대표값)
	statL: string;        // 정적 카드 우상단 스탯 라벨
}

export const BADGE_TYPES: Record<BadgeSlug, BadgeType> = {
	king: {
		slug: 'king', emoji: '👑', name: '수다왕',
		tagline: '이 단톡방은 내가 먹여 살린다',
		description: '메시지 점유율 1위. 당신이 없으면 단톡방은 정적에 빠진다. 단톡방의 엔진.',
		accent: '#f59e0b', accent2: '#fbbf24', rarity: 'LEGENDARY', statN: '38%', statL: '메시지 점유율 1위'
	},
	moodmaker: {
		slug: 'moodmaker', emoji: '🎉', name: '분위기메이커',
		tagline: '내가 빠지면 단톡방이 조용해진다',
		description: 'ㅋㅋㅎㅎ 리액션으로 텐션을 책임지는 사람. 모두를 웃게 만드는 무드 담당.',
		accent: '#ec4899', accent2: '#f472b6', rarity: 'EPIC', statN: '1위', statL: 'ㅋㅋㅎㅎ 리액션'
	},
	vampire: {
		slug: 'vampire', emoji: '🧛', name: '에너지뱀파이어',
		tagline: '대화의 시작은 언제나 나',
		description: '먼저 말 걸고 판을 까는 텐션 주도자. 조용하면 못 참는 스타터.',
		accent: '#a855f7', accent2: '#ec4899', rarity: 'EPIC', statN: '2.4×', statL: '평균보다 먼저 말 검'
	},
	seenzone: {
		slug: 'seenzone', emoji: '💤', name: '읽씹왕',
		tagline: '읽씹도 예술이다',
		description: '답장은 느긋하게. 서두르지 않는 자유로운 영혼. (재촉 사절)',
		accent: '#3b82f6', accent2: '#60a5fa', rarity: 'UNCOMMON', statN: '39분', statL: '평균 답장 속도'
	},
	ghost: {
		slug: 'ghost', emoji: '👻', name: '유령',
		tagline: '나는 분명 이 방에 있다',
		description: '눈팅 전문. 모든 걸 지켜보지만 좀처럼 나서지 않는 미스터리.',
		accent: '#64748b', accent2: '#94a3b8', rarity: 'SECRET', statN: '3%', statL: '발화율 하위'
	},
	reactionbot: {
		slug: 'reactionbot', emoji: '🤣', name: '무한리액션봇',
		tagline: 'ㅋㅋㅋㅋㅋㅋㅋㅋ',
		description: '짧고 빠른 리액션 머신. 길게 말 안 해도 텐션은 최고.',
		accent: '#f97316', accent2: '#fb923c', rarity: 'RARE', statN: '×2.0', statL: '메시지당 ㅋ 개수'
	},
	essayist: {
		slug: 'essayist', emoji: '📚', name: '장문주의자',
		tagline: '할 말은 끝까지 한다',
		description: '카톡을 편지처럼 쓰는 사람. 스크롤이 필요한 메시지의 주인.',
		accent: '#14b8a6', accent2: '#2dd4bf', rarity: 'RARE', statN: '87자', statL: '평균 메시지 길이'
	},
	factbomber: {
		slug: 'factbomber', emoji: '🧊', name: '팩트폭격기',
		tagline: '감정은 빼고, 팩트만',
		description: '군더더기 없는 정보 전달자. 단톡방의 공식 발표 채널.',
		accent: '#06b6d4', accent2: '#22d3ee', rarity: 'UNCOMMON', statN: '0개', statL: '이모티콘 사용'
	},
	photobomber: {
		slug: 'photobomber', emoji: '📷', name: '사진폭격기',
		tagline: '말보다 사진',
		description: '짤과 사진으로 대화한다. 갤러리가 곧 대화록.',
		accent: '#22c55e', accent2: '#4ade80', rarity: 'RARE', statN: '1위', statL: '사진 전송'
	},
	emojirich: {
		slug: 'emojirich', emoji: '🎭', name: '이모티콘부자',
		tagline: '이모티콘으로 다 말함',
		description: '글자보다 이모티콘이 많은 사람. 감정표현의 끝판왕.',
		accent: '#d946ef', accent2: '#e879f9', rarity: 'RARE', statN: '100%', statL: '이모티콘 비율'
	},
	normal: {
		slug: 'normal', emoji: '🙂', name: '평범한수다러',
		tagline: '균형 잡힌 단톡방 시민',
		description: '어느 쪽으로도 치우치지 않은 올라운더. 더 또렷한 캐릭터는 직접 확인 →',
		accent: '#6b7280', accent2: '#9ca3af', rarity: 'COMMON', statN: '—', statL: '균형형'
	}
};

export const BADGE_SLUGS = Object.keys(BADGE_TYPES) as BadgeSlug[];
export const BADGE_LIST: BadgeType[] = BADGE_SLUGS.map((s) => BADGE_TYPES[s]);

export function getBadge(slug: string): BadgeType | undefined {
	return (BADGE_TYPES as Record<string, BadgeType>)[slug];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/badges/types.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/badges/types.ts tests/badges/types.test.ts
git commit -m "feat(badges): 타입 콘텐츠 맵 11종 + getBadge"
```

---

## Task 2: 분류기 v3 (`src/lib/analyzer/classifier.ts`)

분류기 규칙은 `docs/type-badge-taxonomy.md` §11(구현 ready) 그대로. 변수: `N`=인원, `base=1/N`, `share`=messageRatio, `kh`=avgKPerMessage + hCount/건, `emo`=emoticonCount/건, `media`=(photo+video+file)/건, `len`=avgCharsPerMessage, `startShare`=conversationStarts 비중, `avgK`=avgKPerMessage, `reply`=avgReplyMinutes.

**Files:**
- Create: `src/lib/analyzer/classifier.ts`
- Test: `tests/analyzer/classifier.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `tests/analyzer/classifier.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { classifyGroup } from '$lib/analyzer/classifier';
import type { ParticipantStats } from '$lib/types';

// 필요한 필드만 채우는 헬퍼(나머지 0)
function p(over: Partial<ParticipantStats> & { name: string; messageRatio: number }): ParticipantStats {
	return {
		name: over.name, messageCount: over.messageCount ?? 50, messageRatio: over.messageRatio,
		avgReplyMinutes: over.avgReplyMinutes ?? 5, totalChars: 0,
		avgCharsPerMessage: over.avgCharsPerMessage ?? 12, kCount: 0, hCount: over.hCount ?? 0,
		tearCount: 0, avgKPerMessage: over.avgKPerMessage ?? 0, photoCount: over.photoCount ?? 0,
		videoCount: 0, emoticonCount: over.emoticonCount ?? 0, voiceCount: 0, fileCount: 0,
		mediaRatio: 0, conversationStarts: over.conversationStarts ?? 0
	};
}
const slugOf = (r: ReturnType<typeof classifyGroup>, name: string) => r.find((x) => x.name === name)!.slug;

describe('classifyGroup v3', () => {
	it('명확한 수다왕 + 유령, 건조방엔 리액션봇 없음(floor)', () => {
		// 전원 ㅋ=0(건조) — v0 버그(리액션 0인데 리액션봇) 방지 검증
		const r = classifyGroup([
			p({ name: '수다', messageRatio: 0.55, conversationStarts: 5 }),
			p({ name: '보통A', messageRatio: 0.30 }),
			p({ name: '보통B', messageRatio: 0.12 }),
			p({ name: '유령', messageRatio: 0.03 })
		]);
		expect(slugOf(r, '수다')).toBe('king');
		expect(slugOf(r, '유령')).toBe('ghost');
		expect(r.every((x) => x.slug !== 'reactionbot')).toBe(true); // floor
		expect(slugOf(r, '보통A')).toBe('normal');
	});

	it('읽씹왕: 답장 최하(느림)+절대임계 통과', () => {
		const r = classifyGroup([
			p({ name: '빠름1', messageRatio: 0.3, avgReplyMinutes: 3 }),
			p({ name: '빠름2', messageRatio: 0.3, avgReplyMinutes: 5 }),
			p({ name: '느림', messageRatio: 0.2, avgReplyMinutes: 45 }),
			p({ name: '보통', messageRatio: 0.2, avgReplyMinutes: 8 })
		]);
		expect(slugOf(r, '느림')).toBe('seenzone');
	});

	it('무한리액션봇: kh≥0.8 && 단답(len≤8)', () => {
		const r = classifyGroup([
			p({ name: '리액션', messageRatio: 0.25, avgKPerMessage: 1.4, avgCharsPerMessage: 6 }),
			p({ name: 'a', messageRatio: 0.25 }),
			p({ name: 'b', messageRatio: 0.25 }),
			p({ name: 'c', messageRatio: 0.25 })
		]);
		expect(slugOf(r, '리액션')).toBe('reactionbot');
	});

	it('장문 vs 팩트 분리: 감정신호 유무로 갈림', () => {
		const r = classifyGroup([
			p({ name: '장문', messageRatio: 0.25, avgCharsPerMessage: 30, avgKPerMessage: 0.5, hCount: 20 }),
			p({ name: '팩트', messageRatio: 0.25, avgCharsPerMessage: 30, avgKPerMessage: 0.02, emoticonCount: 0 }),
			p({ name: 'a', messageRatio: 0.25 }),
			p({ name: 'b', messageRatio: 0.25 })
		]);
		expect(slugOf(r, '장문')).toBe('essayist');
		expect(slugOf(r, '팩트')).toBe('factbomber');
	});

	it('애매하면 평범한수다러(fallback)', () => {
		const r = classifyGroup([
			p({ name: 'a', messageRatio: 0.26 }),
			p({ name: 'b', messageRatio: 0.25 }),
			p({ name: 'c', messageRatio: 0.25 }),
			p({ name: 'd', messageRatio: 0.24 })
		]);
		expect(r.every((x) => x.slug === 'normal')).toBe(true);
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/analyzer/classifier.test.ts`
Expected: FAIL — `Cannot find module '$lib/analyzer/classifier'`

- [ ] **Step 3: 구현** — `src/lib/analyzer/classifier.ts`

```typescript
import type { ParticipantStats } from '$lib/types';
import type { BadgeSlug } from '$lib/badges/types';

export interface BadgeAssignment {
	name: string;
	slug: BadgeSlug;
	confidence: number;
}

interface Candidate {
	slug: BadgeSlug;
	conf: number;
}

/**
 * 분류기 v3 (docs/type-badge-taxonomy.md §11).
 * 각 참여자에 대해 절대 floor 게이트를 통과한 후보를 모으고 conf=값/floor 최댓값을 배정.
 * 후보 없으면 'normal'(평범한수다러). 단톡방(group) 전용.
 */
export function classifyGroup(participants: ParticipantStats[]): BadgeAssignment[] {
	const N = participants.length;
	if (N === 0) return [];
	const base = 1 / N;

	const shares = participants.map((x) => x.messageRatio);
	const maxShare = Math.max(...shares);
	const minShare = Math.min(...shares);

	const replyVals = participants
		.map((x) => x.avgReplyMinutes)
		.filter((v): v is number => v != null);
	const maxReply = replyVals.length ? Math.max(...replyVals) : null;

	const totalStarts = participants.reduce((s, x) => s + x.conversationStarts, 0);

	return participants.map((x) => {
		const mc = x.messageCount || 1;
		const share = x.messageRatio;
		const reply = x.avgReplyMinutes;
		const avgK = x.avgKPerMessage;
		const kh = avgK + x.hCount / mc;
		const emo = x.emoticonCount / mc;
		const media = (x.photoCount + x.videoCount + x.fileCount) / mc;
		const len = x.avgCharsPerMessage;
		const startShare = totalStarts > 0 ? x.conversationStarts / totalStarts : 0;

		const c: Candidate[] = [];

		// 👑 수다왕 — 최다 발화 우선(×1.5)
		if (share === maxShare && share >= base * 1.4)
			c.push({ slug: 'king', conf: (share / (base * 1.4)) * 1.5 });
		// 👻 유령
		if (share === minShare && share <= base * 0.55 && share > 0)
			c.push({ slug: 'ghost', conf: (base * 0.55) / share });
		// 💤 읽씹왕
		if (reply != null && reply >= 20 && reply === maxReply)
			c.push({ slug: 'seenzone', conf: reply / 20 });
		// 🧛 에너지뱀파이어 (저리액션은 절대값 kh<0.4)
		if (startShare >= base * 1.6 && kh < 0.4)
			c.push({ slug: 'vampire', conf: startShare / (base * 1.6) });
		// 🤣 무한리액션봇
		if (kh >= 0.8 && len <= 8)
			c.push({ slug: 'reactionbot', conf: kh / 0.8 });
		// 🎭 이모티콘부자
		if (emo >= 0.2)
			c.push({ slug: 'emojirich', conf: emo / 0.2 });
		// 📷 사진폭격기
		if (media >= 0.2)
			c.push({ slug: 'photobomber', conf: media / 0.2 });
		// 🧊 팩트폭격기
		const isFact = len >= 15 && avgK < 0.15 && emo < 0.05;
		if (isFact)
			c.push({ slug: 'factbomber', conf: len / 15 });
		// 📚 장문주의자 (팩트 아닐 때만)
		if (len >= 20 && !isFact)
			c.push({ slug: 'essayist', conf: len / 20 });
		// 🎉 분위기메이커 (중간 길이 8~25자 전용)
		if (kh >= 0.5 && len > 8 && len <= 25 && share >= base && share < maxShare)
			c.push({ slug: 'moodmaker', conf: kh / 0.5 });

		if (c.length === 0) return { name: x.name, slug: 'normal', confidence: 1 };
		const best = c.reduce((a, b) => (b.conf > a.conf ? b : a));
		return { name: x.name, slug: best.slug, confidence: best.conf };
	});
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/analyzer/classifier.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 테스트 회귀 확인**

Run: `npm test`
Expected: 기존 statistics/kakao 테스트 + 신규 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/analyzer/classifier.ts tests/analyzer/classifier.test.ts
git commit -m "feat(analyzer): 분류기 v3 (절대 floor + 구조/특성 분리 + fallback)"
```

---

## Task 3: `/r/[type]` SSR 라우트 + 랜딩

**Files:**
- Create: `src/routes/r/[type]/+page.ts`
- Create: `src/routes/r/[type]/+page.svelte`

- [ ] **Step 1: 로드 함수 작성** — `src/routes/r/[type]/+page.ts`

```typescript
import { error } from '@sveltejs/kit';
import { getBadge, BADGE_SLUGS } from '$lib/badges/types';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => BADGE_SLUGS.map((slug) => ({ type: slug }));

export const load: PageLoad = ({ params }) => {
	const badge = getBadge(params.type);
	if (!badge) throw error(404, '존재하지 않는 캐릭터 타입입니다');
	return { badge };
};
```

- [ ] **Step 2: 랜딩 작성** — `src/routes/r/[type]/+page.svelte`

loop-closure §3 랜딩 + §5 OG 메타. 액센트는 배지값을 CSS 변수로.

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { BADGE_LIST } from '$lib/badges/types';

	let { data }: { data: PageData } = $props();
	const badge = $derived(data.badge);
	const base = 'https://toksim.pages.dev';

	// C+ 하이브리드: fragment(#g=&n=) 개인화 — 클라이언트 전용, 서버 미전송
	let personalLine = $state('');
	$effect(() => {
		const f = new URLSearchParams(window.location.hash.slice(1));
		const g = f.get('g');
		const n = f.get('n');
		if (n && g) personalLine = `${n}님의 '${g}'에서 당신은?`;
		else if (g) personalLine = `'${g}' 단톡방에서 당신은?`;
		else if (n) personalLine = `${n}님이 보낸 캐릭터 테스트`;
	});
</script>

<svelte:head>
	<title>당신의 단톡방 캐릭터: {badge.emoji} {badge.name} - 톡심</title>
	<meta property="og:title" content="당신의 단톡방 캐릭터: {badge.emoji} {badge.name}" />
	<meta property="og:description" content="{badge.tagline} · 너의 캐릭터도 1초 만에 확인 →" />
	<meta property="og:image" content="{base}/og/{badge.slug}.png" />
	<meta property="og:url" content="{base}/r/{badge.slug}" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="description" content={badge.description} />
</svelte:head>

<main class="landing" style="--a:{badge.accent};--a2:{badge.accent2}">
	{#if personalLine}
		<p class="personal">{personalLine}</p>
	{/if}

	<div class="medal">{badge.emoji}</div>
	<h1 class="name">{badge.name}</h1>
	<p class="tagline">"{badge.tagline}"</p>
	<p class="desc">{badge.description}</p>

	<a class="cta" href="/">🔥 내 단톡방 캐릭터 분석하기</a>

	<p class="gallery-label">10가지 캐릭터 중 당신은?</p>
	<div class="gallery">
		{#each BADGE_LIST.filter((b) => b.slug !== 'normal') as b (b.slug)}
			<span class="chip" class:active={b.slug === badge.slug}>{b.emoji} {b.name}</span>
		{/each}
	</div>

	<p class="privacy">🔒 대화는 저장하지 않아요. 분석 후 즉시 폐기됩니다.</p>
</main>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		padding: 48px 20px 64px;
		text-align: center;
		background: radial-gradient(85% 70% at 50% 22%, #181430 0%, #09090f 72%);
		color: #e8e8f0;
		font-family: 'Pretendard', sans-serif;
	}
	.personal { color: #b9b9d0; font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
	.medal {
		width: 140px; height: 140px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center; font-size: 84px;
		background: radial-gradient(circle at 35% 30%, #271f48, #0c0a1c);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 65%, transparent),
			0 0 60px color-mix(in srgb, var(--a) 45%, transparent);
	}
	.name {
		font-size: 2.5rem; font-weight: 900; margin: 8px 0 0;
		background: linear-gradient(90deg, color-mix(in srgb, var(--a) 70%, #fff), var(--a2));
		-webkit-background-clip: text; background-clip: text; color: transparent;
	}
	.tagline { font-size: 1.2rem; color: #cfcfe4; font-weight: 700; }
	.desc { font-size: 0.95rem; color: #9a9ab8; max-width: 30rem; line-height: 1.6; }
	.cta {
		margin-top: 16px; padding: 16px 28px; border-radius: 14px;
		font-size: 1.15rem; font-weight: 800; color: #0a0a0a; text-decoration: none;
		background: linear-gradient(90deg, var(--a), var(--a2));
		box-shadow: 0 8px 30px color-mix(in srgb, var(--a) 40%, transparent);
	}
	.gallery-label { margin-top: 24px; color: #8a8aa6; font-size: 0.9rem; }
	.gallery { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 34rem; }
	.chip {
		padding: 6px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;
		background: #ffffff10; color: #c7c7dd; border: 1px solid #ffffff14;
	}
	.chip.active { background: color-mix(in srgb, var(--a) 30%, transparent); color: #fff; border-color: var(--a); }
	.privacy { margin-top: 22px; color: #6f6f8c; font-size: 0.82rem; }
</style>
```

- [ ] **Step 3: dev 서버로 SSR/OG 수동 검증**

Run: `npm run dev` (백그라운드) → `curl.exe -s http://localhost:5173/r/vampire | rg -i "og:title|og:image|에너지뱀파이어"`
Expected: og:title·og:image·이름이 **초기 HTML**에 존재(SSR 확인). 잘못된 슬러그 `/r/zzz`는 404.

(주의: 한글 URL은 curl 금지 — 슬러그가 영문이라 안전.)

- [ ] **Step 4: 빌드 프리렌더 확인**

Run: `npm run build` → `fd -t f "" .svelte-kit/cloudflare/r 2>/dev/null; ls build 2>/dev/null` (어댑터 출력 경로에서 `r/vampire` 등 11개 정적 HTML 생성 확인)
Expected: 빌드 성공, 슬러그별 프리렌더 HTML 존재.

- [ ] **Step 5: 커밋**

```bash
git add src/routes/r
git commit -m "feat(route): /r/[type] 프리렌더 SSR 랜딩 + 타입별 OG 메타"
```

---

## Task 4: 타입별 정적 OG PNG (×11)

승인된 mockup(`set-BA-hybrid.html`, B+A 하이브리드)을 단일카드 800×400 렌더러로 변환 → browse(gstack) 스크린샷으로 `static/og/{slug}.png` 생성. 카드 파라미터는 Task 1의 `BADGE_TYPES`와 1:1 일치.

**Files:**
- Create: `scripts/og-gen.html` (임시 렌더러)
- Create: `static/og/{slug}.png` ×11

- [ ] **Step 1: 단일카드 렌더러 작성** — `scripts/og-gen.html`

mockup CSS 그대로(스케일 제거, `.og`를 800×400 그대로). `?slug=vampire`로 한 장씩 렌더. 카드당 DOM: `#card`(정확히 800×400). 데이터는 `BADGE_TYPES`와 동일 값(emoji/name/tagline/accent/accent2/rarity/statN/statL) 인라인.

```html
<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#070710;font-family:'Pretendard',sans-serif}
  #card{width:800px;height:400px;border-radius:18px;overflow:hidden;position:relative;
    background:radial-gradient(85% 95% at 50% 28%, #181430 0%, #09090f 72%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e8e8f0}
  #card::before{content:"";position:absolute;inset:14px;border-radius:13px;border:2px solid transparent;
    background:linear-gradient(#0a0a12,#0a0a12) padding-box,
      conic-gradient(from 0deg, var(--a), #ffffff22, var(--a2), var(--a)) border-box}
  .rare{position:absolute;top:30px;left:30px;font-size:15px;font-weight:800;letter-spacing:.18em;
    padding:5px 12px;border-radius:6px;color:#0a0a0a;background:linear-gradient(90deg,var(--a),var(--a2))}
  .stat{position:absolute;top:30px;right:30px;text-align:right}
  .stat .n{font-size:30px;font-weight:900;color:#fff;line-height:1}
  .stat .l{font-size:13px;color:#a9a9c4;font-weight:600;margin-top:3px}
  .medal{width:168px;height:168px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:100px;
    background:radial-gradient(circle at 35% 30%, #271f48, #0c0a1c);position:relative;z-index:1;
    box-shadow:0 0 0 3px color-mix(in srgb, var(--a) 65%, transparent), 0 0 60px color-mix(in srgb, var(--a) 45%, transparent)}
  .name{font-size:52px;font-weight:900;margin-top:20px;z-index:1;
    background:linear-gradient(90deg, color-mix(in srgb,var(--a) 70%, #fff), var(--a2));
    -webkit-background-clip:text;background-clip:text;color:transparent}
  .tagline{font-size:20px;color:#b9b9d0;margin-top:8px;font-weight:600;z-index:1;text-align:center;padding:0 30px}
  .wm{position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:15px;letter-spacing:.06em;color:rgba(255,255,255,.5);font-weight:600}
</style></head>
<body><div id="card"></div>
<script>
const T = {
  king:{e:"👑",n:"수다왕",t:"이 단톡방은 내가 먹여 살린다",a:"#f59e0b",a2:"#fbbf24",r:"LEGENDARY",sn:"38%",sl:"메시지 점유율 1위"},
  moodmaker:{e:"🎉",n:"분위기메이커",t:"내가 빠지면 단톡방이 조용해진다",a:"#ec4899",a2:"#f472b6",r:"EPIC",sn:"1위",sl:"ㅋㅋㅎㅎ 리액션"},
  vampire:{e:"🧛",n:"에너지뱀파이어",t:"대화의 시작은 언제나 나",a:"#a855f7",a2:"#ec4899",r:"EPIC",sn:"2.4×",sl:"평균보다 먼저 말 검"},
  seenzone:{e:"💤",n:"읽씹왕",t:"읽씹도 예술이다",a:"#3b82f6",a2:"#60a5fa",r:"UNCOMMON",sn:"39분",sl:"평균 답장 속도"},
  ghost:{e:"👻",n:"유령",t:"나는 분명 이 방에 있다",a:"#64748b",a2:"#94a3b8",r:"SECRET",sn:"3%",sl:"발화율 하위"},
  reactionbot:{e:"🤣",n:"무한리액션봇",t:"ㅋㅋㅋㅋㅋㅋㅋㅋ",a:"#f97316",a2:"#fb923c",r:"RARE",sn:"×2.0",sl:"메시지당 ㅋ 개수"},
  essayist:{e:"📚",n:"장문주의자",t:"할 말은 끝까지 한다",a:"#14b8a6",a2:"#2dd4bf",r:"RARE",sn:"87자",sl:"평균 메시지 길이"},
  factbomber:{e:"🧊",n:"팩트폭격기",t:"감정은 빼고, 팩트만",a:"#06b6d4",a2:"#22d3ee",r:"UNCOMMON",sn:"0개",sl:"이모티콘 사용"},
  photobomber:{e:"📷",n:"사진폭격기",t:"말보다 사진",a:"#22c55e",a2:"#4ade80",r:"RARE",sn:"1위",sl:"사진 전송"},
  emojirich:{e:"🎭",n:"이모티콘부자",t:"이모티콘으로 다 말함",a:"#d946ef",a2:"#e879f9",r:"RARE",sn:"100%",sl:"이모티콘 비율"},
  normal:{e:"🙂",n:"평범한수다러",t:"균형 잡힌 단톡방 시민",a:"#6b7280",a2:"#9ca3af",r:"COMMON",sn:"—",sl:"균형형"}
};
const slug = new URLSearchParams(location.search).get('slug') || 'vampire';
const x = T[slug]; const card = document.getElementById('card');
card.style.setProperty('--a',x.a); card.style.setProperty('--a2',x.a2);
card.innerHTML = `<div class="rare">${x.r}</div>
  <div class="stat"><div class="n">${x.sn}</div><div class="l">${x.sl}</div></div>
  <div class="medal">${x.e}</div><div class="name">${x.n}</div>
  <div class="tagline">"${x.t}"</div><div class="wm">toksim.pages.dev</div>`;
</script></body></html>
```

- [ ] **Step 2: 11장 스크린샷 생성**

`scripts/og-gen.html`을 dev 서버나 file://로 열고, 각 슬러그에 대해 browse(gstack) 도구로 `#card` 요소(800×400)를 PNG 캡처 → `static/og/{slug}.png` 저장. 뷰포트 800×400, deviceScaleFactor 1.
Expected: 11개 PNG, 각 800×400, 중앙정렬(카톡 크롭 안전). 한글·이모지 정상 렌더 확인.

(browse 도구 불가 시 fallback: `scripts/og-gen.html`을 커밋하고 PNG는 후속 생성으로 남김. 라우트는 PNG 없어도 동작하며 OG만 404.)

- [ ] **Step 3: 시각 확인**

생성된 11장을 Read로 열어 잘림/한글 깨짐/이모지 누락 점검(글로벌 UI 체크리스트 §6 "시각적으로 상상").

- [ ] **Step 4: 커밋**

```bash
git add scripts/og-gen.html static/og
git commit -m "feat(og): 타입별 정적 OG 카드 11장 (B+A 하이브리드 800x400)"
```

---

## Task 5: 통합 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 2: 타입체크**

Run: `npm run check`
Expected: 0 errors (신규 .ts/.svelte 포함).

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: 성공 + `/r/{slug}` 11개 프리렌더.

- [ ] **Step 4: 수동 스모크**

`npm run dev` → 브라우저로 `/r/king`, `/r/vampire#g=대학동기방&n=민지`, `/r/zzz`(404) 확인. 개인화 줄·CTA·갤러리·OG 메타 점검.

---

## Self-Review

**Spec coverage:**
- 분류기 v3(taxonomy §11) → Task 2 (게이트·conf·floor·fallback 전부 반영) ✅
- `/r/[type]` SSR(loop-closure §0 SSR 필수, §5 OG 메타) → Task 3 (prerender+entries로 정적 HTML, og:* SSR) ✅
- C+ 하이브리드 fragment 개인화(loop-closure §1) → Task 3 +page.svelte `$effect` ✅
- 타입별 정적 2:1 OG(click-back §4 안 C, loop-closure §8 B+A) → Task 4 (mockup 값 1:1) ✅
- 영문 슬러그(loop-closure §7) → Task 1 BadgeSlug ✅
- 랜딩 단일 CTA + 갤러리 + 프라이버시(loop-closure §3) → Task 3 ✅
- fallback 평범한수다러(taxonomy §11) → Task 1 normal + Task 2 ✅

**Type consistency:** `BadgeSlug`(Task 1) ↔ classifier 반환(Task 2) ↔ route param 검증(Task 3) ↔ og-gen 키(Task 4) 슬러그 11종 동일. `classifyGroup` 반환 `{name, slug, confidence}` 일관.

**Deferred (이번 단계 밖, 후속 1순위):** 결과 페이지 "내 캐릭터 자랑하기" 공유 버튼 wiring(classifyGroup 호출 + `/r/{slug}#g=&n=` 링크 생성) — click-back §4. 전체공개 reveal, 듀오 타입.

**Known risk:** OG PNG는 browse 도구 의존(visual). taxonomy §11 floor 임계값은 합성데이터 기준 — 실데이터 보정은 별도(탐구 ④).
