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
	.personal {
		color: #b9b9d0;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 4px;
	}
	.medal {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 84px;
		background: radial-gradient(circle at 35% 30%, #271f48, #0c0a1c);
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--a) 65%, transparent),
			0 0 60px color-mix(in srgb, var(--a) 45%, transparent);
	}
	.name {
		font-size: 2.5rem;
		font-weight: 900;
		margin: 8px 0 0;
		background: linear-gradient(90deg, color-mix(in srgb, var(--a) 70%, #fff), var(--a2));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.tagline {
		font-size: 1.2rem;
		color: #cfcfe4;
		font-weight: 700;
	}
	.desc {
		font-size: 0.95rem;
		color: #9a9ab8;
		max-width: 30rem;
		line-height: 1.6;
	}
	.cta {
		margin-top: 16px;
		padding: 16px 28px;
		border-radius: 14px;
		font-size: 1.15rem;
		font-weight: 800;
		color: #0a0a0a;
		text-decoration: none;
		background: linear-gradient(90deg, var(--a), var(--a2));
		box-shadow: 0 8px 30px color-mix(in srgb, var(--a) 40%, transparent);
	}
	.gallery-label {
		margin-top: 24px;
		color: #8a8aa6;
		font-size: 0.9rem;
	}
	.gallery {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		max-width: 34rem;
	}
	.chip {
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
		background: #ffffff10;
		color: #c7c7dd;
		border: 1px solid #ffffff14;
	}
	.chip.active {
		background: color-mix(in srgb, var(--a) 30%, transparent);
		color: #fff;
		border-color: var(--a);
	}
	.privacy {
		margin-top: 22px;
		color: #6f6f8c;
		font-size: 0.82rem;
	}
</style>
