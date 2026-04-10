import type { ChatData, Message, MessageType, ParseResult, Participant } from '$lib/types';

const DATE_HEADER_RE = /^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*-+$/;

const PC_MESSAGE_RE = /^\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.*)$/;

const MOBILE_MESSAGE_RE =
	/^(\d{4})[.\s년]+\s*(\d{1,2})[.\s월]+\s*(\d{1,2})[.\s일]*\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*([^:]+?)\s*:\s*(.*)$/;

const SYSTEM_PATTERNS = [
	/님이 들어왔습니다\.?$/,
	/님이 나갔습니다\.?$/,
	/님을 내보냈습니다\.?$/,
	/님이 .*님을 초대했습니다\.?$/,
	/^저장한 날짜\s*:/,
	/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일.*카카오톡\s*대화/
];

function to24Hour(ampm: string, hour: number): number {
	if (ampm === '오전') return hour === 12 ? 0 : hour;
	return hour === 12 ? 12 : hour + 12;
}

function detectType(content: string): MessageType {
	const trimmed = content.trim();
	if (trimmed === '사진' || /^사진\s*\d+장$/.test(trimmed) || /^<사진\s*\d*장?>$/.test(trimmed))
		return 'photo';
	if (trimmed === '동영상') return 'video';
	if (trimmed === '이모티콘') return 'emoticon';
	if (/^파일\s*:/.test(trimmed) || trimmed === '파일') return 'file';
	return 'text';
}

function isSystemMessage(line: string): boolean {
	return SYSTEM_PATTERNS.some((re) => re.test(line));
}

export function parseKakaoChat(raw: string): ParseResult {
	if (!raw || !raw.trim()) {
		return { success: false, error: '대화 내용이 비어있습니다.' };
	}

	const lines = raw.split(/\r?\n/);
	const messages: Message[] = [];
	let currentDate: { year: number; month: number; day: number } | null = null;
	let lastMessage: Message | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		if (!line.trim()) continue;

		const dateMatch = line.match(DATE_HEADER_RE);
		if (dateMatch) {
			currentDate = {
				year: parseInt(dateMatch[1], 10),
				month: parseInt(dateMatch[2], 10),
				day: parseInt(dateMatch[3], 10)
			};
			lastMessage = null;
			continue;
		}

		if (isSystemMessage(line)) {
			lastMessage = null;
			continue;
		}

		const pcMatch = line.match(PC_MESSAGE_RE);
		if (pcMatch && currentDate) {
			const [, sender, ampm, hourStr, minStr, content] = pcMatch;
			const hour = to24Hour(ampm, parseInt(hourStr, 10));
			const timestamp = new Date(
				currentDate.year,
				currentDate.month - 1,
				currentDate.day,
				hour,
				parseInt(minStr, 10)
			);
			const msg: Message = {
				timestamp,
				sender: sender.trim(),
				content,
				type: detectType(content)
			};
			messages.push(msg);
			lastMessage = msg;
			continue;
		}

		const mobileMatch = line.match(MOBILE_MESSAGE_RE);
		if (mobileMatch) {
			const [, yearStr, monthStr, dayStr, ampm, hourStr, minStr, sender, content] = mobileMatch;
			const hour = to24Hour(ampm, parseInt(hourStr, 10));
			const timestamp = new Date(
				parseInt(yearStr, 10),
				parseInt(monthStr, 10) - 1,
				parseInt(dayStr, 10),
				hour,
				parseInt(minStr, 10)
			);
			const msg: Message = {
				timestamp,
				sender: sender.trim(),
				content,
				type: detectType(content)
			};
			messages.push(msg);
			lastMessage = msg;
			continue;
		}

		if (lastMessage) {
			lastMessage.content += '\n' + line;
			lastMessage.type = detectType(lastMessage.content);
		}
	}

	if (messages.length === 0) {
		return {
			success: false,
			error: '대화를 파싱할 수 없습니다. 카카오톡 내보내기 형식이 맞는지 확인해주세요.'
		};
	}

	const counts = new Map<string, number>();
	for (const m of messages) {
		counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
	}
	const participants: Participant[] = Array.from(counts.entries())
		.map(([name, messageCount]) => ({ name, messageCount }))
		.sort((a, b) => b.messageCount - a.messageCount);

	const data: ChatData = {
		messages,
		participants,
		startDate: messages[0].timestamp,
		endDate: messages[messages.length - 1].timestamp
	};

	return { success: true, data };
}
