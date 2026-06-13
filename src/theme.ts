// 라이트/다크 테마 토글.
// - 선택값은 localStorage('theme')에 저장하고, 없으면 시스템 설정을 따른다.
// - 화면 깜빡임(FOUC) 방지용으로 <html>의 data-theme는 각 페이지 <head>의
//   인라인 스크립트가 먼저 설정한다. 이 모듈은 토글 버튼만 붙인다.

type Theme = 'light' | 'dark';

const KEY = 'theme';
const root = document.documentElement;

function current(): Theme {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

const btn = document.createElement('button');
btn.className = 'theme-toggle';
btn.type = 'button';
btn.setAttribute('aria-label', '라이트/다크 테마 전환');

function refresh() {
  // 버튼에는 "누르면 바뀔 대상"을 표시한다.
  btn.textContent = current() === 'light' ? '🌙' : '☀️';
}

btn.addEventListener('click', () => {
  const next: Theme = current() === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  localStorage.setItem(KEY, next);
  refresh();
});

refresh();
document.body.appendChild(btn);
