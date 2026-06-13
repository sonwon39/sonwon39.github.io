// 페이지 전체를 캡처하는 검증 스크립트.
// 사용법: node scripts/shot-page.mjs <URL> <스크린샷 저장 경로>
import puppeteer from 'puppeteer-core';

const [url, shotPath, theme] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900 });
// 3번째 인자로 'light'를 주면 시스템 라이트 모드를 흉내내 라이트 테마로 렌더한다.
if (theme) {
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: theme },
  ]);
}
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
page.on('requestfailed', (req) =>
  console.log('[requestfailed]', req.url(), req.failure()?.errorText),
);

await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await page.screenshot({ path: shotPath, fullPage: true });
await browser.close();
console.log('saved', shotPath);
