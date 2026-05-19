<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseKakaoChat } from '$lib/parser/kakao';
	import { analyzeStatistics } from '$lib/analyzer/statistics';
	import { sampleMessages } from '$lib/analyzer/sampler';
	import ChatPreview from '$lib/components/ChatPreview.svelte';

	let rawText = $state('');
	let errorMsg = $state<string | null>(null);
	let isProcessing = $state(false);
	let isDragging = $state(false);
	let activeGuide = $state<'android' | 'ios' | 'pc'>('android');
	let showPreview = $state(true);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	function activateTextarea() {
		showPreview = false;
		// 다음 프레임에서 textarea에 포커스
		requestAnimationFrame(() => textareaEl?.focus());
	}

	async function readFile(file: File): Promise<string> {
		if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
			throw new Error('txt 파일만 업로드할 수 있어요.');
		}
		if (file.size > 20 * 1024 * 1024) {
			throw new Error('파일이 너무 큽니다 (20MB 초과).');
		}
		return await file.text();
	}

	async function handleFileSelect(file: File) {
		errorMsg = null;
		try {
			rawText = await readFile(file);
			showPreview = false;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : '파일을 읽을 수 없습니다.';
		}
	}

	function onFileInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) handleFileSelect(file);
		target.value = '';
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function onDragLeave() {
		isDragging = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFileSelect(file);
	}

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
</script>

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

<main>
	<header>
		<h1>톡심 <span class="subtitle">TokSim</span></h1>
		<p class="tagline">카카오톡 대화를 붙여넣거나 파일을 올리면 AI가 말투와 관계를 분석해드려요</p>
	</header>

	<section class="input-section">
		<div
			class="drop-zone"
			class:dragging={isDragging}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			role="presentation"
		>
			{#if showPreview && !rawText}
				<ChatPreview onclick={activateTextarea} />
			{:else}
				<textarea
					bind:this={textareaEl}
					bind:value={rawText}
					placeholder="카카오톡 대화를 여기에 붙여넣으세요"
					rows="12"
					disabled={isProcessing}
					onfocus={() => (showPreview = false)}
				></textarea>
			{/if}
			{#if isDragging}
				<div class="drop-overlay">📂 파일을 놓아주세요</div>
			{/if}
		</div>

		<div class="file-row">
			<input
				type="file"
				accept=".txt,text/plain"
				onchange={onFileInputChange}
				class="hidden-file"
				id="kakao-file-input"
			/>
			<label for="kakao-file-input" class="file-btn">📎 txt 파일 업로드</label>
			<span class="file-hint">PC / 모바일 카톡 "대화 내보내기"로 저장한 txt 파일</span>
		</div>

		{#if errorMsg}
			<p class="error">{errorMsg}</p>
		{/if}

		<button class="analyze-btn" onclick={handleAnalyze} disabled={!rawText.trim() || isProcessing}>
			{isProcessing ? '분석 중...' : '분석하기'}
		</button>
	</section>

	<section class="help">
		<h2>대화를 어떻게 가져오나요?</h2>

		<p class="intro">
			두 가지 방법이 있어요: <strong>대화 복사해서 붙여넣기</strong> 또는 <strong>txt 파일 업로드</strong>.
		</p>

		<div class="tabs" role="tablist">
			<button
				class="tab"
				class:active={activeGuide === 'android'}
				onclick={() => (activeGuide = 'android')}
				role="tab"
				aria-selected={activeGuide === 'android'}>안드로이드</button
			>
			<button
				class="tab"
				class:active={activeGuide === 'ios'}
				onclick={() => (activeGuide = 'ios')}
				role="tab"
				aria-selected={activeGuide === 'ios'}>iOS (아이폰)</button
			>
			<button
				class="tab"
				class:active={activeGuide === 'pc'}
				onclick={() => (activeGuide = 'pc')}
				role="tab"
				aria-selected={activeGuide === 'pc'}>PC</button
			>
		</div>

		<div class="guide-content">
			{#if activeGuide === 'android'}
				<p class="callout">
					📱 모바일 카톡은 한 번에 <strong>한 메시지씩만</strong> 복사할 수 있어요. 여러
					메시지를 분석하려면 <strong>txt 파일 업로드</strong>가 사실상 유일한 방법입니다.
				</p>

				<h3>txt 파일 업로드 (권장)</h3>
				<ol>
					<li>카톡 대화방 우측 상단 <strong>☰</strong> 메뉴 탭</li>
					<li>톱니바퀴 <strong>⚙️ 설정</strong> 탭</li>
					<li><strong>대화 내용 내보내기</strong> 선택</li>
					<li><strong>텍스트만 보내기</strong> 선택</li>
					<li>공유 시트에서 <strong>"파일에 저장"</strong>(내 파일 / 드라이브 등)으로 저장</li>
					<li>위의 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 저장한 파일 선택</li>
				</ol>

				<h3 class="minor">한 메시지만 확인하고 싶다면</h3>
				<ol>
					<li>대화방에서 메시지를 <strong>길게 눌러</strong> 메뉴 띄우기</li>
					<li><strong>복사</strong> 탭</li>
					<li>톡심 입력창 길게 눌러 <strong>붙여넣기</strong></li>
				</ol>
			{:else if activeGuide === 'ios'}
				<p class="callout">
					📱 모바일 카톡은 한 번에 <strong>한 메시지씩만</strong> 복사할 수 있어요. 여러
					메시지를 분석하려면 <strong>txt 파일 업로드</strong>가 사실상 유일한 방법입니다.
				</p>

				<h3>txt 파일 업로드 (권장)</h3>
				<ol>
					<li>카톡 대화방 우측 상단 <strong>☰</strong> 메뉴 탭</li>
					<li>톱니바퀴 <strong>⚙️ 설정</strong> 탭</li>
					<li><strong>대화 내용 내보내기</strong> 선택</li>
					<li><strong>텍스트로 공유</strong> 선택</li>
					<li>공유 시트에서 <strong>"파일에 저장"</strong>(iCloud Drive / 내 iPhone) 선택</li>
					<li>톡심 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 저장한 파일 선택</li>
				</ol>

				<h3 class="minor">한 메시지만 확인하고 싶다면</h3>
				<ol>
					<li>대화방에서 메시지를 <strong>길게 눌러</strong> 메뉴 띄우기</li>
					<li><strong>복사</strong> 탭</li>
					<li>톡심 입력창 길게 눌러 <strong>붙여넣기</strong></li>
				</ol>
			{:else}
				<p class="callout">
					💻 PC 카톡은 여러 메시지를 한 번에 드래그 선택해서 복사할 수 있어요. 짧은 구간만 볼
					거면 드래그 복사가 편하고, 전체 대화를 분석할 거면 txt 파일 업로드가 깔끔합니다.
				</p>

				<h3>방법 1: 대화 드래그해서 복사 붙여넣기</h3>
				<ol>
					<li>PC 카카오톡 대화방 열기</li>
					<li>마우스로 원하는 대화 범위 <strong>드래그 선택</strong></li>
					<li>우클릭 → <strong>복사</strong> (또는 Ctrl+C)</li>
					<li>톡심 입력창에 <strong>붙여넣기</strong> (Ctrl+V)</li>
				</ol>

				<h3>방법 2: txt 파일 업로드 (전체 대화 분석 시 권장)</h3>
				<ol>
					<li>PC 카톡 대화창 우측 상단 <strong>⋮</strong> 메뉴 → <strong>대화 내용 내보내기</strong></li>
					<li>저장 위치 선택하고 <strong>.txt 파일</strong>로 저장</li>
					<li>
						위의 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 선택하거나, 입력창에 파일을 <strong
							>드래그&드롭</strong
						>
					</li>
				</ol>
			{/if}
		</div>

		<p class="privacy">🔒 업로드한 대화는 서버에 저장되지 않고, 분석 후 즉시 폐기됩니다.</p>
	</section>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--text-muted);
		font-weight: normal;
	}

	.tagline {
		color: var(--text-secondary);
		margin-top: 0.5rem;
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.drop-zone {
		position: relative;
	}

	textarea {
		width: 100%;
		padding: 1rem;
		border: 2px solid var(--border);
		border-radius: 12px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
		background: var(--bg-input);
		color: var(--text-primary);
	}

	textarea:focus {
		outline: none;
		border-color: var(--neon-purple);
	}

	textarea:disabled {
		background: var(--bg-secondary);
	}

	.drop-zone.dragging textarea {
		border-color: var(--neon-purple);
		background: var(--bg-secondary);
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(168, 85, 247, 0.9);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
		pointer-events: none;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.hidden-file {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1px;
		height: 1px;
	}

	.file-btn {
		display: inline-block;
		padding: 0.65rem 1rem;
		background: var(--bg-input);
		border: 2px solid var(--neon-purple);
		color: var(--text-primary);
		border-radius: 10px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.file-btn:hover {
		background: rgba(168, 85, 247, 0.1);
	}

	.file-hint {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.analyze-btn {
		padding: 1rem;
		background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition: transform 0.1s, opacity 0.1s;
	}

	.analyze-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		opacity: 0.9;
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		color: var(--neon-pink);
		margin: 0;
		padding: 0.75rem;
		background: rgba(236, 72, 153, 0.15);
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.help {
		margin-top: 3rem;
		padding: 1.5rem;
		background: var(--bg-card);
		border-radius: 12px;
	}

	.help h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		border-bottom: 2px solid var(--border);
	}

	.tab {
		background: none;
		border: none;
		padding: 0.6rem 0.9rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		font-weight: 600;
	}

	.tab.active {
		color: var(--text-primary);
		border-bottom-color: var(--neon-purple);
	}

	.tab:hover:not(.active) {
		color: var(--text-secondary);
	}

	.guide-content {
		color: var(--text-secondary);
		font-size: 0.92rem;
		line-height: 1.7;
	}

	.guide-content ol {
		padding-left: 1.2rem;
		margin: 0;
	}

	.guide-content li {
		margin-bottom: 0.3rem;
	}

	.guide-content strong {
		color: var(--text-primary);
	}

	.privacy {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 0.85rem;
		text-align: center;
	}

	.intro {
		color: var(--text-secondary);
		margin: 0 0 1rem;
		font-size: 0.92rem;
	}

	.guide-content h3 {
		margin: 1rem 0 0.4rem;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.guide-content h3:first-child {
		margin-top: 0;
	}

	.guide-content h3.minor {
		color: var(--text-muted);
		font-size: 0.88rem;
		margin-top: 1.5rem;
	}

	.callout {
		background: rgba(168, 85, 247, 0.1);
		border-left: 3px solid var(--neon-pink);
		padding: 0.7rem 0.9rem;
		border-radius: 6px;
		margin: 0 0 1rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--text-secondary);
	}
</style>
