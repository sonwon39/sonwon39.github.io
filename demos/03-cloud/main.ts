// 여러 종류의 노이즈를 각각 다른 프래그먼트 셰이더로 렌더링한다.
// 공통 버텍스 셰이더(shader.vert)로 화면을 덮는 사각형을 그리고,
// 캔버스마다 다른 노이즈 셰이더를 붙인다.
//
// 핵심: WebGL 컨텍스트는 캔버스마다 따로 존재하고, 프로그램·버퍼 같은
// 리소스는 컨텍스트 간에 공유할 수 없다. 그래서 "캔버스 하나에 필요한 모든 것"을
// setupNoiseCanvas() 안에 캡슐화하고, 노이즈 종류마다 한 번씩 호출한다.
import vertSource from './shader.vert?raw';
import perlinNoiseFrag from './perlinNoise.frag?raw';
import perlinFBMFrag from './perlinFBM.frag?raw';
import invWorleyFrag from './invWorleyNoise.frag?raw';
import worleyFBMFrag from './worleyFBM.frag?raw';
import perlinWorleyFrag from './perlinWorley.frag?raw';
import cloudFrag from './cloud.frag?raw';
import noiseGlsl from '../_shared/noise.glsl?raw';

// 셰이더끼리 공유하는 함수 모음. #include "파일명" 으로 끌어다 쓴다.
// 브라우저는 파일 시스템을 직접 못 읽으므로, 빌드 시점에 ?raw로 불러온
// 문자열을 이 registry에 등록해두고 이름으로 찾는다. 공유 파일을 늘리려면
// 여기 한 줄만 추가하면 된다.
const SHADER_INCLUDES: Record<string, string> = {
  'noise.glsl': noiseGlsl,
};

// 셰이더 소스의 #include "파일명" 줄을 실제 파일 내용으로 치환하는 작은 전처리기.
// (#include 는 GLSL 표준 지시문이 아니라서, 컴파일 전에 우리가 직접 풀어줘야 한다.)
// #version 지시문은 반드시 첫 줄이어야 하므로, #include 는 그 아래에 둔다.
function resolveIncludes(source: string): string {
  return source.replace(
    /^[ \t]*#include\s+"([^"]+)"[ \t]*$/gm,
    (_match, name: string) => {
      const included = SHADER_INCLUDES[name];
      if (included === undefined) {
        throw new Error(`#include 대상을 찾을 수 없습니다: "${name}"`);
      }
      return resolveIncludes(included); // 중첩 #include 도 지원
    },
  );
}

// (캔버스 id, 그 캔버스에 그릴 노이즈 셰이더) 목록.
// 노이즈를 추가하려면 .frag를 만들고 여기에 한 줄, index.html에 캔버스 하나 추가하면 된다.
const NOISES: { selector: string; frag: string }[] = [
  { selector: '#gl-canvas0', frag: perlinNoiseFrag },
  { selector: '#gl-canvas1', frag: perlinFBMFrag },
  { selector: '#gl-canvas2', frag: invWorleyFrag },
  { selector: '#gl-canvas3', frag: worleyFBMFrag },
  { selector: '#gl-canvas4', frag: perlinWorleyFrag },
  { selector: '#gl-canvas-cloud', frag: cloudFrag }
];

// 화면을 덮는 사각형: 정점 4개 + 인덱스 6개(삼각형 2개)
const QUAD_VERTICES = new Float32Array([
  -1.0, 1.0,  // 0
  -1.0, -1.0, // 1
  1.0, -1.0,  // 2
  1.0, 1.0,   // 3
]);
const QUAD_INDICES = new Uint16Array([0, 1, 2, 0, 2, 3]);

function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('셰이더 객체 생성 실패');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`셰이더 컴파일 실패:\n${log}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const program = gl.createProgram();
  // 컴파일 전에 #include 를 실제 함수 코드로 펼친다.
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, resolveIncludes(vertSrc)));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, resolveIncludes(fragSrc)));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`프로그램 링크 실패:\n${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

// 캔버스를 찾아 WebGL2 컨텍스트를 얻는다. 반환 타입이 non-null이라
// 이후 코드(특히 클로저 안)에서 null 검사나 `!` 없이 바로 쓸 수 있다.
function getContext(selector: string): {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
} {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) throw new Error(`${selector} 캔버스를 찾을 수 없습니다.`);
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('이 브라우저는 WebGL2를 지원하지 않습니다.');
  return { canvas, gl };
}

// 캔버스 하나를 받아 노이즈 셰이더를 컴파일하고 애니메이션 루프를 시작한다.
function setupNoiseCanvas(selector: string, fragSource: string) {
  const { canvas, gl } = getContext(selector);

  const program = createProgram(gl, vertSource, fragSource);

  // 풀스크린 사각형 준비 (VAO + 정점/인덱스 버퍼)
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // 인덱스 버퍼는 현재 바인딩된 VAO에 기록된다 (VAO 바인드 후에 바인드할 것)
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, QUAD_INDICES, gl.STATIC_DRAW);

  const iTimeLoc = gl.getUniformLocation(program, 'iTime');
  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');

  function resize() {
    // 드로잉 버퍼를 화면에 표시되는 실제 크기(CSS 박스)에 맞춘다.
    // 표시 영역이 정사각형(aspect-ratio: 1/1)이면 버퍼도 정사각형이 되어
    // 픽셀이 늘어나지 않고, 노이즈 격자도 정사각형을 유지한다.
    const dpr = window.devicePixelRatio;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function render(timeMs: number) {
    gl.useProgram(program);
    gl.uniform1f(iTimeLoc, timeMs * 0.001); // ms → 초
    gl.uniform2f(iResolutionLoc, canvas.width, canvas.height);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(render);
}

for (const noise of NOISES) {
  // 한 셰이더가 컴파일에 실패해도 나머지 캔버스는 계속 렌더되도록 격리한다.
  // (작업 중인 셰이더 하나 때문에 페이지 전체가 검게 변하지 않게)
  try {
    setupNoiseCanvas(noise.selector, noise.frag);
  } catch (e) {
    console.error(`${noise.selector} 초기화 실패:`, e);
  }
}
