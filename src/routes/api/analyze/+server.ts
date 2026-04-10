import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import type { AIAnalysis, AnalyzeRequest, AnalyzeResponse, Statistics } from '$lib/types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt(stats: Statistics, samples: AnalyzeRequest['sampleMessages']): string {
	const participantLines = stats.participants
		.map((p) => {
			const replyStr =
				p.avgReplyMinutes == null ? '-' : `${Math.round(p.avgReplyMinutes)}분`;
			return `- ${p.name}: 총 ${p.messageCount}건, 비율 ${(p.messageRatio * 100).toFixed(1)}%, 평균 답장 ${replyStr}, 메시지당 ${p.avgCharsPerMessage.toFixed(1)}자, ㅋ ${p.kCount}개, ㅎ ${p.hCount}개, ㅠ/ㅜ ${p.tearCount}개, 대화 시작 ${p.conversationStarts}회, 사진 ${p.photoCount}개, 이모티콘 ${p.emoticonCount}개`;
		})
		.join('\n');

	const sampleLines = samples
		.map((s) => `${s.sender}: ${s.content.replace(/\n/g, ' ')}`)
		.join('\n');

	return `당신은 한국어 카카오톡 대화를 분석하는 전문가입니다. 아래 데이터를 분석하여 JSON으로만 응답하세요.

[참여자 통계]
${participantLines}

[대화 샘플 ${samples.length}개]
${sampleLines}

[분석 지침]
- 말투 유형 예시: "리액션형", "질문형", "공감형", "팩트형", "유머형", "주도형", "수동형", "이모티콘형" 등. 통계와 샘플을 근거로 가장 잘 맞는 한 단어를 고르세요.
- 성격 키워드는 각 참여자마다 정확히 3개. 해시태그 없이 "솔직한", "유머러스한" 같은 형용사 형태로.
- conversationTemperature는 0~100 사이 정수. 답장 속도, 메시지 빈도, 이모티콘·ㅋㅎ 사용량, 대화 주제를 종합해서 친밀도/관심도를 측정한 값. 100에 가까울수록 뜨거운 대화.
- relationshipDynamic은 한 줄로 두 사람의 관계 역학을 묘사. 예: "A 주도 / B 반응형", "균형 잡힌 대화", "A가 질문 B가 답변하는 패턴" 등.
- oneLineSummary는 재치 있고 임팩트 있는 한 줄 총평. 약간 자극적이어도 됨. 예: "읽씹 확률 73%의 위험한 대화 상대", "이모티콘 없이는 못 사는 감정표현 풍부형"
- 모든 문자열은 한국어로 작성하세요.

[응답 스키마]
{
  "participants": [
    { "name": "참여자 이름", "speechStyle": "말투 유형", "personalityKeywords": ["키워드1", "키워드2", "키워드3"] }
  ],
  "conversationTemperature": 0-100 사이 정수,
  "relationshipDynamic": "관계 역학 설명",
  "oneLineSummary": "한 줄 총평"
}`;
}

function parseAIResponse(text: string): AIAnalysis {
	const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
	const parsed = JSON.parse(cleaned);
	if (
		!parsed.participants ||
		!Array.isArray(parsed.participants) ||
		typeof parsed.conversationTemperature !== 'number' ||
		typeof parsed.relationshipDynamic !== 'string' ||
		typeof parsed.oneLineSummary !== 'string'
	) {
		throw new Error('AI 응답 스키마가 올바르지 않습니다.');
	}
	return parsed as AIAnalysis;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey =
		env.GEMINI_API_KEY ??
		(platform as { env?: { GEMINI_API_KEY?: string } } | undefined)?.env?.GEMINI_API_KEY;

	if (!apiKey) {
		const body: AnalyzeResponse = {
			success: false,
			error: 'API 키가 설정되지 않았습니다.'
		};
		return json(body, { status: 500 });
	}

	let payload: AnalyzeRequest;
	try {
		payload = await request.json();
	} catch {
		const body: AnalyzeResponse = { success: false, error: '잘못된 요청 형식입니다.' };
		return json(body, { status: 400 });
	}

	if (!payload?.statistics || !Array.isArray(payload?.sampleMessages)) {
		const body: AnalyzeResponse = { success: false, error: '필수 필드가 누락되었습니다.' };
		return json(body, { status: 400 });
	}

	const prompt = buildPrompt(payload.statistics, payload.sampleMessages);

	try {
		const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.8,
					responseMimeType: 'application/json'
				}
			})
		});

		if (!geminiRes.ok) {
			const errText = await geminiRes.text();
			console.error('Gemini API error:', geminiRes.status, errText);
			const body: AnalyzeResponse = {
				success: false,
				error: `Gemini ${geminiRes.status}: ${errText.slice(0, 500)}`
			};
			return json(body, { status: 502 });
		}

		const geminiJson = await geminiRes.json();
		const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text || typeof text !== 'string') {
			const body: AnalyzeResponse = { success: false, error: 'AI 응답이 비어있습니다.' };
			return json(body, { status: 502 });
		}

		const analysis = parseAIResponse(text);
		const body: AnalyzeResponse = { success: true, analysis };
		return json(body);
	} catch (e) {
		console.error('analyze endpoint error:', e);
		const body: AnalyzeResponse = {
			success: false,
			error: e instanceof Error ? e.message : 'AI 분석 중 알 수 없는 오류가 발생했습니다.'
		};
		return json(body, { status: 500 });
	}
};
