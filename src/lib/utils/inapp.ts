export type Platform = 'android' | 'ios' | 'pc';

/** UA에 KAKAOTALK 포함 = 카톡 인앱브라우저(파일 업로드/클립보드 차단 환경). */
export function isKakaoInApp(ua: string): boolean {
	return /kakaotalk/i.test(ua);
}

export function detectPlatform(ua: string): Platform {
	if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
	if (/android/i.test(ua)) return 'android';
	return 'pc';
}

/** 카톡 인앱 → 외부 브라우저 탈출 딥링크. */
export function kakaoExternalUrl(targetUrl: string): string {
	return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(targetUrl);
}

export function openExternalKakao(targetUrl: string): void {
	window.location.href = kakaoExternalUrl(targetUrl);
}
