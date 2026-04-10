import type { ChatData, Message } from '$lib/types';

const RECENT_COUNT = 20;
const RANDOM_COUNT = 30;

export interface SampledMessage {
	sender: string;
	content: string;
	timestamp: string;
}

function toSample(m: Message): SampledMessage {
	return {
		sender: m.sender,
		content: m.content,
		timestamp: m.timestamp.toISOString()
	};
}

export function sampleMessages(data: ChatData): SampledMessage[] {
	const textMessages = data.messages.filter((m) => m.type === 'text');

	if (textMessages.length <= RECENT_COUNT + RANDOM_COUNT) {
		return textMessages.map(toSample);
	}

	const recent = textMessages.slice(-RECENT_COUNT);
	const older = textMessages.slice(0, -RECENT_COUNT);

	const randomPicks: Message[] = [];
	const picked = new Set<number>();
	while (randomPicks.length < RANDOM_COUNT && picked.size < older.length) {
		const idx = Math.floor(Math.random() * older.length);
		if (picked.has(idx)) continue;
		picked.add(idx);
		randomPicks.push(older[idx]);
	}

	const combined = [...randomPicks, ...recent].sort(
		(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
	);

	return combined.map(toSample);
}
