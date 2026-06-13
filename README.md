# sonwon39.github.io

그래픽스 공부 결과물을 모아 둔 개인 포트폴리오 사이트입니다.

🔗 **[https://sonwon39.github.io](https://sonwon39.github.io)**

## 내용

- **Projects** — 직접 만든 프로젝트 정리 (예: DirectX 12 렌더링 엔진 *SEngine* — PBR, Stable Fluids)
- **WebGL Playground** — 브라우저에서 바로 실행되는 WebGL2 렌더링 데모

## 기술 스택

Vite · TypeScript · WebGL2 (GLSL ES 3.00)

## 개발

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (HMR)
npm run build    # 타입 검사 + 프로덕션 빌드 → dist/
npm run thumbs   # 데모 썸네일 일괄 생성 → public/demos/
```

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드해서 GitHub Pages에 배포합니다.

## 구조

```
index.html              포트폴리오 대문 (About / Projects / WebGL Playground / Contact)
src/style.css           전 페이지 공통 스타일 (라이트/다크 테마)
src/theme.ts            라이트/다크 테마 토글
demos/<NN-이름>/        WebGL 데모 (데모 하나 = 폴더 하나)
projects/<이름>/        프로젝트 상세 페이지
public/                 정적 자산 (데모 썸네일, 프로젝트 이미지)
```

`demos/`, `projects/` 아래 폴더만 추가하면 빌드 대상으로 자동 인식됩니다 (`vite.config.ts`).
