import { describe, it, expect } from 'vitest';
import { analyzeStatistics } from '$lib/analyzer/statistics';
import type { ChatData, Message } from '$lib/types';

function makeMsg(sender: string, content: string, hour: number, minute: number = 0, day: number = 15): Message {
	return {
		timestamp: new Date(2024, 0, day, hour, minute),
		sender,
		content,
		type: 'text'
	};
}

function makeChatData(messages: Message[]): ChatData {
	const senders = new Map<string, number>();
	for (const m of messages) {
		senders.set(m.sender, (senders.get(m.sender) ?? 0) + 1);
	}
	return {
		messages,
		participants: Array.from(senders.entries()).map(([name, messageCount]) => ({ name, messageCount })),
		startDate: messages[0].timestamp,
		endDate: messages[messages.length - 1].timestamp
	};
}

describe('analyzeStatistics', () => {
	it('참여자별 메시지 수와 비율 계산', () => {
		const data = makeChatData([
			makeMsg('A', '안녕', 10),
			makeMsg('A', '반가워', 10),
			makeMsg('B', '네', 10),
		]);
		const stats = analyzeStatistics(data);
		const a = stats.participants.find((p) => p.name === 'A')!;
		const b = stats.participants.find((p) => p.name === 'B')!;
		expect(a.messageCount).toBe(2);
		expect(b.messageCount).toBe(1);
		expect(a.messageRatio).toBeCloseTo(2 / 3);
	});

	it('시간대별 분포 계산', () => {
		const data = makeChatData([
			makeMsg('A', '아침', 9),
			makeMsg('A', '점심', 12),
			makeMsg('A', '저녁', 21),
		]);
		const stats = analyzeStatistics(data);
		expect(stats.hourlyDistribution[9]).toBe(1);
		expect(stats.hourlyDistribution[12]).toBe(1);
		expect(stats.hourlyDistribution[21]).toBe(1);
		expect(stats.hourlyDistribution[0]).toBe(0);
	});

	it('단어 빈도에서 stopwords 필터링', () => {
		const data = makeChatData([
			makeMsg('A', '진짜 맛있다 진짜 좋다 맛있다', 10),
		]);
		const stats = analyzeStatistics(data);
		const words = stats.topWords.map((w) => w.word);
		expect(words).toContain('맛있다');
		expect(words).not.toContain('진짜');
	});

	it('ㅋㅎㅠ 카운트', () => {
		const data = makeChatData([
			makeMsg('A', 'ㅋㅋㅋ 웃기다 ㅎㅎ', 10),
			makeMsg('B', 'ㅠㅠ 슬프다', 10),
		]);
		const stats = analyzeStatistics(data);
		const a = stats.participants.find((p) => p.name === 'A')!;
		const b = stats.participants.find((p) => p.name === 'B')!;
		expect(a.kCount).toBe(3);
		expect(a.hCount).toBe(2);
		expect(b.tearCount).toBe(2);
	});

	it('2명이면 duo 모드', () => {
		const data = makeChatData([
			makeMsg('A', '안녕', 10),
			makeMsg('B', '네', 10),
		]);
		const stats = analyzeStatistics(data);
		expect(stats.mode).toBe('duo');
	});

	it('3명 이상이면 group 모드', () => {
		const data = makeChatData([
			makeMsg('A', '안녕', 10),
			makeMsg('B', '네', 10, 1),
			makeMsg('C', '반가워', 10, 2),
		]);
		const stats = analyzeStatistics(data);
		expect(stats.mode).toBe('group');
	});

	it('group 모드에서 tikitaka 계산', () => {
		const data = makeChatData([
			makeMsg('A', '안녕', 10, 0),
			makeMsg('B', '네', 10, 1),
			makeMsg('A', '뭐해', 10, 2),
			makeMsg('B', '공부', 10, 3),
			makeMsg('C', '나도', 10, 4),
		]);
		const stats = analyzeStatistics(data);
		expect(stats.mode).toBe('group');
		expect(stats.tikitaka).toBeDefined();
		// A→B and B→A should have counts
		const ab = stats.tikitaka!.find(t => t.from === 'A' && t.to === 'B');
		expect(ab).toBeDefined();
		expect(ab!.count).toBeGreaterThanOrEqual(1);
	});
});
