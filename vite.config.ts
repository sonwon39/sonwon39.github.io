import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// demos/ 아래의 각 폴더(데모 하나 = 폴더 하나)를 빌드 대상 페이지로 자동 등록한다.
// 새 데모를 추가할 때 이 파일을 수정할 필요 없이 폴더만 만들면 된다.
const demoPages = Object.fromEntries(
  readdirSync(resolve(__dirname, 'demos'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [
      `demo-${entry.name}`,
      resolve(__dirname, 'demos', entry.name, 'index.html'),
    ]),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...demoPages,
      },
    },
  },
});
