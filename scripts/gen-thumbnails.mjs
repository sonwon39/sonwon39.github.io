// 데모 썸네일 일괄 생성 스크립트.
//   실행:  npm run thumbs
//
// 하는 일:
//   1. demos/ 아래의 모든 데모 폴더를 자동으로 찾는다.
//   2. Vite 개발 서버를 코드로 직접 띄운다 (포트 자동 할당, 끝나면 자동 종료).
//   3. 헤드리스 크롬으로 각 데모를 열어 캡처 대상을 찾는다.
//      - [data-thumb] 속성이 붙은 요소가 있으면 그것을 우선 캡처 (다중 캔버스
//        데모가 "이게 대표"라고 명시 가능)
//      - 없으면 #gl-canvas를 캡처 (단일 캔버스 데모의 기본 동작)
//   4. public/demos/<데모이름>.jpg 로 저장한다.
//
// 새 데모를 추가했다면 이 스크립트만 다시 돌리면 썸네일이 갱신된다.

import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 헤드리스 렌더링에 쓸 브라우저 (크롬 우선, 없으면 엣지)
const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('크롬/엣지를 찾을 수 없습니다. 경로를 확인하세요.');
  process.exit(1);
}

// 1. 데모 폴더 자동 수집
const demos = readdirSync(resolve(root, 'demos'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

if (demos.length === 0) {
  console.log('demos/ 아래에 데모가 없습니다.');
  process.exit(0);
}

const outDir = resolve(root, 'public/demos');
mkdirSync(outDir, { recursive: true });

// 2. Vite 개발 서버 기동
const server = await createServer({ root, server: { strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
console.log(`개발 서버: ${base}\n`);

// 3~4. 데모별 캔버스 캡처
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

let ok = 0;
for (const name of demos) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/demos/${name}/`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });
    await new Promise((r) => setTimeout(r, 800)); // 애니메이션 몇 프레임 진행
    // 캡처 대상 선택: data-thumb > #gl-canvas 순으로 폴백
    const el = (await page.$('[data-thumb]')) ?? (await page.$('#gl-canvas'));
    if (!el) {
      console.log(`⚠ ${name}: [data-thumb] 또는 #gl-canvas 없음 — 건너뜀`);
    } else {
      await el.screenshot({
        path: resolve(outDir, `${name}.jpg`),
        type: 'jpeg',
        quality: 82,
      });
      console.log(`✓ ${name} → public/demos/${name}.jpg`);
      ok++;
    }
    if (errors.length) console.log(`  (콘솔 에러: ${errors.join('; ')})`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
await server.close();
console.log(`\n완료: ${ok}/${demos.length}개 썸네일 생성`);
