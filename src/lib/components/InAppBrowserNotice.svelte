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
