import type {
	ChatData,
	Message,
	ParticipantStats,
	Statistics,
	WordCount
} from '$lib/types';

const CONVERSATION_GAP_MINUTES = 60;
const REPLY_WINDOW_MINUTES = 6 * 60;
const STOPWORDS = new Set([
	'그리고',
	'근데',
	'그래서',
	'그럼',
	'그게',
	'그거',
	'이거',
	'저거',
	'진짜',
	'정말',
	'완전',
	'약간',
	'그냥',
	'좀',
	'뭐',
	'응',
	'어',
	'아',
	'네',
	'예',
	'음',
	'오',
	'헐',
	'아니',
	'맞아',
	'오케이',
	'ㅇㅇ',
	'ㄴㄴ',
	'ㅇㅋ',
	'ㄱㄱ',
	'ㅇ',
	'그래',
	'그랬',
	'있어',
	'없어',
	'있지',
	'같아',
	'같은',
	'같이',
	'이제',
	'지금',
	'우리',
	'너무',
	'나도',
	'나는',
	'내가',
	'너도',
	'너는',
	'네가'
]);

function tokenize(content: string): string[] {
	return content
		.replace(/[.,!?~\-_/\\()[\]{}"'`:;@#$%^&*+=<>|]/g, ' ')
		.split(/\s+/)
		.map((w) => w.trim())
		.filter((w) => {
			if (w.length < 2) return false;
			if (/^[ㅋㅎㅠㅜ]+$/.test(w)) return false;
			if (/^\d+$/.test(w)) return false;
			if (STOPWORDS.has(w)) return false;
			return true;
		});
}

function countChar(str: string, chars: string[]): number {
	let count = 0;
	for (const ch of str) if (chars.includes(ch)) count++;
	return count;
}

function minutesBetween(a: Date, b: Date): number {
	return Math.abs(a.getTime() - b.getTime()) / 60000;
}

export function analyzeStatistics(data: ChatData): Statistics {
	const { messages } = data;
	const total = messages.length;

	const perParticipant = new Map<
		string,
		{
			messageCount: number;
			totalChars: number;
			kCount: number;
			hCount: number;
			tearCount: number;
			photoCount: number;
			videoCount: number;
			emoticonCount: number;
			voiceCount: number;
			fileCount: number;
			replySum: number;
			replyCount: number;
			conversationStarts: number;
		}
	>();

	function ensure(name: string) {
		let s = perParticipant.get(name);
		if (!s) {
			s = {
				messageCount: 0,
				totalChars: 0,
				kCount: 0,
				hCount: 0,
				tearCount: 0,
				photoCount: 0,
				videoCount: 0,
				emoticonCount: 0,
				voiceCount: 0,
				fileCount: 0,
				replySum: 0,
				replyCount: 0,
				conversationStarts: 0
			};
			perParticipant.set(name, s);
		}
		return s;
	}

	const hourlyDistribution = new Array(24).fill(0);
	const weekdayDistribution = new Array(7).fill(0);
	const wordCounts = new Map<string, number>();
	const mediaTotals = { photo: 0, video: 0, emoticon: 0, voice: 0, file: 0 };

	let prev: Message | null = null;

	for (const m of messages) {
		const s = ensure(m.sender);
		s.messageCount++;

		hourlyDistribution[m.timestamp.getHours()]++;
		weekdayDistribution[m.timestamp.getDay()]++;

		if (m.type === 'text') {
			s.totalChars += m.content.length;
			s.kCount += countChar(m.content, ['ㅋ']);
			s.hCount += countChar(m.content, ['ㅎ']);
			s.tearCount += countChar(m.content, ['ㅠ', 'ㅜ']);

			for (const w of tokenize(m.content)) {
				wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
			}
		} else if (m.type === 'photo') {
			s.photoCount++;
			mediaTotals.photo++;
		} else if (m.type === 'video') {
			s.videoCount++;
			mediaTotals.video++;
		} else if (m.type === 'emoticon') {
			s.emoticonCount++;
			mediaTotals.emoticon++;
		} else if (m.type === 'voice') {
			s.voiceCount++;
			mediaTotals.voice++;
		} else if (m.type === 'file') {
			s.fileCount++;
			mediaTotals.file++;
		}

		if (!prev) {
			s.conversationStarts++;
		} else {
			const gap = minutesBetween(m.timestamp, prev.timestamp);
			if (gap >= CONVERSATION_GAP_MINUTES) {
				s.conversationStarts++;
			} else if (m.sender !== prev.sender && gap <= REPLY_WINDOW_MINUTES) {
				s.replySum += gap;
				s.replyCount++;
			}
		}

		prev = m;
	}

	const participants: ParticipantStats[] = Array.from(perParticipant.entries())
		.map(([name, s]) => {
			const mediaCount =
				s.photoCount + s.videoCount + s.emoticonCount + s.voiceCount + s.fileCount;
			return {
				name,
				messageCount: s.messageCount,
				messageRatio: total > 0 ? s.messageCount / total : 0,
				avgReplyMinutes: s.replyCount > 0 ? s.replySum / s.replyCount : null,
				totalChars: s.totalChars,
				avgCharsPerMessage: s.messageCount > 0 ? s.totalChars / s.messageCount : 0,
				kCount: s.kCount,
				hCount: s.hCount,
				tearCount: s.tearCount,
				avgKPerMessage: s.messageCount > 0 ? s.kCount / s.messageCount : 0,
				photoCount: s.photoCount,
				videoCount: s.videoCount,
				emoticonCount: s.emoticonCount,
				voiceCount: s.voiceCount,
				fileCount: s.fileCount,
				mediaRatio: s.messageCount > 0 ? mediaCount / s.messageCount : 0,
				conversationStarts: s.conversationStarts
			};
		})
		.sort((a, b) => b.messageCount - a.messageCount);

	const topWords: WordCount[] = Array.from(wordCounts.entries())
		.map(([word, count]) => ({ word, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	const startDate = data.startDate;
	const endDate = data.endDate;
	const dayMs = 24 * 60 * 60 * 1000;
	const totalDays = Math.max(
		1,
		Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs) + 1
	);

	return {
		totalMessages: total,
		totalDays,
		messagesPerDay: total / totalDays,
		startDate,
		endDate,
		participants,
		hourlyDistribution,
		weekdayDistribution,
		topWords,
		mediaTotals
	};
}
