<script lang="ts">
	let { onclick }: { onclick?: () => void } = $props();
</script>

<button class="chat-preview" {onclick} aria-label="대화 입력 영역으로 이동">
	<div class="kakao-window">
		<div class="kakao-header">
			<span class="chat-name">수진 💕</span>
			<span class="chat-members">2</span>
		</div>
		<div class="kakao-body">
			<div class="date-divider">2025년 5월 18일 일요일</div>

			<div class="msg-row left">
				<div class="avatar">수</div>
				<div class="msg-content">
					<span class="sender">수진</span>
					<div class="bubble-group">
						<div class="bubble left-bubble">오빠 뭐해?? 😊</div>
						<span class="time">오후 3:42</span>
					</div>
				</div>
			</div>

			<div class="msg-row right">
				<div class="bubble-group">
					<span class="time">오후 3:43</span>
					<div class="bubble right-bubble">집에서 쉬고 있어 ㅋㅋ</div>
				</div>
			</div>

			<div class="msg-row left">
				<div class="avatar">수</div>
				<div class="msg-content">
					<div class="bubble-group">
						<div class="bubble left-bubble">나 오늘 뭔가 맛있는거 먹고 싶어</div>
						<span class="time">오후 3:44</span>
					</div>
				</div>
			</div>

			<div class="msg-row right">
				<div class="bubble-group">
					<span class="time">오후 3:44</span>
					<div class="bubble right-bubble">어디 갈까?</div>
				</div>
			</div>

			<div class="msg-row left">
				<div class="avatar">수</div>
				<div class="msg-content">
					<div class="bubble-group">
						<div class="bubble left-bubble">홍대 그 파스타집!! 🍝</div>
						<span class="time">오후 3:45</span>
					</div>
				</div>
			</div>

			<div class="msg-row right">
				<div class="bubble-group">
					<span class="time">오후 3:45</span>
					<div class="bubble right-bubble">ㅋㅋㅋ 알겠어 가자</div>
				</div>
			</div>

			<div class="msg-row left">
				<div class="avatar">수</div>
				<div class="msg-content">
					<div class="bubble-group">
						<div class="bubble left-bubble">역시 최고야 ㅎㅎ 💕</div>
						<span class="time">오후 3:46</span>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="overlay">
		<span class="overlay-text">👆 클릭해서 대화를 붙여넣으세요</span>
	</div>
</button>

<style>
	.chat-preview {
		position: relative;
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		cursor: pointer;
		border: 2px solid var(--border);
		background: none;
		padding: 0;
		text-align: left;
		font-family: inherit;
		transition: border-color 0.2s;
	}
	.chat-preview:hover {
		border-color: var(--neon-purple);
	}
	.chat-preview:hover .overlay {
		opacity: 1;
	}

	.kakao-window {
		width: 100%;
	}

	.kakao-header {
		background: #3c1e1e;
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.chat-name {
		color: #e5e5e5;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.chat-members {
		color: #888;
		font-size: 0.75rem;
	}

	.kakao-body {
		background: #1a1a2e;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 280px;
	}

	.date-divider {
		text-align: center;
		font-size: 0.7rem;
		color: #666680;
		padding: 4px 0 8px;
	}

	.msg-row {
		display: flex;
		gap: 6px;
		align-items: flex-end;
	}
	.msg-row.right {
		justify-content: flex-end;
	}
	.msg-row.left {
		justify-content: flex-start;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		align-self: flex-start;
	}

	.msg-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.sender {
		font-size: 0.7rem;
		color: #a0a0b0;
		padding-left: 2px;
	}

	.bubble-group {
		display: flex;
		align-items: flex-end;
		gap: 4px;
	}

	.bubble {
		padding: 7px 11px;
		border-radius: 12px;
		font-size: 0.82rem;
		line-height: 1.4;
		max-width: 220px;
		word-break: break-word;
	}
	.left-bubble {
		background: #2a2a4a;
		color: #e5e5e5;
		border-top-left-radius: 4px;
	}
	.right-bubble {
		background: #a855f7;
		color: white;
		border-top-right-radius: 4px;
	}

	.time {
		font-size: 0.6rem;
		color: #666680;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 10, 10, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.overlay-text {
		background: rgba(168, 85, 247, 0.9);
		color: white;
		padding: 10px 20px;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	@media (max-width: 480px) {
		.kakao-body {
			min-height: 240px;
			padding: 10px 10px;
		}
		.bubble {
			max-width: 180px;
			font-size: 0.78rem;
		}
	}
</style>
