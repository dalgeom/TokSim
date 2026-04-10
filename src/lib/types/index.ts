export type MessageType =
	| 'text'
	| 'photo'
	| 'video'
	| 'emoticon'
	| 'voice'
	| 'file'
	| 'deleted'
	| 'system';

export interface Message {
	timestamp: Date;
	sender: string;
	content: string;
	type: MessageType;
}

export interface Participant {
	name: string;
	messageCount: number;
}

export interface ChatData {
	messages: Message[];
	participants: Participant[];
	startDate: Date;
	endDate: Date;
}

export interface ParseResult {
	success: boolean;
	data?: ChatData;
	error?: string;
}

export interface ParticipantStats {
	name: string;
	messageCount: number;
	messageRatio: number;
	avgReplyMinutes: number | null;
	totalChars: number;
	avgCharsPerMessage: number;
	kCount: number;
	hCount: number;
	tearCount: number;
	avgKPerMessage: number;
	photoCount: number;
	videoCount: number;
	emoticonCount: number;
	voiceCount: number;
	fileCount: number;
	mediaRatio: number;
	conversationStarts: number;
}

export interface WordCount {
	word: string;
	count: number;
}

export interface ParticipantPersona {
	name: string;
	speechStyle: string;
	personalityKeywords: string[];
}

export interface AIAnalysis {
	participants: ParticipantPersona[];
	conversationTemperature: number;
	relationshipDynamic: string;
	oneLineSummary: string;
}

export interface AnalyzeRequest {
	statistics: Statistics;
	sampleMessages: { sender: string; content: string; timestamp: string }[];
}

export interface AnalyzeResponse {
	success: boolean;
	analysis?: AIAnalysis;
	error?: string;
}

export interface Statistics {
	totalMessages: number;
	totalDays: number;
	messagesPerDay: number;
	startDate: Date;
	endDate: Date;
	participants: ParticipantStats[];
	hourlyDistribution: number[];
	weekdayDistribution: number[];
	topWords: WordCount[];
	mediaTotals: {
		photo: number;
		video: number;
		emoticon: number;
		voice: number;
		file: number;
	};
}

