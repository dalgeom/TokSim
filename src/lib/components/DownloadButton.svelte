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

			// The card inside card-preview is scaled to 0.25 for display.
			// We need to temporarily render at full size for html2canvas.
			const card = targetElement.querySelector(':scope > *') as HTMLElement | null;
			const wrapper = targetElement;
			const prevWrapperStyle = wrapper.style.cssText;
			const prevCardTransform = card?.style.transform ?? '';

			// Expand to full size for capture
			wrapper.style.width = '1080px';
			wrapper.style.height = '1920px';
			wrapper.style.overflow = 'visible';
			if (card) card.style.transform = 'none';

			// Wait a frame for layout to recalculate
			await new Promise((r) => requestAnimationFrame(r));

			const canvas = await html2canvas(wrapper, {
				scale: 1,
				useCORS: true,
				backgroundColor: '#0a0a0a'
			});

			// Restore display size
			wrapper.style.cssText = prevWrapperStyle;
			if (card) card.style.transform = prevCardTransform;

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
		background: var(--bg-card, #16162a);
		border: 1px solid var(--border, #2a2a4a);
		color: var(--text-primary, #e5e5e5);
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: inherit;
	}
	.dl-btn:hover:not(:disabled) {
		border-color: var(--neon-purple, #a855f7);
	}
	.dl-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid var(--border, #2a2a4a);
		border-top-color: var(--neon-purple, #a855f7);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.fallback-msg {
		font-size: 0.8rem;
		color: var(--neon-pink, #ec4899);
		margin: 0.4rem 0 0;
	}
</style>
