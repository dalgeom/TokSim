export type BadgeSlug =
	| 'king' | 'moodmaker' | 'vampire' | 'seenzone' | 'ghost'
	| 'reactionbot' | 'essayist' | 'factbomber' | 'photobomber'
	| 'emojirich' | 'normal';

export interface BadgeType {
	slug: BadgeSlug;
	emoji: string;
	name: string;
	tagline: string; // og:title 보조 / 카드 헤드
	description: string; // og:description / 랜딩 본문
	accent: string; // 카드 액센트 1 (#hex)
	accent2: string; // 카드 액센트 2 (#hex)
	rarity: string; // LEGENDARY/EPIC/RARE/UNCOMMON/SECRET/COMMON
	statN: string; // 정적 카드 우상단 스탯 숫자(대표값)
	statL: string; // 정적 카드 우상단 스탯 라벨
}

export const BADGE_TYPES: Record<BadgeSlug, BadgeType> = {
	king: {
		slug: 'king', emoji: '👑', name: '수다왕',
		tagline: '이 단톡방은 내가 먹여 살린다',
		description: '메시지 점유율 1위. 당신이 없으면 단톡방은 정적에 빠진다. 단톡방의 엔진.',
		accent: '#f59e0b', accent2: '#fbbf24', rarity: 'LEGENDARY', statN: '38%', statL: '메시지 점유율 1위'
	},
	moodmaker: {
		slug: 'moodmaker', emoji: '🎉', name: '분위기메이커',
		tagline: '내가 빠지면 단톡방이 조용해진다',
		description: 'ㅋㅋㅎㅎ 리액션으로 텐션을 책임지는 사람. 모두를 웃게 만드는 무드 담당.',
		accent: '#ec4899', accent2: '#f472b6', rarity: 'EPIC', statN: '1위', statL: 'ㅋㅋㅎㅎ 리액션'
	},
	vampire: {
		slug: 'vampire', emoji: '🧛', name: '에너지뱀파이어',
		tagline: '대화의 시작은 언제나 나',
		description: '먼저 말 걸고 판을 까는 텐션 주도자. 조용하면 못 참는 스타터.',
		accent: '#a855f7', accent2: '#ec4899', rarity: 'EPIC', statN: '2.4×', statL: '평균보다 먼저 말 검'
	},
	seenzone: {
		slug: 'seenzone', emoji: '💤', name: '읽씹왕',
		tagline: '읽씹도 예술이다',
		description: '답장은 느긋하게. 서두르지 않는 자유로운 영혼. (재촉 사절)',
		accent: '#3b82f6', accent2: '#60a5fa', rarity: 'UNCOMMON', statN: '39분', statL: '평균 답장 속도'
	},
	ghost: {
		slug: 'ghost', emoji: '👻', name: '유령',
		tagline: '나는 분명 이 방에 있다',
		description: '눈팅 전문. 모든 걸 지켜보지만 좀처럼 나서지 않는 미스터리.',
		accent: '#64748b', accent2: '#94a3b8', rarity: 'SECRET', statN: '3%', statL: '발화율 하위'
	},
	reactionbot: {
		slug: 'reactionbot', emoji: '🤣', name: '무한리액션봇',
		tagline: 'ㅋㅋㅋㅋㅋㅋㅋㅋ',
		description: '짧고 빠른 리액션 머신. 길게 말 안 해도 텐션은 최고.',
		accent: '#f97316', accent2: '#fb923c', rarity: 'RARE', statN: '×2.0', statL: '메시지당 ㅋ 개수'
	},
	essayist: {
		slug: 'essayist', emoji: '📚', name: '장문주의자',
		tagline: '할 말은 끝까지 한다',
		description: '카톡을 편지처럼 쓰는 사람. 스크롤이 필요한 메시지의 주인.',
		accent: '#14b8a6', accent2: '#2dd4bf', rarity: 'RARE', statN: '87자', statL: '평균 메시지 길이'
	},
	factbomber: {
		slug: 'factbomber', emoji: '🧊', name: '팩트폭격기',
		tagline: '감정은 빼고, 팩트만',
		description: '군더더기 없는 정보 전달자. 단톡방의 공식 발표 채널.',
		accent: '#06b6d4', accent2: '#22d3ee', rarity: 'UNCOMMON', statN: '0개', statL: '이모티콘 사용'
	},
	photobomber: {
		slug: 'photobomber', emoji: '📷', name: '사진폭격기',
		tagline: '말보다 사진',
		description: '짤과 사진으로 대화한다. 갤러리가 곧 대화록.',
		accent: '#22c55e', accent2: '#4ade80', rarity: 'RARE', statN: '1위', statL: '사진 전송'
	},
	emojirich: {
		slug: 'emojirich', emoji: '🎭', name: '이모티콘부자',
		tagline: '이모티콘으로 다 말함',
		description: '글자보다 이모티콘이 많은 사람. 감정표현의 끝판왕.',
		accent: '#d946ef', accent2: '#e879f9', rarity: 'RARE', statN: '100%', statL: '이모티콘 비율'
	},
	normal: {
		slug: 'normal', emoji: '🙂', name: '평범한수다러',
		tagline: '균형 잡힌 단톡방 시민',
		description: '어느 쪽으로도 치우치지 않은 올라운더. 더 또렷한 캐릭터는 직접 확인 →',
		accent: '#6b7280', accent2: '#9ca3af', rarity: 'COMMON', statN: '—', statL: '균형형'
	}
};

export const BADGE_SLUGS = Object.keys(BADGE_TYPES) as BadgeSlug[];
export const BADGE_LIST: BadgeType[] = BADGE_SLUGS.map((s) => BADGE_TYPES[s]);

export function getBadge(slug: string): BadgeType | undefined {
	return (BADGE_TYPES as Record<string, BadgeType>)[slug];
}
