<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { analyzeStatistics } from '$lib/analyzer/statistics';
	import type { ChatData, Statistics } from '$lib/types';

	let stats = $state<Statistics | null>(null);
	let error = $state<string | null>(null);

	const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

	function reviveChatData(json: string): ChatData {
		const raw = JSON.parse(json);
		return {
			...raw,
			startDate: new Date(raw.startDate),
			endDate: new Date(raw.endDate),
			messages: raw.messages.map((m: { timestamp: string }) => ({
				...m,
				timestamp: new Date(m.timestamp)
			}))
		};
	}

	onMount(() => {
		try {
			const stored = sessionStorage.getItem('toksim:chatData');
			if (!stored) {
				error = '분석할 대화 데이터가 없습니다.';
				return;
			}
			const chatData = reviveChatData(stored);
			stats = analyzeStatistics(chatData);
		} catch (e) {
			error = '데이터를 불러오는 중 오류가 발생했습니다.';
			console.error(e);
		}
	});

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

		<p class="footnote">AI 분석 기능은 3일차에 추가될 예정입니다.</p>
	{:else}
		<p class="loading">분석 중...</p>
	{/if}
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif;
		color: #333;
	}

	header {
		margin-bottom: 2rem;
	}

	.back {
		background: none;
		border: none;
		color: #666;
		font-size: 0.95rem;
		cursor: pointer;
		padding: 0;
		margin-bottom: 0.5rem;
	}

	.back:hover {
		color: #000;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
	}

	.error-box {
		padding: 2rem;
		background: #fee;
		border-radius: 12px;
		text-align: center;
	}

	.error-box button {
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: #fee500;
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
		background: #fffbe6;
		border: 2px solid #fee500;
		border-radius: 12px;
		padding: 1.25rem 0.5rem;
		text-align: center;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: bold;
		color: #3c1e1e;
	}

	.stat-label {
		font-size: 0.85rem;
		color: #666;
		margin-top: 0.25rem;
	}

	.period {
		text-align: center;
		color: #777;
		font-size: 0.9rem;
		margin-bottom: 2rem;
	}

	.block {
		background: #f8f8f8;
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
		border-bottom: 1px solid #e5e5e5;
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
		color: #888;
		font-size: 0.9rem;
	}

	.bar {
		height: 8px;
		background: #e5e5e5;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.bar-fill {
		height: 100%;
		background: #fee500;
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
		color: #888;
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
		background: #fee500;
		border-radius: 2px 2px 0 0;
		min-height: 1px;
	}

	.hour-label {
		font-size: 0.65rem;
		color: #999;
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
		background: #e5e5e5;
		border-radius: 4px;
		overflow: hidden;
	}

	.weekday-fill {
		height: 100%;
		background: #fee500;
	}

	.weekday-count {
		text-align: right;
		color: #666;
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
		border-bottom: 1px dashed #e5e5e5;
	}

	.word-list li:last-child {
		border-bottom: none;
	}

	.word {
		font-weight: 600;
	}

	.count {
		color: #888;
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
		background: white;
		border-radius: 8px;
	}

	.media-item span {
		font-size: 0.85rem;
		color: #666;
	}

	.media-item strong {
		font-size: 1.25rem;
	}

	.footnote {
		text-align: center;
		color: #999;
		font-size: 0.85rem;
		margin-top: 2rem;
	}

	.loading {
		text-align: center;
		color: #888;
		padding: 3rem 0;
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
