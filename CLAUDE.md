# sonwon39.github.io

포트폴리오 업로드용 GitHub Pages 사이트. WebGL 데모도 포트폴리오의 일부("WebGL Playground" 섹션)로 포함한다. Vite + TypeScript, WebGL2(GLSL ES 3.00) 기준.

## 사용자 배경
- 그래픽스(C++) 경험은 있으나 HTML/JS/웹 분야는 처음. 웹 개념은 풀어서 설명할 것.

## 명령어
- `npm run dev` — 개발 서버 (HMR)
- `npm run build` — 타입 검사(tsc) + 프로덕션 빌드 → `dist/`
- `npm run thumbs` — 데모 썸네일 일괄 생성 → `public/demos/<데모이름>.jpg`
- Node.js 경로가 PATH에 없으면: `C:\Program Files\nodejs`

## 구조
- `index.html` — 포트폴리오 대문 (About / Projects / WebGL Playground / Contact 섹션)
  - Projects: 대표 카드(`.project-card`)만 보여주고 클릭 시 상세 페이지로 이동. 새 프로젝트는 카드 수동 추가
  - WebGL Playground: 새 데모는 목록에 링크 수동 추가
- `src/style.css` — 전 페이지 공통 스타일 (다크 테마, `/src/style.css`로 링크)
- `demos/<NN-이름>/` — 데모 하나 = 폴더 하나 (`index.html` + `main.ts` + `shader.vert`/`shader.frag`)
  - 셰이더는 `?raw` import로 문자열로 불러온다 (플러그인 불필요)
  - 홈 카드 썸네일: `public/demos/<NN-이름>.jpg` (캔버스 캡처). `npm run thumbs`로 전체 일괄 재생성 (서버 자동 기동→캡처→종료)
- `src/theme.ts` — 라이트/다크 토글. 각 페이지 `<head>`의 인라인 스크립트가 깜빡임 방지로 `data-theme`를 먼저 설정
- `projects/<이름>/index.html` — 프로젝트 상세 페이지 하나 = 폴더 하나
- `public/projects/<이름>/` — 프로젝트 이미지 (정적 자산, 사이트 루트 `/projects/<이름>/...`로 서빙)
  - 다른 레포 결과물은 PowerShell `System.Drawing`으로 리사이즈/JPEG 압축 후 복사 (vendoring)
- `vite.config.ts` — `collectPages()`가 `demos/`와 `projects/` 하위 폴더를 빌드 대상으로 자동 인식 (폴더만 만들면 됨)
- `.github/workflows/deploy.yml` — main push 시 GitHub Pages 자동 배포
  - 레포 Settings > Pages > Source = "GitHub Actions" 필요

## Claude Code 설정
- `.claude/settings.json` — git으로 공유되는 프로젝트 공통 설정.
- `.claude/settings.local.json` — 개인 로컬 설정 (gitignore 처리됨).
