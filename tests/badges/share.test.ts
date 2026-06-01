import { describe, it, expect } from 'vitest';
import { buildShareUrl } from '$lib/badges/share';

describe('buildShareUrl', () => {
	it('경로=타입 슬러그, fragment=인코딩된 이름 (C+ 하이브리드)', () => {
		expect(buildShareUrl('https://toksim.pages.dev', 'king', '민지')).toBe(
			'https://toksim.pages.dev/r/king#n=%EB%AF%BC%EC%A7%80'
		);
	});

	it('특수문자 이름도 안전하게 인코딩', () => {
		expect(buildShareUrl('http://localhost:5173', 'ghost', 'A&B')).toBe(
			'http://localhost:5173/r/ghost#n=A%26B'
		);
	});
});
