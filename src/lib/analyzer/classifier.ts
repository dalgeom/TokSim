import type { ParticipantStats } from '$lib/types';
import type { BadgeSlug } from '$lib/badges/types';

export interface BadgeAssignment {
	name: string;
	slug: BadgeSlug;
	confidence: number;
}

interface Candidate {
	slug: BadgeSlug;
	conf: number;
}

/**
 * 분류기 v3 (docs/type-badge-taxonomy.md §11).
 * 각 참여자에 대해 절대 floor 게이트를 통과한 후보를 모으고 conf=값/floor 최댓값을 배정.
 * 후보 없으면 'normal'(평범한수다러). 단톡방(group) 전용.
 */
export function classifyGroup(participants: ParticipantStats[]): BadgeAssignment[] {
	const N = participants.length;
	if (N === 0) return [];
	const base = 1 / N;

	const shares = participants.map((x) => x.messageRatio);
	const maxShare = Math.max(...shares);
	const minShare = Math.min(...shares);

	const replyVals = participants
		.map((x) => x.avgReplyMinutes)
		.filter((v): v is number => v != null);
	const maxReply = replyVals.length ? Math.max(...replyVals) : null;

	const totalStarts = participants.reduce((s, x) => s + x.conversationStarts, 0);

	return participants.map((x) => {
		const mc = x.messageCount || 1;
		const share = x.messageRatio;
		const reply = x.avgReplyMinutes;
		const avgK = x.avgKPerMessage;
		const kh = avgK + x.hCount / mc;
		const emo = x.emoticonCount / mc;
		const media = (x.photoCount + x.videoCount + x.fileCount) / mc;
		const len = x.avgCharsPerMessage;
		const startShare = totalStarts > 0 ? x.conversationStarts / totalStarts : 0;

		const c: Candidate[] = [];

		// 👑 수다왕 — 최다 발화 우선(×1.5)
		if (share === maxShare && share >= base * 1.4)
			c.push({ slug: 'king', conf: (share / (base * 1.4)) * 1.5 });
		// 👻 유령
		if (share === minShare && share <= base * 0.55 && share > 0)
			c.push({ slug: 'ghost', conf: (base * 0.55) / share });
		// 💤 읽씹왕
		if (reply != null && reply >= 20 && reply === maxReply)
			c.push({ slug: 'seenzone', conf: reply / 20 });
		// 🧛 에너지뱀파이어 (저리액션은 절대값 kh<0.4)
		if (startShare >= base * 1.6 && kh < 0.4)
			c.push({ slug: 'vampire', conf: startShare / (base * 1.6) });
		// 🤣 무한리액션봇
		if (kh >= 0.8 && len <= 8)
			c.push({ slug: 'reactionbot', conf: kh / 0.8 });
		// 🎭 이모티콘부자
		if (emo >= 0.2)
			c.push({ slug: 'emojirich', conf: emo / 0.2 });
		// 📷 사진폭격기
		if (media >= 0.2)
			c.push({ slug: 'photobomber', conf: media / 0.2 });
		// 🧊 팩트폭격기
		const isFact = len >= 15 && avgK < 0.15 && emo < 0.05;
		if (isFact)
			c.push({ slug: 'factbomber', conf: len / 15 });
		// 📚 장문주의자 (팩트 아닐 때만)
		if (len >= 20 && !isFact)
			c.push({ slug: 'essayist', conf: len / 20 });
		// 🎉 분위기메이커 (중간 길이 8~25자 전용)
		if (kh >= 0.5 && len > 8 && len <= 25 && share >= base && share < maxShare)
			c.push({ slug: 'moodmaker', conf: kh / 0.5 });

		if (c.length === 0) return { name: x.name, slug: 'normal', confidence: 1 };
		const best = c.reduce((a, b) => (b.conf > a.conf ? b : a));
		return { name: x.name, slug: best.slug, confidence: best.conf };
	});
}
