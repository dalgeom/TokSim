<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let scrollContainer = $state<HTMLElement | null>(null);
	let activeIndex = $state(0);
	let cardCount = $state(0);

	function updateIndex() {
		if (!scrollContainer) return;
		const slots = scrollContainer.querySelectorAll(':scope > *');
		cardCount = slots.length;
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
		padding-bottom: 0.5rem;
		scrollbar-width: none;
	}
	.scroll-container::-webkit-scrollbar { display: none; }
	.scroll-container > :global(*) {
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
		background: var(--border, #2a2a4a);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: background 0.2s;
	}
	.dot.active {
		background: var(--neon-purple, #a855f7);
	}
</style>
