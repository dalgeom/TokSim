<script lang="ts">
	import type { Statistics, AIAnalysis } from '$lib/types';

	type CardType = 'summary' | 'personality' | 'relationship' | 'chatking' | 'participation';

	interface Props {
		type: CardType;
		stats: Statistics;
		aiAnalysis: AIAnalysis | null;
		mode: 'duo' | 'group';
	}

	let { type, stats, aiAnalysis, mode }: Props = $props();

	function formatNumber(n: number): string {
		return n.toLocaleString('ko-KR');
	}

	function getTopParticipant() {
		if (!stats.participants.length) return null;
		return [...stats.participants].sort((a, b) => b.messageCount - a.messageCount)[0];
	}

	function getParticipationData() {
		const total = stats.participants.reduce((s, p) => s + p.messageCount, 0);
		return stats.participants
			.map((p) => ({
				name: p.name,
				count: p.messageCount,
				percent: total > 0 ? (p.messageCount / total) * 100 : 0
			}))
			.sort((a, b) => b.count - a.count);
	}

	const barColors = ['#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
</script>

<div class="result-card" data-card-type={type}>
	<!-- Common header -->
	<div class="card-header">
		<span class="card-logo">TOKSIM</span>
		<span class="card-badge">
			{#if mode === 'duo'}1:1 분석{:else}그룹 분석{/if}
		</span>
	</div>

	<!-- SUMMARY CARD (duo) -->
	{#if type === 'summary' && mode === 'duo'}
		<div class="card-body summary-duo">
			<p class="card-label">대화 온도</p>
			<div class="temperature-wrap">
				<span class="big-number">{aiAnalysis?.conversationTemperature ?? '??'}</span>
				<span class="big-unit">°</span>
			</div>
			<div class="temp-bar-track">
				<div
					class="temp-bar-fill"
					style="width: {aiAnalysis?.conversationTemperature ?? 0}%"
				></div>
			</div>
			<div class="temp-bar-labels">
				<span>0°</span>
				<span>50°</span>
				<span>100°</span>
			</div>
			{#if aiAnalysis?.oneLineSummary}
				<p class="one-line-summary">"{aiAnalysis.oneLineSummary}"</p>
			{/if}
			<div class="stat-pills">
				<div class="stat-pill">
					<span class="pill-value">{formatNumber(stats.totalMessages)}</span>
					<span class="pill-label">메시지</span>
				</div>
				<div class="stat-pill">
					<span class="pill-value">{stats.totalDays}</span>
					<span class="pill-label">일</span>
				</div>
				<div class="stat-pill">
					<span class="pill-value">{stats.participants.length}</span>
					<span class="pill-label">참여자</span>
				</div>
			</div>
		</div>

	<!-- SUMMARY CARD (group) -->
	{:else if type === 'summary' && mode === 'group'}
		<div class="card-body summary-group">
			<p class="card-label">그룹 분위기</p>
			<p class="group-mood">{aiAnalysis?.groupMood ?? '분석 중...'}</p>
			{#if aiAnalysis?.oneLineSummary}
				<p class="one-line-summary">"{aiAnalysis.oneLineSummary}"</p>
			{/if}
			<div class="stat-pills">
				<div class="stat-pill">
					<span class="pill-value">{stats.participants.length}</span>
					<span class="pill-label">참여자</span>
				</div>
				<div class="stat-pill">
					<span class="pill-value">{formatNumber(stats.totalMessages)}</span>
					<span class="pill-label">메시지</span>
				</div>
				<div class="stat-pill">
					<span class="pill-value">{stats.totalDays}</span>
					<span class="pill-label">일</span>
				</div>
			</div>
		</div>

	<!-- PERSONALITY CARD -->
	{:else if type === 'personality'}
		<div class="card-body personality">
			<p class="card-label">말투 & 성격 분석</p>
			<div class="persona-grid" class:single={stats.participants.length === 1}>
				{#each (aiAnalysis?.participants ?? []) as persona, i}
					<div class="persona-item">
						<div class="persona-avatar" style="background: {barColors[i % barColors.length]}">
							{persona.name.charAt(0)}
						</div>
						<p class="persona-name">{persona.name}</p>
						<div class="speech-badge" style="border-color: {barColors[i % barColors.length]}">
							{persona.speechStyle}
						</div>
						<div class="keyword-list">
							{#each persona.personalityKeywords as kw}
								<span class="keyword-tag">#{kw}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

	<!-- RELATIONSHIP CARD (duo only) -->
	{:else if type === 'relationship' && mode === 'duo'}
		<div class="card-body relationship">
			<p class="card-label">관계 역학</p>
			<p class="relationship-dynamic">{aiAnalysis?.relationshipDynamic ?? '분석 중...'}</p>

			{#if stats.participants.length >= 2}
				<div class="versus-section">
					<div class="versus-person">
						<div class="versus-avatar" style="background: #a855f7">
							{stats.participants[0].name.charAt(0)}
						</div>
						<p class="versus-name">{stats.participants[0].name}</p>
						<p class="versus-stat">{stats.participants[0].conversationStarts}회</p>
						<p class="versus-label">먼저 말 걸기</p>
					</div>
					<div class="versus-divider">
						<span class="vs-text">VS</span>
					</div>
					<div class="versus-person">
						<div class="versus-avatar" style="background: #ec4899">
							{stats.participants[1].name.charAt(0)}
						</div>
						<p class="versus-name">{stats.participants[1].name}</p>
						<p class="versus-stat">{stats.participants[1].conversationStarts}회</p>
						<p class="versus-label">먼저 말 걸기</p>
					</div>
				</div>
			{/if}
		</div>

	<!-- CHATKING CARD (group only) -->
	{:else if type === 'chatking' && mode === 'group'}
		{@const top = getTopParticipant()}
		<div class="card-body chatking">
			<p class="card-label">채팅왕</p>
			<div class="crown-icon">&#128081;</div>
			{#if top}
				<p class="chatking-name">{top.name}</p>
				<p class="chatking-count">{formatNumber(top.messageCount)}</p>
				<p class="chatking-unit">메시지</p>
			{/if}
			{#if aiAnalysis?.mvp}
				<div class="mvp-badge">MVP: {aiAnalysis.mvp}</div>
			{/if}
		</div>

	<!-- PARTICIPATION CARD (group only) -->
	{:else if type === 'participation' && mode === 'group'}
		{@const data = getParticipationData()}
		<div class="card-body participation">
			<p class="card-label">참여율</p>
			<div class="bar-chart">
				{#each data as row, i}
					<div class="bar-row">
						<span class="bar-name">{row.name}</span>
						<div class="bar-track">
							<div
								class="bar-fill"
								style="width: {row.percent}%; background: {barColors[i % barColors.length]}"
							></div>
						</div>
						<span class="bar-percent">{row.percent.toFixed(1)}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Watermark -->
	<div class="card-watermark">toksim.pages.dev</div>
</div>

<style>
	.result-card {
		width: 1080px;
		height: 1920px;
		background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
		border-radius: 0;
		display: flex;
		flex-direction: column;
		padding: 80px 72px;
		font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
		color: #e5e5e5;
		position: relative;
		overflow: hidden;
	}

	/* Subtle glow overlay */
	.result-card::before {
		content: '';
		position: absolute;
		top: -200px;
		right: -200px;
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%);
		pointer-events: none;
	}
	.result-card::after {
		content: '';
		position: absolute;
		bottom: -200px;
		left: -200px;
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(236, 72, 153, 0.10) 0%, transparent 70%);
		pointer-events: none;
	}

	/* Header */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 64px;
		position: relative;
		z-index: 1;
	}
	.card-logo {
		font-size: 48px;
		font-weight: 900;
		letter-spacing: 6px;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.card-badge {
		font-size: 28px;
		font-weight: 600;
		padding: 12px 32px;
		border-radius: 999px;
		border: 2px solid #2a2a4a;
		color: #a0a0b0;
	}

	/* Card body shared */
	.card-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 1;
	}
	.card-label {
		font-size: 36px;
		font-weight: 600;
		color: #a0a0b0;
		margin: 0 0 40px 0;
		text-transform: uppercase;
		letter-spacing: 4px;
	}

	/* ===== SUMMARY DUO ===== */
	.summary-duo {
		align-items: center;
		justify-content: center;
	}
	.summary-duo .card-label {
		text-align: center;
	}
	.temperature-wrap {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		margin-bottom: 48px;
	}
	.big-number {
		font-size: 220px;
		font-weight: 900;
		line-height: 1;
		background: linear-gradient(135deg, #a855f7, #ec4899, #3b82f6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.big-unit {
		font-size: 100px;
		font-weight: 700;
		color: #a855f7;
		margin-top: 20px;
	}
	.temp-bar-track {
		width: 100%;
		max-width: 800px;
		height: 24px;
		background: #1e1e3a;
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 16px;
	}
	.temp-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #a855f7, #ec4899);
		border-radius: 12px;
		transition: width 0.3s;
	}
	.temp-bar-labels {
		width: 100%;
		max-width: 800px;
		display: flex;
		justify-content: space-between;
		font-size: 24px;
		color: #666680;
		margin-bottom: 64px;
	}
	.one-line-summary {
		font-size: 40px;
		font-weight: 600;
		text-align: center;
		color: #e5e5e5;
		line-height: 1.5;
		margin: 0 0 64px 0;
		padding: 0 24px;
		word-break: keep-all;
	}
	.stat-pills {
		display: flex;
		gap: 32px;
		justify-content: center;
	}
	.stat-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #2a2a4a;
		border-radius: 24px;
		padding: 32px 48px;
		min-width: 200px;
	}
	.pill-value {
		font-size: 48px;
		font-weight: 800;
		color: #e5e5e5;
	}
	.pill-label {
		font-size: 24px;
		color: #666680;
		margin-top: 8px;
	}

	/* ===== SUMMARY GROUP ===== */
	.summary-group {
		align-items: center;
		justify-content: center;
	}
	.summary-group .card-label {
		text-align: center;
	}
	.group-mood {
		font-size: 80px;
		font-weight: 900;
		text-align: center;
		line-height: 1.3;
		margin: 0 0 48px 0;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		word-break: keep-all;
	}

	/* ===== PERSONALITY ===== */
	.personality {
		justify-content: flex-start;
	}
	.persona-grid {
		display: flex;
		gap: 48px;
		justify-content: center;
		flex-wrap: wrap;
		flex: 1;
		align-content: center;
	}
	.persona-grid.single {
		justify-content: center;
	}
	.persona-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 0 0 auto;
		width: 420px;
	}
	.persona-avatar {
		width: 160px;
		height: 160px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 72px;
		font-weight: 800;
		color: #0a0a0a;
		margin-bottom: 32px;
	}
	.persona-name {
		font-size: 44px;
		font-weight: 700;
		margin: 0 0 24px 0;
		color: #e5e5e5;
	}
	.speech-badge {
		font-size: 32px;
		font-weight: 600;
		padding: 14px 40px;
		border-radius: 999px;
		border: 2px solid;
		color: #e5e5e5;
		margin-bottom: 32px;
	}
	.keyword-list {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		justify-content: center;
	}
	.keyword-tag {
		font-size: 28px;
		font-weight: 500;
		color: #a0a0b0;
		background: rgba(255, 255, 255, 0.06);
		padding: 10px 24px;
		border-radius: 12px;
	}

	/* ===== RELATIONSHIP ===== */
	.relationship {
		align-items: center;
		justify-content: center;
	}
	.relationship .card-label {
		text-align: center;
	}
	.relationship-dynamic {
		font-size: 56px;
		font-weight: 800;
		text-align: center;
		line-height: 1.4;
		margin: 0 0 80px 0;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		word-break: keep-all;
	}
	.versus-section {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 40px;
		width: 100%;
	}
	.versus-person {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}
	.versus-avatar {
		width: 130px;
		height: 130px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 56px;
		font-weight: 800;
		color: #0a0a0a;
		margin-bottom: 24px;
	}
	.versus-name {
		font-size: 36px;
		font-weight: 700;
		margin: 0 0 16px 0;
		color: #e5e5e5;
	}
	.versus-stat {
		font-size: 64px;
		font-weight: 900;
		margin: 0;
		color: #e5e5e5;
	}
	.versus-label {
		font-size: 26px;
		color: #666680;
		margin: 8px 0 0 0;
	}
	.versus-divider {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.vs-text {
		font-size: 52px;
		font-weight: 900;
		color: #2a2a4a;
	}

	/* ===== CHATKING ===== */
	.chatking {
		align-items: center;
		justify-content: center;
	}
	.chatking .card-label {
		text-align: center;
	}
	.crown-icon {
		font-size: 120px;
		margin-bottom: 32px;
	}
	.chatking-name {
		font-size: 80px;
		font-weight: 900;
		margin: 0 0 24px 0;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.chatking-count {
		font-size: 160px;
		font-weight: 900;
		line-height: 1;
		margin: 0;
		color: #e5e5e5;
	}
	.chatking-unit {
		font-size: 36px;
		color: #666680;
		margin: 16px 0 48px 0;
	}
	.mvp-badge {
		font-size: 32px;
		font-weight: 600;
		padding: 16px 48px;
		border-radius: 999px;
		background: rgba(168, 85, 247, 0.15);
		border: 2px solid #a855f7;
		color: #a855f7;
	}

	/* ===== PARTICIPATION ===== */
	.participation {
		justify-content: center;
	}
	.participation .card-label {
		text-align: center;
	}
	.bar-chart {
		display: flex;
		flex-direction: column;
		gap: 36px;
		width: 100%;
	}
	.bar-row {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.bar-name {
		font-size: 32px;
		font-weight: 600;
		color: #e5e5e5;
		width: 200px;
		text-align: right;
		flex-shrink: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bar-track {
		flex: 1;
		height: 48px;
		background: #1e1e3a;
		border-radius: 12px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 12px;
		min-width: 8px;
	}
	.bar-percent {
		font-size: 32px;
		font-weight: 700;
		color: #a0a0b0;
		width: 120px;
		text-align: left;
		flex-shrink: 0;
	}

	/* ===== WATERMARK ===== */
	.card-watermark {
		text-align: center;
		font-size: 28px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 3px;
		margin-top: auto;
		padding-top: 48px;
		position: relative;
		z-index: 1;
	}
</style>
