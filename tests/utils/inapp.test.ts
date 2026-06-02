import { describe, it, expect } from 'vitest';
import { isKakaoInApp, detectPlatform, kakaoExternalUrl } from '$lib/utils/inapp';

const UA = {
	androidKakao:
		'Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.5.0',
	iosKakao:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.5.0',
	desktopChrome:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	mobileSafari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
};

describe('isKakaoInApp', () => {
	it('카톡 인앱 UA 감지', () => {
		expect(isKakaoInApp(UA.androidKakao)).toBe(true);
		expect(isKakaoInApp(UA.iosKakao)).toBe(true);
	});
	it('일반 브라우저는 false', () => {
		expect(isKakaoInApp(UA.desktopChrome)).toBe(false);
		expect(isKakaoInApp(UA.mobileSafari)).toBe(false);
	});
});

describe('detectPlatform', () => {
	it('android/ios/pc 구분', () => {
		expect(detectPlatform(UA.androidKakao)).toBe('android');
		expect(detectPlatform(UA.iosKakao)).toBe('ios');
		expect(detectPlatform(UA.mobileSafari)).toBe('ios');
		expect(detectPlatform(UA.desktopChrome)).toBe('pc');
	});
});

describe('kakaoExternalUrl', () => {
	it('openExternal 딥링크 + url 인코딩', () => {
		expect(kakaoExternalUrl('https://toksim.pages.dev/')).toBe(
			'kakaotalk://web/openExternal?url=https%3A%2F%2Ftoksim.pages.dev%2F'
		);
	});
});
