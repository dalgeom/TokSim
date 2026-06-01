import { error } from '@sveltejs/kit';
import { getBadge, BADGE_SLUGS } from '$lib/badges/types';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => BADGE_SLUGS.map((slug) => ({ type: slug }));

export const load: PageLoad = ({ params }) => {
	const badge = getBadge(params.type);
	if (!badge) throw error(404, '존재하지 않는 캐릭터 타입입니다');
	return { badge };
};
