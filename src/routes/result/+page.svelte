<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AIAnalysis, AnalyzeResponse, Statistics } from '$lib/types';
	import CardCarousel from '$lib/components/CardCarousel.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import DownloadButton from '$lib/components/DownloadButton.svelte';
	import BadgeShareSection from '$lib/components/BadgeShareSection.svelte';
	import AdBanner from '$lib/components/AdBanner.svelte';

	let stats = $state<Statistics | null>(null);
	let mode = $state<'duo' | 'group'>('duo');
	let truncated = $state<number | null>(null);
	let error = $state<string | null>(null);
	let aiAnalysis = $state<AIAnalysis | null>(null);
	let aiLoading = $state(false);
	let aiError = $state<string | null>(null);
	let cardRefs = $state<(HTMLElement | null)[]>([null, null, null]);

	const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

	async function runAIAnalysis(statistics: Statistics, samples: { sender: string; content: string; timestamp: string }[]) {
		aiLoading = true;
		aiError = null;
		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ statistics, sampleMessages: samples, mode })
			});
			const data: AnalyzeResponse = await res.json();
			if (!data.success || !data.analysis) {
				aiError = data.error ?? 'AI 분석에 실패했습니다.';
				return;
			}
			aiAnalysis = data.analysis;
		} catch (e) {
			console.error(e);
			aiError = '네트워크 오류가 발생했습니다.';
		} finally {
			aiLoading = false;
		}
	}

	onMount(() => {
		try {
			const stored = sessionStorage.getItem('toksim:result');
			if (!stored) {
				error = '분석할 대화 데이터가 없습니다.';
				return;
			}
			const parsed = JSON.parse(stored);
			stats = parsed.statistics;
			mode = parsed.mode ?? 'duo';
			truncated = parsed.truncated ?? null;

			// Date revival from JSON serialization
			if (stats) {
				stats.startDate = new Date(stats.startDate);
				stats.endDate = new Date(stats.endDate);
			}

			if (stats) {
				runAIAnalysis(stats, parsed.sampleMessages);
			}
		} catch (e) {
			error = '데이터를 불러오는 중 오류가 발생했습니다.';
			console.error(e);
		}
	});

	function temperatureColor(t: number): string {
		if (t >= 80) return '#ff4757';
		if (t >= 60) return '#ff7f50';
		if (t >= 40) return '#ffc048';
		if (t >= 20) return '#70a1ff';
		return '#5352ed';
	}

	function goHome() {
		goto('/');
	}

	function formatDate(d: Date): string {
		return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function formatReply(minutes: number | null): string {
		if (minutes == null) return '-';
		if (minutes < 1) return '1분 이내';
		if (minutes < 60) return `${Math.round(minutes)}분`;
		const h = Math.floor(minutes / 60);
		const m = Math.round(minutes % 60);
		return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
	}

	function pct(ratio: number): string {
		return `${(ratio * 100).toFixed(1)}%`;
	}

	let maxHour = $derived(stats ? Math.max(...stats.hourlyDistribution, 1) : 1);
	let maxWeekday = $derived(stats ? Math.max(...stats.weekdayDistribution, 1) : 1);
</script>

<svelte:head>
	<title>분석 결과 - 톡심</title>
</svelte:head>

<main>
	<header>
		<button class="back" onclick={goHome}>← 다시 분석하기</button>
		<h1>분석 결과</h1>
	</header>

	{#if error}
		<div class="error-box">
			<p>{error}</p>
			<button onclick={goHome}>홈으로 돌아가기</button>
		</div>
	{:else if stats}
		<section class="ai-section">
			{#if aiLoading}
				<div class="ai-loading">
					<div class="spinner"></div>
					<p>AI가 대화를 분석 중입니다...</p>
					<p class="muted-small">보통 5~10초 정도 걸려요</p>
				</div>
			{:else if aiError}
				<div class="ai-error">
					<p>🤖 {aiError}</p>
					<p class="muted-small">아래 기본 통계는 정상적으로 확인하실 수 있습니다.</p>
				</div>
			{:else if aiAnalysis}
				<CardCarousel>
					{#if mode === 'duo'}
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[0]}>
								<ResultCard type="summary" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[0]} filename="toksim-summary.png" />
						</div>
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[1]}>
								<ResultCard type="personality" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[1]} filename="toksim-personality.png" />
						</div>
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[2]}>
								<ResultCard type="relationship" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[2]} filename="toksim-relationship.png" />
						</div>
					{:else}
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[0]}>
								<ResultCard type="summary" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[0]} filename="toksim-group-summary.png" />
						</div>
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[1]}>
								<ResultCard type="chatking" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[1]} filename="toksim-chatking.png" />
						</div>
						<div class="card-slot">
							<div class="card-preview" bind:this={cardRefs[2]}>
								<ResultCard type="participation" {stats} {aiAnalysis} {mode} />
							</div>
							<DownloadButton targetElement={cardRefs[2]} filename="toksim-participation.png" />
						</div>
					{/if}
				</CardCarousel>

				<div class="ai-summary">
					<p class="one-liner">"{aiAnalysis.oneLineSummary}"</p>
				</div>

				<div class="temperature">
					<div class="temp-label">
						<span>💬 대화 온도</span>
						<strong>{aiAnalysis.conversationTemperature}°</strong>
					</div>
					<div class="temp-bar">
						<div
							class="temp-fill"
							style="width: {aiAnalysis.conversationTemperature}%; background: {temperatureColor(
								aiAnalysis.conversationTemperature
							)};"
						></div>
					</div>
				</div>

				<div class="relationship">
					<h3>관계 역학</h3>
					<p>{aiAnalysis.relationshipDynamic}</p>
				</div>

				<div class="personas">
					{#each aiAnalysis.participants as p (p.name)}
						<div class="persona">
							<div class="persona-header">
								<strong>{p.name}</strong>
								<span class="style-badge">{p.speechStyle}</span>
							</div>
							<div class="keywords">
								{#each p.personalityKeywords as k (k)}
									<span class="keyword">#{k}</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		{#if mode === 'group'}
			<BadgeShareSection participants={stats.participants} />
		{/if}

		<AdBanner />

		<section class="summary">
			<div class="stat-card">
				<div class="stat-value">{stats.totalMessages.toLocaleString()}</div>
				<div class="stat-label">총 메시지</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.totalDays}</div>
				<div class="stat-label">대화한 날</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{Math.round(stats.messagesPerDay)}</div>
				<div class="stat-label">하루 평균</div>
			</div>
		</section>

		<p class="period">
			{formatDate(stats.startDate)} ~ {formatDate(stats.endDate)}
		</p>

		{#if truncated}
			<p class="truncated-notice">최근 대화 5,000건으로 분석했어요 (전체 {truncated.toLocaleString()}건)</p>
		{/if}

		<section class="block">
			<h2>참여자</h2>
			<div class="participants">
				{#each stats.participants as p (p.name)}
					<div class="participant">
						<div class="p-header">
							<strong>{p.name}</strong>
							<span class="muted">{p.messageCount.toLocaleString()}개 ({pct(p.messageRatio)})</span>
						</div>
						<div class="bar">
							<div class="bar-fill" style="width: {p.messageRatio * 100}%"></div>
						</div>
						<dl class="p-stats">
							<div><dt>평균 답장</dt><dd>{formatReply(p.avgReplyMinutes)}</dd></div>
							<div><dt>메시지당 글자</dt><dd>{p.avgCharsPerMessage.toFixed(1)}자</dd></div>
							<div><dt>ㅋ 총 개수</dt><dd>{p.kCount.toLocaleString()}</dd></div>
							<div><dt>ㅎ 총 개수</dt><dd>{p.hCount.toLocaleString()}</dd></div>
							<div><dt>ㅠ/ㅜ 총 개수</dt><dd>{p.tearCount.toLocaleString()}</dd></div>
							<div><dt>대화 시작 횟수</dt><dd>{p.conversationStarts}회</dd></div>
							<div><dt>사진</dt><dd>{p.photoCount}개</dd></div>
							<div><dt>이모티콘</dt><dd>{p.emoticonCount}개</dd></div>
						</dl>
					</div>
				{/each}
			</div>
		</section>

		<section class="block">
			<h2>시간대별 대화량</h2>
			<div class="hour-chart">
				{#each stats.hourlyDistribution as count, hour (hour)}
					<div class="hour-bar" title="{hour}시: {count}개">
						<div class="hour-fill" style="height: {(count / maxHour) * 100}%"></div>
						<div class="hour-label">{hour}</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="block">
			<h2>요일별 대화량</h2>
			<div class="weekday-chart">
				{#each stats.weekdayDistribution as count, day (day)}
					<div class="weekday-row">
						<div class="weekday-label">{WEEKDAY_LABELS[day]}</div>
						<div class="weekday-bar">
							<div class="weekday-fill" style="width: {(count / maxWeekday) * 100}%"></div>
						</div>
						<div class="weekday-count">{count}</div>
					</div>
				{/each}
			</div>
		</section>

		{#if stats.topWords.length > 0}
			<section class="block">
				<h2>많이 쓴 단어 TOP 10</h2>
				<ol class="word-list">
					{#each stats.topWords as w (w.word)}
						<li>
							<span class="word">{w.word}</span>
							<span class="count">{w.count}회</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<section class="block">
			<h2>미디어 메시지</h2>
			<div class="media-grid">
				<div class="media-item"><span>📷 사진</span><strong>{stats.mediaTotals.photo}</strong></div>
				<div class="media-item"><span>🎬 동영상</span><strong>{stats.mediaTotals.video}</strong></div>
				<div class="media-item"><span>😀 이모티콘</span><strong>{stats.mediaTotals.emoticon}</strong></div>
				<div class="media-item"><span>🎤 음성</span><strong>{stats.mediaTotals.voice}</strong></div>
				<div class="media-item"><span>📎 파일</span><strong>{stats.mediaTotals.file}</strong></div>
			</div>
		</section>

		<p class="footnote">톡심 - 카카오톡 대화 AI 분석</p>
	{:else}
		<p class="loading">분석 중...</p>
	{/if}
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
		color: var(--text-primary);
	}

	header {
		margin-bottom: 2rem;
	}

	.back {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.95rem;
		cursor: pointer;
		padding: 0;
		margin-bottom: 0.5rem;
	}

	.back:hover {
		color: var(--text-primary);
	}

	h1 {
		font-size: 2rem;
		margin: 0;
	}

	.error-box {
		padding: 2rem;
		background: rgba(236, 72, 153, 0.1);
		border: 1px solid var(--border);
		border-radius: 12px;
		text-align: center;
	}

	.error-box button {
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--neon-gradient);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: bold;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.25rem 0.5rem;
		text-align: center;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: bold;
		color: var(--text-primary);
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.period {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-bottom: 2rem;
	}

	.truncated-notice {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin: -1.5rem 0 2rem;
		padding: 0.4rem 0.8rem;
		background: var(--bg-card);
		border-radius: 8px;
		display: inline-block;
		width: 100%;
	}

	.block {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	.block h2 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
	}

	.participant {
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
	}

	.participant:last-child {
		border-bottom: none;
	}

	.p-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.muted {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.bar {
		height: 8px;
		background: var(--bg-input);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.bar-fill {
		height: 100%;
		background: var(--neon-gradient);
	}

	.p-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem 1rem;
		margin: 0;
		font-size: 0.88rem;
	}

	.p-stats > div {
		display: flex;
		justify-content: space-between;
	}

	.p-stats dt {
		color: var(--text-muted);
		margin: 0;
	}

	.p-stats dd {
		margin: 0;
		font-weight: 600;
	}

	.hour-chart {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		gap: 2px;
		height: 120px;
		align-items: end;
	}

	.hour-bar {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		height: 100%;
	}

	.hour-fill {
		width: 100%;
		background: var(--neon-gradient);
		border-radius: 2px 2px 0 0;
		min-height: 1px;
	}

	.hour-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.weekday-chart {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.weekday-row {
		display: grid;
		grid-template-columns: 24px 1fr 40px;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.weekday-bar {
		height: 20px;
		background: var(--bg-input);
		border-radius: 4px;
		overflow: hidden;
	}

	.weekday-fill {
		height: 100%;
		background: var(--neon-gradient);
	}

	.weekday-count {
		text-align: right;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.word-list {
		margin: 0;
		padding: 0 0 0 1.2rem;
	}

	.word-list li {
		display: flex;
		justify-content: space-between;
		padding: 0.4rem 0;
		border-bottom: 1px dashed var(--border);
	}

	.word-list li:last-child {
		border-bottom: none;
	}

	.word {
		font-weight: 600;
	}

	.count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.75rem;
	}

	.media-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		background: var(--bg-secondary);
		border-radius: 8px;
	}

	.media-item span {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.media-item strong {
		font-size: 1.25rem;
	}

	.footnote {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-top: 2rem;
	}

	.loading {
		text-align: center;
		color: var(--text-secondary);
		padding: 3rem 0;
	}

	.ai-section {
		background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1));
		border: 2px solid var(--border);
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.ai-loading {
		text-align: center;
		padding: 1.5rem 0;
	}

	.spinner {
		display: inline-block;
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--neon-purple);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
		margin-bottom: 0.75rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.ai-loading p {
		margin: 0.25rem 0;
		color: var(--text-secondary);
	}

	.muted-small {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.ai-error {
		text-align: center;
		padding: 1rem 0;
		color: var(--text-secondary);
	}

	.ai-error p {
		margin: 0.25rem 0;
	}

	.ai-summary {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.one-liner {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.5;
		margin: 0;
		padding: 0.5rem;
	}

	.temperature {
		margin-bottom: 1.5rem;
	}

	.temp-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.95rem;
		color: var(--text-secondary);
	}

	.temp-label strong {
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.temp-bar {
		height: 14px;
		background: var(--bg-input);
		border-radius: 7px;
		overflow: hidden;
	}

	.temp-fill {
		height: 100%;
		border-radius: 7px;
		transition: width 0.8s ease-out;
	}

	.relationship {
		background: var(--bg-card);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.relationship h3 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.relationship p {
		margin: 0;
		font-size: 1rem;
		color: var(--text-primary);
		line-height: 1.5;
	}

	.personas {
		display: grid;
		gap: 0.75rem;
	}

	.persona {
		background: var(--bg-card);
		border-radius: 10px;
		padding: 1rem;
	}

	.persona-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.persona-header strong {
		font-size: 1.05rem;
	}

	.style-badge {
		background: var(--neon-purple);
		color: white;
		font-size: 0.8rem;
		padding: 0.25rem 0.6rem;
		border-radius: 12px;
		font-weight: 600;
	}

	.keywords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.keyword {
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: 0.85rem;
		padding: 0.25rem 0.6rem;
		border-radius: 12px;
	}

	.card-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.card-preview {
		width: 270px;
		height: 480px;
		overflow: hidden;
		border-radius: 8px;
		position: relative;
	}
	.card-preview > :global(*) {
		transform: scale(0.25);
		transform-origin: top left;
	}

	@media (max-width: 480px) {
		.summary {
			grid-template-columns: 1fr;
		}

		.p-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
