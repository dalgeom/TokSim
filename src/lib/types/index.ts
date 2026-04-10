export type MessageType = 'text' | 'photo' | 'video' | 'emoticon' | 'file' | 'system';

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
