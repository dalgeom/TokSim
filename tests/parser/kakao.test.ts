import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseKakaoChat } from '$lib/parser/kakao';

function fixture(name: string): string {
	return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8');
}

describe('parseKakaoChat', () => {
	it('빈 입력 시 에러 반환', () => {
		const result = parseKakaoChat('');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();

		const result2 = parseKakaoChat('   \n  \n  ');
		expect(result2.success).toBe(false);
	});

	it('PC 포맷 1:1 대화 파싱', () => {
		const raw = fixture('pc-duo.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();

		const { messages, participants } = result.data!;
		expect(participants).toHaveLength(2);
		expect(participants.map((p) => p.name).sort()).toEqual(['김철수', '홍길동']);
		// 9 lines that are messages (including multiline as 1 message)
		expect(messages.length).toBeGreaterThanOrEqual(8);
	});

	it('모바일 포맷 파싱', () => {
		const raw = fixture('mobile-duo.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();

		const { messages, participants } = result.data!;
		expect(participants).toHaveLength(2);
		expect(messages).toHaveLength(3);
		expect(messages[0].sender).toBe('홍길동');
		expect(messages[0].content).toBe('안녕하세요');
	});

	it('그룹채팅 참여자 3명 이상 감지', () => {
		const raw = fixture('pc-group.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { participants } = result.data!;
		expect(participants.length).toBeGreaterThanOrEqual(3);
		expect(participants.map((p) => p.name).sort()).toEqual(['김철수', '이영희', '홍길동']);
	});

	it('날짜 헤더 없는 대화 (fallback 날짜)', () => {
		const raw = fixture('no-header.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { messages } = result.data!;
		expect(messages).toHaveLength(2);
		// fallback은 오늘 날짜를 사용
		const today = new Date();
		expect(messages[0].timestamp.getFullYear()).toBe(today.getFullYear());
		expect(messages[0].timestamp.getMonth() + 1).toBe(today.getMonth() + 1);
		expect(messages[0].timestamp.getDate()).toBe(today.getDate());
	});

	it('미디어 타입 감지', () => {
		const raw = fixture('pc-duo.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { messages } = result.data!;
		const types = messages.map((m) => m.type);
		expect(types).toContain('photo');
		expect(types).toContain('emoticon');
		expect(types).toContain('video');
		expect(types).toContain('voice');
		expect(types).toContain('deleted');
	});

	it('멀티라인 메시지 처리', () => {
		const raw = fixture('pc-duo.txt');
		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { messages } = result.data!;
		const multiline = messages.find((m) => m.content.includes('\n'));
		expect(multiline).toBeDefined();
		expect(multiline!.content).toBe('여러 줄\n메시지입니다');
	});

	it('시스템 메시지 스킵', () => {
		const raw = [
			'--------------- 2024년 1월 15일 월요일 ---------------',
			'홍길동님이 들어왔습니다.',
			'[홍길동] [오후 3:42] 안녕하세요',
			'김철수님이 홍길동님을 초대했습니다.',
			'[김철수] [오후 3:43] 반가워요'
		].join('\n');

		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);
		expect(result.data!.messages).toHaveLength(2);
	});

	it('오전 12시 = 0시, 오후 12시 = 12시', () => {
		const raw = [
			'--------------- 2024년 1월 15일 월요일 ---------------',
			'[홍길동] [오전 12:05] 자정 메시지',
			'[김철수] [오후 12:30] 정오 메시지'
		].join('\n');

		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { messages } = result.data!;
		expect(messages[0].timestamp.getHours()).toBe(0);
		expect(messages[0].timestamp.getMinutes()).toBe(5);
		expect(messages[1].timestamp.getHours()).toBe(12);
		expect(messages[1].timestamp.getMinutes()).toBe(30);
	});

	it('날짜 헤더 day 파싱 정확성 (day-1 버그 검출)', () => {
		const raw = [
			'--------------- 2024년 1월 15일 월요일 ---------------',
			'[홍길동] [오후 3:42] 안녕하세요'
		].join('\n');

		const result = parseKakaoChat(raw);
		expect(result.success).toBe(true);

		const { messages } = result.data!;
		// 날짜 헤더에 15일이라고 적혀 있으므로 메시지 날짜도 15일이어야 함
		expect(messages[0].timestamp.getDate()).toBe(15);
		expect(messages[0].timestamp.getMonth() + 1).toBe(1);
		expect(messages[0].timestamp.getFullYear()).toBe(2024);
	});
});
