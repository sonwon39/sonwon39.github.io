import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// 주어진 폴더(예: demos, projects) 아래의 각 하위 폴더를 빌드 대상 페이지로 등록한다.
// "데모/프로젝트 하나 = 폴더 하나" 규칙이라, 폴더만 추가하면 자동으로 빌드에 포함된다.
// `_`로 시작하는 폴더는 페이지가 아니라 공용 리소스 모음(예: _shared)이라 제외한다.
function collectPages(dir: string) {
  return Object.fromEntries(
    readdirSync(resolve(__dirname, dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => [
        `${dir}-${entry.name}`,
        resolve(__dirname, dir, entry.name, 'index.html'),
      ]),
  );
}

export default defineConfig({
  // Windows가 5001~5200 포트 범위를 예약해(Hyper-V/WSL 등) vite 기본 포트 5173에
  // 바인딩하면 EACCES(권한 거부)가 난다. 예약 범위 밖 포트로 고정한다.
  server: { port: 5301 },
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
