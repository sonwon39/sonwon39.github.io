import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// 주어진 폴더(예: demos, projects) 아래의 각 하위 폴더를 빌드 대상 페이지로 등록한다.
// "데모/프로젝트 하나 = 폴더 하나" 규칙이라, 폴더만 추가하면 자동으로 빌드에 포함된다.
function collectPages(dir: string) {
  return Object.fromEntries(
    readdirSync(resolve(__dirname, dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [
        `${dir}-${entry.name}`,
        resolve(__dirname, dir, entry.name, 'index.html'),
      ]),
  );
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...collectPages('demos'),
        ...collectPages('projects'),
      },
    },
  },
});
