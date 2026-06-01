import { describe, it, expect } from 'vitest';
import { BADGE_TYPES, BADGE_SLUGS, BADGE_LIST, getBadge } from '$lib/badges/types';

describe('BADGE_TYPES', () => {
	it('11종(10 + fallback) 정의, 슬러그 유일', () => {
		expect(BADGE_SLUGS.length).toBe(11);
		expect(new Set(BADGE_SLUGS).size).toBe(11);
		expect(BADGE_SLUGS).toContain('normal');
	});

	it('모든 배지가 필수 필드를 가짐', () => {
		for (const b of BADGE_LIST) {
			expect(b.slug).toBeTruthy();
			expect(b.emoji).toBeTruthy();
			expect(b.name).toBeTruthy();
			expect(b.tagline).toBeTruthy();
			expect(b.description).toBeTruthy();
			expect(b.accent).toMatch(/^#[0-9a-f]{6}$/i);
			expect(b.accent2).toMatch(/^#[0-9a-f]{6}$/i);
			expect(b.rarity).toBeTruthy();
		}
	});

	it('getBadge: 유효 슬러그 반환, 무효 슬러그 undefined', () => {
		expect(getBadge('vampire')?.name).toBe('에너지뱀파이어');
		expect(getBadge('nope')).toBeUndefined();
	});
});
