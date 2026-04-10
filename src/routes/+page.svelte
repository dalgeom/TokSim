<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseKakaoChat } from '$lib/parser/kakao';

	let rawText = $state('');
	let errorMsg = $state<string | null>(null);
	let isProcessing = $state(false);

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
		<p class="tagline">카카오톡 대화를 붙여넣으면 말투와 관계를 분석해드려요</p>
	</header>

	<section class="input-section">
		<textarea
			bind:value={rawText}
			placeholder="여기에 카카오톡 대화를 붙여넣으세요.&#10;&#10;예시:&#10;[홍길동] [오후 3:42] 안녕하세요&#10;[김철수] [오후 3:43] 네 반가워요!"
			rows="12"
			disabled={isProcessing}
		></textarea>

		{#if errorMsg}
			<p class="error">{errorMsg}</p>
		{/if}

		<button onclick={handleAnalyze} disabled={!rawText.trim() || isProcessing}>
			{isProcessing ? '분석 중...' : '분석하기'}
		</button>
	</section>

	<section class="help">
		<h2>어떻게 사용하나요?</h2>
		<ol>
			<li>카카오톡 대화방에서 분석하고 싶은 대화를 선택해 복사하세요.</li>
			<li>PC 카톡은 대화 내보내기 → 텍스트 파일을 열어 복사해도 됩니다.</li>
			<li>위 입력창에 붙여넣고 "분석하기"를 누르세요.</li>
			<li>대화 내용은 서버에 저장되지 않습니다.</li>
		</ol>
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

	button {
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

	button:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	button:disabled {
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
		font-size: 1.1rem;
	}

	.help ol {
		padding-left: 1.2rem;
		color: #555;
		line-height: 1.7;
	}
</style>
