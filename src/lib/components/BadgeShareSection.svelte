<script lang="ts">
	import type { ParticipantStats } from '$lib/types';
	import { classifyGroup } from '$lib/analyzer/classifier';
	import { BADGE_TYPES, type BadgeSlug } from '$lib/badges/types';
	import { buildShareUrl } from '$lib/badges/share';

	let { participants }: { participants: ParticipantStats[] } = $props();

	const assignments = $derived(classifyGroup(participants));
	let copiedName = $state<string | null>(null);

	async function shareBadge(name: string, slug: BadgeSlug) {
		const badge = BADGE_TYPES[slug];
		const url = buildShareUrl(location.origin, slug, name);
		const text = `내 단톡방 캐릭터: ${badge.emoji} ${badge.name}`;
		if (navigator.share) {
			try {
				await navigator.share({ title: '톡심', text, url });
				return;
			} catch {
				// 공유 취소/실패 → 클립보드 복사로 폴백
			}
		}
		await navigator.clipboard.writeText(url);
		copiedName = name;
		setTimeout(() => {
			if (copiedName === name) copiedName = null;
		}, 2000);
	}
</script>

<section class="badge-section">
	<h2>우리 단톡방 캐릭터</h2>
	<p class="intro">통계로 뽑은 캐릭터예요. 카톡에 공유하면 친구도 자기 캐릭터를 확인할 수 있어요 🔥</p>
	<div class="rows">
		{#each assignments as a (a.name)}
			{@const badge = BADGE_TYPES[a.slug]}
			<div class="row" style="--accent: {badge.accent}">
				<span class="emoji">{badge.emoji}</span>
				<div class="meta">
					<strong class="who">{a.name}</strong>
					<span class="type">{badge.name}</span>
					<span class="tagline">"{badge.tagline}"</span>
				</div>
				<button class="share-btn" onclick={() => shareBadge(a.name, a.slug)}>
					{copiedName === a.name ? '✓ 복사됨' : '공유'}
				</button>
			</div>
		{/each}
	</div>
</section>

<style>
	.badge-section {
		background: var(--bg-card, #16162a);
		border: 1px solid var(--border, #2a2a4a);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}
	.badge-section h2 {
		margin: 0 0 0.4rem;
		font-size: 1.1rem;
	}
	.intro {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: var(--text-muted, #8a8aa6);
		line-height: 1.5;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 0.8rem;
		background: var(--bg-secondary, #0f0f1e);
		border: 1px solid var(--border, #2a2a4a);
		border-left: 3px solid var(--accent);
		border-radius: 10px;
	}
	.emoji {
		font-size: 1.8rem;
		line-height: 1;
		flex-shrink: 0;
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}
	.who {
		font-size: 0.98rem;
	}
	.type {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent);
	}
	.tagline {
		font-size: 0.78rem;
		color: var(--text-muted, #8a8aa6);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.share-btn {
		flex-shrink: 0;
		padding: 0.5rem 1rem;
		background: var(--neon-gradient, linear-gradient(90deg, #a855f7, #ec4899));
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
	}
	.share-btn:hover {
		opacity: 0.92;
	}
</style>
