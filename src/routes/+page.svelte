<script lang="ts">
	import { parseKakaoChat } from '$lib/parser/kakao';
	import type { ParseResult } from '$lib/types';

	let rawText = $state('');
	let result = $state<ParseResult | null>(null);

	function handleAnalyze() {
		result = parseKakaoChat(rawText);
		if (result.success && result.data) {
			console.log('파싱 결과:', result.data);
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
		<p class="tagline">카카오톡 대화를 붙여넣으면 AI가 말투와 관계를 분석해드려요</p>
	</header>

	<section class="input-section">
		<textarea
			bind:value={rawText}
			placeholder="여기에 카카오톡 대화를 붙여넣으세요.&#10;&#10;예시:&#10;[홍길동] [오후 3:42] 안녕하세요&#10;[김철수] [오후 3:43] 네 반가워요!"
			rows="12"
		></textarea>

		<button onclick={handleAnalyze} disabled={!rawText.trim()}>분석하기</button>
	</section>

	{#if result}
		<section class="result-section">
			{#if result.success && result.data}
				<h2>파싱 결과 (1일차 임시 표시)</h2>
				<ul>
					<li>전체 메시지: <strong>{result.data.messages.length}개</strong></li>
					<li>
						참여자: <strong
							>{result.data.participants.map((p) => `${p.name}(${p.messageCount})`).join(', ')}</strong
						>
					</li>
					<li>
						기간: <strong
							>{result.data.startDate.toLocaleDateString('ko-KR')} ~ {result.data.endDate.toLocaleDateString(
								'ko-KR'
							)}</strong
						>
					</li>
				</ul>
				<p class="hint">자세한 구조는 브라우저 콘솔(F12)에서 확인하세요.</p>
			{:else}
				<p class="error">{result.error}</p>
			{/if}
		</section>
	{/if}
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

	.result-section {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #f8f8f8;
		border-radius: 12px;
	}

	.result-section h2 {
		margin-top: 0;
		font-size: 1.25rem;
	}

	.result-section ul {
		padding-left: 1.2rem;
	}

	.result-section li {
		margin: 0.5rem 0;
	}

	.hint {
		color: #888;
		font-size: 0.9rem;
	}

	.error {
		color: #c00;
		margin: 0;
	}
</style>
