import vertSource from './shader.vert?raw';
import fragSource from './shader.frag?raw';
import bakeFragSource from './bake.frag?raw';
import commonGlsl from './common.glsl?raw';
import noiseGlsl from '../_shared/noise.glsl?raw';

const canvas = document.querySelector<HTMLCanvasElement>('#gl-canvas');
if (!canvas) throw new Error('#gl-canvas 캔버스를 찾을 수 없습니다.');
const gl = canvas.getContext('webgl2');
if (!gl) throw new Error('이 브라우저는 WebGL2를 지원하지 않습니다.');

const SHADER_INCLUDES: Record<string, string> = {
  'common.glsl': commonGlsl,
  'noise.glsl': noiseGlsl,
};

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

// 노트북 GPU에서 raymarching이 너무 무거워서, 내부 drawing buffer를
// CSS 표시 크기의 절반으로 줄인다. 픽셀 수 1/4로 감소 → ~4배 빨라짐.
// 브라우저가 캔버스를 표시할 때 CSS 크기에 맞춰 자동으로 업스케일해 줘서,
// 약간 부드러워 보일 뿐 큰 시각적 차이는 없다.
const RENDER_SCALE = 0.5;

function resizeCanvas() {
  const dpr = window.devicePixelRatio;
  const width = Math.round(canvas!.clientWidth * dpr * RENDER_SCALE);
  const height = Math.round(canvas!.clientWidth * 0.75 * dpr * RENDER_SCALE); // 4:3 비율
  canvas!.width = width;
  canvas!.height = height;
  gl!.viewport(0, 0, width, height);
}

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
  gl.attachShader(
    program,
    compileShader(gl, gl.VERTEX_SHADER, resolveIncludes(vertSrc)),
  );
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, resolveIncludes(fragSrc)),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`프로그램 링크 실패:\n${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

const program = createProgram(gl, vertSource, fragSource);
const bakeProgram = createProgram(gl, vertSource, bakeFragSource);

const vertices = new Float32Array([
  //  x     y
  -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
]);
const indices = new Uint16Array([
  0,
  1,
  2, // 삼각형 1
  0,
  2,
  3, // 삼각형 2
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

// ===== 노이즈 3D 텍스처 베이킹 =====
// perlin-worley 노이즈는 hash 100+회를 도는 비싼 함수라 raymarching 매 step마다
// 호출하면 노트북 GPU에서 실시간 렌더가 안 된다. 시작할 때 한 번 64³ 3D 텍스처에
// 굽고, 본 렌더에서는 texture() 호출 한 번으로 트라이리니어 보간된 값을 받는다.
const BAKE_SIZE = 64;

const noiseTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_3D, noiseTex);
gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, BAKE_SIZE, BAKE_SIZE, BAKE_SIZE);
// 트라이리니어 보간 + 박스 밖은 텍스처가 무한 타일링 (REPEAT)
// → iTime을 더해서 좌표가 박스 밖으로 나가도 자동으로 wrap 됨
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);

// FBO에 z 레이어를 갈아 끼우면서 bake.frag로 풀스크린 quad를 그린다.
const bakeFbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFbo);

gl.useProgram(bakeProgram);
gl.viewport(0, 0, BAKE_SIZE, BAKE_SIZE);
gl.uniform2f(
  gl.getUniformLocation(bakeProgram, 'iResolution'),
  BAKE_SIZE,
  BAKE_SIZE,
);
const bakeZLoc = gl.getUniformLocation(bakeProgram, 'uZSlice');

for (let z = 0; z < BAKE_SIZE; z++) {
  gl.framebufferTextureLayer(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    noiseTex,
    0,
    z,
  );
  // 셀 중앙 좌표를 샘플 위치로 (0.5/N, 1.5/N, ...)
  gl.uniform1f(bakeZLoc, (z + 0.5) / BAKE_SIZE);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

// 메인 렌더용으로 상태 복구
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
// 텍스처 유닛 0에 3D 노이즈 바인딩 (메인 셰이더의 uNoise sampler가 이걸 쓴다)
gl.useProgram(program);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_3D, noiseTex);
gl.uniform1i(gl.getUniformLocation(program, 'uNoise'), 0);
// ===== 베이킹 끝 =====

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
