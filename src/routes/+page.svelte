<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseKakaoChat } from '$lib/parser/kakao';

	let rawText = $state('');
	let errorMsg = $state<string | null>(null);
	let isProcessing = $state(false);
	let isDragging = $state(false);
	let activeGuide = $state<'android' | 'ios' | 'pc'>('android');

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
		isProcessing = true;
		errorMsg = null;

		const result = parseKakaoChat(rawText);
		if (!result.success || !result.data) {
			errorMsg = result.error ?? '파싱에 실패했습니다.';
			isProcessing = false;
			return;
		}

		try {
			sessionStorage.setItem('toksim:chatData', JSON.stringify(result.data));
			goto('/result');
		} catch (e) {
			errorMsg = '데이터를 저장할 수 없습니다. 대화량을 줄여보세요.';
			console.error(e);
			isProcessing = false;
		}
	}
</script>

<svelte:head>
	<title>톡심 - 카카오톡 대화 분석</title>
	<meta name="description" content="카카오톡 대화를 AI가 분석해드립니다" />
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
			<textarea
				bind:value={rawText}
				placeholder="카카오톡 대화를 붙여넣거나, 아래 파일 업로드 버튼을 사용하세요.&#10;&#10;예시:&#10;[홍길동] [오후 3:42] 안녕하세요&#10;[김철수] [오후 3:43] 네 반가워요!"
				rows="12"
				disabled={isProcessing}
			></textarea>
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
				<h3>방법 1: 대화 복사해서 붙여넣기</h3>
				<ol>
					<li>카톡 대화방에서 메시지를 길게 눌러 선택 → 추가로 드래그해서 범위 확장</li>
					<li>나타나는 메뉴에서 <strong>복사</strong> 탭</li>
					<li>톡심 입력창을 길게 눌러 <strong>붙여넣기</strong></li>
				</ol>

				<h3>방법 2: txt 파일 업로드 (권장, 더 많은 대화 한 번에)</h3>
				<ol>
					<li>카톡 대화방 우측 상단 <strong>☰</strong> 메뉴 탭</li>
					<li>톱니바퀴 <strong>⚙️ 설정</strong> 탭</li>
					<li><strong>대화 내용 내보내기</strong> 선택</li>
					<li><strong>텍스트만 보내기</strong> 선택</li>
					<li>공유 시트에서 <strong>"파일에 저장"</strong>(내 파일/드라이브 등)으로 저장</li>
					<li>위의 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 저장한 파일 선택</li>
				</ol>
			{:else if activeGuide === 'ios'}
				<h3>방법 1: 대화 복사해서 붙여넣기</h3>
				<ol>
					<li>카톡 대화방에서 메시지를 길게 눌러 선택 → <strong>복사</strong></li>
					<li>(선택 범위가 좁으면) 대화 길게 눌러 전체 선택 후 복사</li>
					<li>톡심 입력창을 길게 눌러 <strong>붙여넣기</strong></li>
				</ol>

				<h3>방법 2: txt 파일 업로드 (권장)</h3>
				<ol>
					<li>카톡 대화방 우측 상단 <strong>☰</strong> 메뉴 탭</li>
					<li>톱니바퀴 <strong>⚙️ 설정</strong> 탭</li>
					<li><strong>대화 내용 내보내기</strong> 선택</li>
					<li><strong>텍스트로 공유</strong> 선택</li>
					<li>공유 시트에서 <strong>"파일에 저장"</strong>(iCloud Drive / 내 iPhone) 선택</li>
					<li>톡심 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 저장한 파일 선택</li>
				</ol>
			{:else}
				<h3>방법 1: 대화 드래그해서 복사 붙여넣기</h3>
				<ol>
					<li>PC 카카오톡 대화방 열기</li>
					<li>마우스로 원하는 대화 범위 드래그 선택</li>
					<li>우클릭 → <strong>복사</strong> (또는 Ctrl+C)</li>
					<li>톡심 입력창에 <strong>붙여넣기</strong> (Ctrl+V)</li>
				</ol>

				<h3>방법 2: txt 파일 업로드 (권장, 전체 대화)</h3>
				<ol>
					<li>PC 카톡 대화창 우측 상단 <strong>⋮</strong> 메뉴 → <strong>대화 내용 내보내기</strong></li>
					<li>저장 위치 선택하고 <strong>.txt 파일</strong>로 저장</li>
					<li>위의 <strong>"📎 txt 파일 업로드"</strong> 버튼으로 선택하거나, 입력창에 파일을 <strong>드래그&드롭</strong></li>
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
		font-family:
			-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		color: #fee500;
		text-shadow: 2px 2px 0 #3c1e1e;
	}

	.subtitle {
		font-size: 1rem;
		color: #888;
		font-weight: normal;
	}

	.tagline {
		color: #555;
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
		border: 2px solid #ddd;
		border-radius: 12px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
	}

	textarea:focus {
		outline: none;
		border-color: #fee500;
	}

	textarea:disabled {
		background: #f5f5f5;
	}

	.drop-zone.dragging textarea {
		border-color: #fee500;
		background: #fffbe6;
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(254, 229, 0, 0.9);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 700;
		color: #3c1e1e;
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
		background: white;
		border: 2px solid #fee500;
		color: #3c1e1e;
		border-radius: 10px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.file-btn:hover {
		background: #fffbe6;
	}

	.file-hint {
		color: #888;
		font-size: 0.85rem;
	}

	.analyze-btn {
		padding: 1rem;
		background: #fee500;
		color: #3c1e1e;
		border: none;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition: transform 0.1s;
	}

	.analyze-btn:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		color: #c00;
		margin: 0;
		padding: 0.75rem;
		background: #fee;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.help {
		margin-top: 3rem;
		padding: 1.5rem;
		background: #f8f8f8;
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
		border-bottom: 2px solid #e5e5e5;
	}

	.tab {
		background: none;
		border: none;
		padding: 0.6rem 0.9rem;
		font-size: 0.9rem;
		color: #888;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		font-weight: 600;
	}

	.tab.active {
		color: #3c1e1e;
		border-bottom-color: #fee500;
	}

	.tab:hover:not(.active) {
		color: #555;
	}

	.guide-content {
		color: #555;
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
		color: #3c1e1e;
	}

	.privacy {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e5e5;
		color: #888;
		font-size: 0.85rem;
		text-align: center;
	}

	.intro {
		color: #555;
		margin: 0 0 1rem;
		font-size: 0.92rem;
	}

	.guide-content h3 {
		margin: 1rem 0 0.4rem;
		font-size: 0.95rem;
		color: #3c1e1e;
	}

	.guide-content h3:first-child {
		margin-top: 0;
	}
</style>
