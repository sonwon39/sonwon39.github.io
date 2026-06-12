// `?raw`를 붙이면 Vite가 파일 내용을 그대로 문자열로 import해 준다.
// 셰이더 파일을 저장하면 페이지가 자동 새로고침되어 결과가 바로 반영된다.
import vertSource from './shader.vert?raw';
import fragSource from './shader.frag?raw';

// ---------------------------------------------------------------
// 1. 캔버스와 WebGL2 컨텍스트 얻기
// ---------------------------------------------------------------
const canvas = document.querySelector<HTMLCanvasElement>('#gl-canvas');
if (!canvas) throw new Error('#gl-canvas 캔버스를 찾을 수 없습니다.');

const gl = canvas.getContext('webgl2');
if (!gl) throw new Error('이 브라우저는 WebGL2를 지원하지 않습니다.');

// CSS 크기(화면에 보이는 크기)와 드로잉 버퍼 크기(실제 픽셀 수)는 별개다.
// 고해상도(레티나) 화면에서도 선명하도록 devicePixelRatio를 곱해 준다.
function resizeCanvas() {
  const dpr = window.devicePixelRatio;
  const width = Math.round(canvas!.clientWidth * dpr);
  const height = Math.round(canvas!.clientWidth * 0.75 * dpr); // 4:3 비율
  canvas!.width = width;
  canvas!.height = height;
  gl!.viewport(0, 0, width, height);
}

// ---------------------------------------------------------------
// 2. 셰이더 컴파일 + 프로그램 링크
//    (C++의 컴파일/링크와 같은 개념. GPU에서 도는 코드를 만든다)
// ---------------------------------------------------------------
function compileShader(type: GLenum, source: string): WebGLShader {
  const shader = gl!.createShader(type);
  if (!shader) throw new Error('셰이더 객체 생성 실패');
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    const log = gl!.getShaderInfoLog(shader);
    gl!.deleteShader(shader);
    throw new Error(`셰이더 컴파일 실패:\n${log}`);
  }
  return shader;
}

function createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
  const program = gl!.createProgram();
  gl!.attachShader(program, compileShader(gl!.VERTEX_SHADER, vertSrc));
  gl!.attachShader(program, compileShader(gl!.FRAGMENT_SHADER, fragSrc));
  gl!.linkProgram(program);
  if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
    throw new Error(`프로그램 링크 실패:\n${gl!.getProgramInfoLog(program)}`);
  }
  return program;
}

const program = createProgram(vertSource, fragSource);

// ---------------------------------------------------------------
// 3. 정점 데이터를 GPU 버퍼에 올리기
//    정점마다 [x, y, r, g, b] 5개 float를 하나의 버퍼에 섞어 넣는다(interleaved).
// ---------------------------------------------------------------
// prettier-ignore
const vertices = new Float32Array([
  //  x     y     r    g    b
   0.0,  0.6,   1.0, 0.2, 0.2, // 위 (빨강)
  -0.6, -0.6,   0.2, 1.0, 0.2, // 왼쪽 아래 (초록)
   0.6, -0.6,   0.2, 0.2, 1.0, // 오른쪽 아래 (파랑)
]);

const FLOAT_SIZE = 4; // float 1개 = 4바이트
const STRIDE = 5 * FLOAT_SIZE; // 정점 하나의 바이트 크기

// VAO: "버퍼를 attribute에 어떻게 연결하는지"를 기억하는 객체
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// location 0 = a_position (vec2), 버퍼의 0바이트 지점부터
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);

// location 1 = a_color (vec3), 버퍼의 8바이트(2 float) 지점부터
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 2 * FLOAT_SIZE);

// ---------------------------------------------------------------
// 4. 그리기
// ---------------------------------------------------------------
function render() {
  gl!.clearColor(0.08, 0.08, 0.1, 1.0);
  gl!.clear(gl!.COLOR_BUFFER_BIT);

  gl!.useProgram(program);
  gl!.bindVertexArray(vao);
  gl!.drawArrays(gl!.TRIANGLES, 0, 3); // 정점 3개 = 삼각형 1개
}

resizeCanvas();
render();

// 창 크기가 바뀌면 캔버스 해상도를 맞추고 다시 그린다.
window.addEventListener('resize', () => {
  resizeCanvas();
  render();
});
