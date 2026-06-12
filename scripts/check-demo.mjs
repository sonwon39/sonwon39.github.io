// 데모 페이지를 헤드리스 크롬으로 열어 콘솔 에러와 스크린샷을 확인하는 검증 스크립트.
// 사용법: node scripts/check-demo.mjs <URL> <스크린샷 저장 경로>
import puppeteer from 'puppeteer-core';

const [url, shotPath] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });

page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
page.on('requestfailed', (req) =>
  console.log('[requestfailed]', req.url(), req.failure()?.errorText),
);

await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise((r) => setTimeout(r, 1000));

const info = await page.evaluate(() => {
  const c = document.querySelector('#gl-canvas');
  if (!c) return { found: false };
  return {
    found: true,
    width: c.width,
    height: c.height,
    clientWidth: c.clientWidth,
    clientHeight: c.clientHeight,
  };
});
console.log('[canvas]', JSON.stringify(info));

await page.screenshot({ path: shotPath });
await browser.close();
