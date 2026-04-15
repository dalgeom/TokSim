import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const SRC = join(ROOT, 'static', 'icon.svg');
const OUT_192 = join(ROOT, 'static', 'icon-192.png');
const OUT_512 = join(ROOT, 'static', 'icon-512.png');
const OUT_MASKABLE = join(ROOT, 'static', 'icon-maskable.png');
const OUT_APPLE = join(ROOT, 'static', 'apple-touch-icon.png');

async function main() {
	const svgBuffer = await readFile(SRC);

	await sharp(svgBuffer).resize(192, 192).png().toFile(OUT_192);
	console.log('wrote', OUT_192);

	await sharp(svgBuffer).resize(512, 512).png().toFile(OUT_512);
	console.log('wrote', OUT_512);

	const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FEE500"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, 'Apple SD Gothic Neo', 'Pretendard', sans-serif" font-size="200" font-weight="900" fill="#3C1E1E">톡</text>
</svg>`;
	await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(OUT_MASKABLE);
	console.log('wrote', OUT_MASKABLE);

	await sharp(svgBuffer).resize(180, 180).png().toFile(OUT_APPLE);
	console.log('wrote', OUT_APPLE);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
