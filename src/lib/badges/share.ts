/**
 * 타입 배지 공유 URL — C+ 하이브리드.
 * 경로=타입 슬러그(봇이 읽는 정적 OG), fragment=이름(사람용 개인화, 서버 미전송).
 */
export function buildShareUrl(origin: string, slug: string, name: string): string {
	return `${origin}/r/${slug}#n=${encodeURIComponent(name)}`;
}
