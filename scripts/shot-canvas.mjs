// 데모 페이지의 #gl-canvas 요소만 캡처해 썸네일(JPEG)로 저장한다.
// 사용법: node scripts/shot-canvas.mjs <URL> <저장경로.jpg>
import puppeteer from 'puppeteer-core';

const [url, out] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise((r) => setTimeout(r, 800)); // 애니메이션 몇 프레임 진행

const el = await page.$('#gl-canvas');
if (!el) {
  console.log('no #gl-canvas');
  process.exit(1);
}
await el.screenshot({ path: out, type: 'jpeg', quality: 82 });
await browser.close();
console.log('saved', out);
