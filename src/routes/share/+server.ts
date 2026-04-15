import type { RequestHandler } from './$types';

const MAX_SIZE = 20 * 1024 * 1024;

function escapeJsString(s: string): string {
	return s
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029')
		.replace(/</g, '\\u003c');
}

function renderHandoff(sharedText: string): Response {
	const escaped = escapeJsString(sharedText);
	const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>톡심 - 공유받는 중...</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard',sans-serif;background:#fffbe6;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#3c1e1e}
.box{text-align:center}
.spin{display:inline-block;width:40px;height:40px;border:4px solid #e5e5e5;border-top-color:#fee500;border-radius:50%;animation:s .9s linear infinite;margin-bottom:.75rem}
@keyframes s{to{transform:rotate(360deg)}}
p{margin:.25rem 0}
</style>
</head>
<body>
<div class="box">
<div class="spin"></div>
<p><strong>공유 받은 대화를 불러오는 중...</strong></p>
<p style="color:#888;font-size:.9rem">잠시만 기다려 주세요</p>
</div>
<script>
try {
  sessionStorage.setItem('toksim:sharedText', '${escaped}');
  location.replace('/?from=share');
} catch (e) {
  document.body.innerHTML = '<div class="box"><p>데이터를 불러오지 못했습니다.</p><p><a href="/">홈으로 가기</a></p></div>';
}
</script>
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') ?? '';
		if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
			return renderHandoff('');
		}

		const form = await request.formData();
		const textField = (form.get('text') as string | null) ?? '';
		const titleField = (form.get('title') as string | null) ?? '';
		const urlField = (form.get('url') as string | null) ?? '';
		const fileField = form.get('file');

		let fileText = '';
		if (fileField && fileField instanceof File) {
			if (fileField.size > MAX_SIZE) {
				return renderHandoff('');
			}
			const name = fileField.name.toLowerCase();
			if (name.endsWith('.txt') || fileField.type === 'text/plain' || fileField.type === '') {
				fileText = await fileField.text();
			}
		}

		const combined = fileText || textField || [titleField, urlField].filter(Boolean).join('\n');
		return renderHandoff(combined);
	} catch (e) {
		console.error('share endpoint error:', e);
		return renderHandoff('');
	}
};

export const GET: RequestHandler = async () => {
	return new Response(null, {
		status: 302,
		headers: { Location: '/' }
	});
};
