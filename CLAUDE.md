# sonwon39.github.io

포트폴리오 업로드용 GitHub Pages 사이트. WebGL 데모도 포트폴리오의 일부("WebGL Playground" 섹션)로 포함한다. Vite + TypeScript, WebGL2(GLSL ES 3.00) 기준.

## 사용자 배경
- 그래픽스(C++) 경험은 있으나 HTML/JS/웹 분야는 처음. 웹 개념은 풀어서 설명할 것.

## 명령어
- `npm run dev` — 개발 서버 (HMR)
- `npm run build` — 타입 검사(tsc) + 프로덕션 빌드 → `dist/`
- Node.js 경로가 PATH에 없으면: `C:\Program Files\nodejs`

## 구조
- `index.html` — 포트폴리오 대문 (About / Projects / WebGL Playground / Contact 섹션, 새 데모는 Playground 목록에 링크 수동 추가)
- `src/style.css` — 전 페이지 공통 스타일 (다크 테마, `/src/style.css`로 링크)
- `demos/<NN-이름>/` — 데모 하나 = 폴더 하나 (`index.html` + `main.ts` + `shader.vert`/`shader.frag`)
  - 폴더만 만들면 `vite.config.ts`가 빌드 대상으로 자동 인식
  - 셰이더는 `?raw` import로 문자열로 불러온다 (플러그인 불필요)
- `.github/workflows/deploy.yml` — main push 시 GitHub Pages 자동 배포
  - 레포 Settings > Pages > Source = "GitHub Actions" 필요

## Claude Code 설정
- `.claude/settings.json` — git으로 공유되는 프로젝트 공통 설정.
- `.claude/settings.local.json` — 개인 로컬 설정 (gitignore 처리됨).
