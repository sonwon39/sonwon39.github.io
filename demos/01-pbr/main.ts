import vertSource from './shader.vert?raw';
import fragSource from './shader.frag?raw';

const canvas = document.querySelector<HTMLCanvasElement>('#gl-canvas')
if (!canvas) throw new Error('#gl-canvas 캔버스를 찾을 수 없습니다.');
const gl  = canvas.getContext('webgl2')
if (!gl) throw new Error('이 브라우저는 WebGL2를 지원하지 않습니다.');

function resizeCanvas() {
  const dpr = window.devicePixelRatio;
  const width = Math.round(canvas!.clientWidth * dpr);
  const height = Math.round(canvas!.clientWidth * 0.75 * dpr); // 4:3 비율
  canvas!.width = width;
  canvas!.height = height;
  gl!.viewport(0, 0, width, height);
}

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

const vertices = new Float32Array([
  //  x     y   
   -1.0,  1.0,
   -1.0, -1.0,
    1.0, -1.0,
    1.0,  1.0
]);
const indices = new Uint16Array([
  0, 1, 2, // 삼각형 1
  0, 2, 3, // 삼각형 2
]);

const FLOAT_SIZE = 4; // float 1개 = 4바이트
const STRIDE = 2 * FLOAT_SIZE; // 정점 하나의 바이트 크기
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);

const ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const iTimeLoc = gl.getUniformLocation(program, 'iTime');
const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');

function render(timeMs: number) {
  gl!.clearColor(0.08, 0.08, 0.1, 1.0);
  gl!.clear(gl!.COLOR_BUFFER_BIT);
  
  gl!.useProgram(program);
  gl!.uniform1f(iTimeLoc, timeMs * 0.001);
  gl!.uniform2f(iResolutionLoc, canvas!.width, canvas!.height);

  gl!.bindVertexArray(vao);
  gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

resizeCanvas();
requestAnimationFrame(render);

// 창 크기가 바뀌면 캔버스 해상도를 맞추고 다시 그린다.
window.addEventListener('resize', () => {
  resizeCanvas();
  requestAnimationFrame(render);
});