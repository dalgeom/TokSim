import { describe, it, expect } from 'vitest';
import { classifyGroup } from '$lib/analyzer/classifier';
import type { ParticipantStats } from '$lib/types';

// 필요한 필드만 채우는 헬퍼(나머지 0)
function p(over: Partial<ParticipantStats> & { name: string; messageRatio: number }): ParticipantStats {
	return {
		name: over.name, messageCount: over.messageCount ?? 50, messageRatio: over.messageRatio,
		avgReplyMinutes: over.avgReplyMinutes ?? 5, totalChars: 0,
		avgCharsPerMessage: over.avgCharsPerMessage ?? 12, kCount: 0, hCount: over.hCount ?? 0,
		tearCount: 0, avgKPerMessage: over.avgKPerMessage ?? 0, photoCount: over.photoCount ?? 0,
		videoCount: 0, emoticonCount: over.emoticonCount ?? 0, voiceCount: 0, fileCount: 0,
		mediaRatio: 0, conversationStarts: over.conversationStarts ?? 0
	};
}
const slugOf = (r: ReturnType<typeof classifyGroup>, name: string) => r.find((x) => x.name === name)!.slug;

describe('classifyGroup v3', () => {
	it('명확한 수다왕 + 유령, 건조방엔 리액션봇 없음(floor)', () => {
		// 전원 ㅋ=0(건조) — v0 버그(리액션 0인데 리액션봇) 방지 검증
		// 최다 발화자가 대화 시작도 가장 많아도 vampire 아닌 king이어야 함(규칙 #2: 볼륨 우선 ×1.5)
		const r = classifyGroup([
			p({ name: '수다', messageRatio: 0.55, conversationStarts: 4 }),
			p({ name: '보통A', messageRatio: 0.3, conversationStarts: 3 }),
			p({ name: '보통B', messageRatio: 0.12, conversationStarts: 2 }),
			p({ name: '유령', messageRatio: 0.03, conversationStarts: 1 })
		]);
		expect(slugOf(r, '수다')).toBe('king');
		expect(slugOf(r, '유령')).toBe('ghost');
		expect(r.every((x) => x.slug !== 'reactionbot')).toBe(true); // floor
		expect(slugOf(r, '보통A')).toBe('normal');
	});

	it('읽씹왕: 답장 최하(느림)+절대임계 통과', () => {
		const r = classifyGroup([
			p({ name: '빠름1', messageRatio: 0.3, avgReplyMinutes: 3 }),
			p({ name: '빠름2', messageRatio: 0.3, avgReplyMinutes: 5 }),
			p({ name: '느림', messageRatio: 0.2, avgReplyMinutes: 45 }),
			p({ name: '보통', messageRatio: 0.2, avgReplyMinutes: 8 })
		]);
		expect(slugOf(r, '느림')).toBe('seenzone');
	});

	it('무한리액션봇: kh≥0.8 && 단답(len≤8)', () => {
		const r = classifyGroup([
			p({ name: '리액션', messageRatio: 0.25, avgKPerMessage: 1.4, avgCharsPerMessage: 6 }),
			p({ name: 'a', messageRatio: 0.25 }),
			p({ name: 'b', messageRatio: 0.25 }),
			p({ name: 'c', messageRatio: 0.25 })
		]);
		expect(slugOf(r, '리액션')).toBe('reactionbot');
	});

	it('장문 vs 팩트 분리: 감정신호 유무로 갈림', () => {
		const r = classifyGroup([
			p({ name: '장문', messageRatio: 0.25, avgCharsPerMessage: 30, avgKPerMessage: 0.5, hCount: 20 }),
			p({ name: '팩트', messageRatio: 0.25, avgCharsPerMessage: 30, avgKPerMessage: 0.02, emoticonCount: 0 }),
			p({ name: 'a', messageRatio: 0.25 }),
			p({ name: 'b', messageRatio: 0.25 })
		]);
		expect(slugOf(r, '장문')).toBe('essayist');
		expect(slugOf(r, '팩트')).toBe('factbomber');
	});

	it('애매하면 평범한수다러(fallback)', () => {
		const r = classifyGroup([
			p({ name: 'a', messageRatio: 0.26 }),
			p({ name: 'b', messageRatio: 0.25 }),
			p({ name: 'c', messageRatio: 0.25 }),
			p({ name: 'd', messageRatio: 0.24 })
		]);
		expect(r.every((x) => x.slug === 'normal')).toBe(true);
	});
});
