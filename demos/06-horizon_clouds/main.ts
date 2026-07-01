import vertSource from './shader.vert?raw';
import fragSource from './main.frag?raw';
import passAFrag from './passA.frag?raw';
import passBFrag from './passB.frag?raw';
import commonGlsl from './common.glsl?raw';


const canvas = document.querySelector<HTMLCanvasElement>('#gl-canvas');
if (!canvas) throw new Error('#gl-canvas 캔버스를 찾을 수 없습니다.');
const gl = canvas.getContext('webgl2');
if (!gl) throw new Error('이 브라우저는 WebGL2를 지원하지 않습니다.');

canvas.width = 800;
canvas.height = 450;

// 부동소수 버퍼: 렌더 타깃(32F/16F) + 선형 필터링.
// 32F가 필요한 이유 = temporal reprojection의 카메라 행렬(Buffer D)을 정밀 저장해야
// 재투영 좌표가 프레임마다 튀지 않음(16F면 terrain 색이 진동). Shadertoy 버퍼도 32F.
if (!gl.getExtension('EXT_color_buffer_float'))
  throw new Error('EXT_color_buffer_float 미지원 (32F 렌더 타깃 불가)');
if (!gl.getExtension('OES_texture_float_linear'))
  throw new Error('OES_texture_float_linear 미지원 (32F 선형 필터 불가)');

const SHADER_INCLUDES: Record<string, string> = {
 'common.glsl': commonGlsl,
};

function resolveIncludes(source: string): string {
  return source.replace(
    /^[ \t]*#include\s+"([^"]+)"[ \t]*$/gm,
    (_m, name: string) => {
      const inc = SHADER_INCLUDES[name];
      if (inc === undefined) throw new Error(`#include 대상 없음: "${name}"`);
      return resolveIncludes(inc);
    },
  );
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
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, resolveIncludes(vertSrc)));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, resolveIncludes(fragSrc)));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`프로그램 링크 실패:\n${gl.getProgramInfoLog(program)}`);
  }
  return program;
}
function createTexture(width: number, height : number, wrap : GLenum = gl!.CLAMP_TO_EDGE) {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);

    gl!.texStorage2D(
        gl!.TEXTURE_2D,
        1,
        gl!.RGBA32F,   // 32F: reprojection 카메라 정밀도 확보 (16F면 terrain 색 진동)
        width,
        height
    );

    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wrap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wrap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_R, wrap);
    const ext = gl!.getExtension("EXT_color_buffer_float");

    if (!ext)
    {
        throw new Error("EXT_color_buffer_float not supported");
    }


    return tex;
}

// Buffer A(구름 베이스 노이즈)는 큰 uv로 타일링 샘플 → REPEAT 필수
const tex = createTexture(canvas!.width, canvas!.height, gl.REPEAT);
let dstTexA = tex;

const mainProgram = createProgram(gl, vertSource, fragSource);
const passAProgram = createProgram(gl, vertSource, passAFrag);
const passBProgram = createProgram(gl, vertSource, passBFrag);


// 화면을 덮는 사각형 (두 삼각형)
const vertices = new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * 4, 0);

const ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);


const iTimeLoc = gl.getUniformLocation(mainProgram, 'iTime');
const iResolutionLoc = gl.getUniformLocation(mainProgram, 'iResolution');
const iChannel0Loc = gl.getUniformLocation(mainProgram, 'iChannel0');
const iChannel1Loc = gl.getUniformLocation(mainProgram, 'iChannel1');

const passAFbo = gl.createFramebuffer();

const RENDER_SCALE = 1.;
let currFrame = 0;

// 원본 Shadertoy(Himalayas)와 동일하게 16:9 고정 해상도로 렌더 (결정론적 비교용).
// 윈도우 크기/DPR에 무관 — Buffer A/B LUT와 누적이 매번 동일하게 재현됨.
// 화면 표시는 CSS(width:100%)가 비율을 유지하며 스케일.
const RENDER_WIDTH = 800;
const RENDER_HEIGHT = 450;

function resizeCanvas() {
  const width = Math.round(RENDER_WIDTH * RENDER_SCALE);
  const height = Math.round(RENDER_HEIGHT * RENDER_SCALE);
  canvas!.width = width;
  canvas!.height = height;
  

  gl!.viewport(0, 0, width, height);
}

function renderPass(timeMs: number, program : WebGLProgram, dstTex : WebGLTexture)
{
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, passAFbo);
  gl!.viewport(0, 0, canvas!.width, canvas!.height);
  gl!.framebufferTexture2D( gl!.FRAMEBUFFER,
        gl!.COLOR_ATTACHMENT0,
        gl!.TEXTURE_2D,
        dstTex,
        0
    );

  const iTimeLoc = gl!.getUniformLocation(program, 'iTime');
  const iResolutionLoc = gl!.getUniformLocation(program, 'iResolution');

  gl!.useProgram(program);
  gl!.bindVertexArray(vao);

  gl!.uniform1f(iTimeLoc,  timeMs * 0.001  );
  gl!.uniform2f(iResolutionLoc, canvas!.width, canvas!.height);
  gl!.uniform1i(iChannel0Loc, 0);
  gl!.uniform1i(iChannel1Loc, 1);

  gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
}

function createTexture3D(size: number): WebGLTexture {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_3D, tex);
    gl!.texStorage3D(gl!.TEXTURE_3D, 1, gl!.RGBA16F, size, size, size);
    gl!.texParameteri(gl!.TEXTURE_3D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_3D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_3D, gl!.TEXTURE_WRAP_S, gl!.REPEAT);
    gl!.texParameteri(gl!.TEXTURE_3D, gl!.TEXTURE_WRAP_T, gl!.REPEAT);
    gl!.texParameteri(gl!.TEXTURE_3D, gl!.TEXTURE_WRAP_R, gl!.REPEAT);
    return tex;
}
const DETAIL_SIZE = 32;

function generateDetailTexture(program : WebGLProgram, dstTex : WebGLTexture) {
  // 함수 끝에서 bindFramebuffer(null)로 풀기 때문에, 매 호출마다 FBO를 다시 바인딩해야 한다.
  // (안 하면 두 번째 호출이 default 프레임버퍼 상태 → framebufferTextureLayer가 무효가 됨)
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, passAFbo);
  gl!.useProgram(program);
  gl!.bindVertexArray(vao);
  gl!.viewport(0, 0, DETAIL_SIZE, DETAIL_SIZE);
  const uLayerLoc = gl!.getUniformLocation(program, 'uLayer');
  const uSizeLoc = gl!.getUniformLocation(program, 'uSize');
  gl!.uniform1f(uSizeLoc, DETAIL_SIZE);
  for (let z = 0; z < DETAIL_SIZE; z++) {
    gl!.framebufferTextureLayer(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, dstTex, 0, z);
    gl!.uniform1f(uLayerLoc, z);
    gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
  }
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
}
const detailTex3DB = createTexture3D(DETAIL_SIZE);

//timeMs = 0.;
renderPass(0., passAProgram, dstTexA);
generateDetailTexture(passBProgram, detailTex3DB);

function render(timeMs: number) {
  gl!.viewport(0, 0, canvas!.width, canvas!.height);

  //
  // 화면 출력
  //
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  gl!.useProgram(mainProgram);

  gl!.activeTexture(gl!.TEXTURE0);
  gl!.bindTexture(gl!.TEXTURE_2D, dstTexA);
  gl!.activeTexture(gl!.TEXTURE1);
  gl!.bindTexture(gl!.TEXTURE_3D, detailTex3DB);
  gl!.uniform1i(iChannel0Loc, 0);
  gl!.uniform1i(iChannel1Loc, 1);
  gl!.uniform1f(iTimeLoc, timeMs * 0.001);
  gl!.viewport(0, 0, canvas!.width, canvas!.height);
  gl!.uniform2f(iResolutionLoc, canvas!.width, canvas!.height);
  gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);

  currFrame++;
  requestAnimationFrame(render);
}

resizeCanvas();
requestAnimationFrame(render);
window.addEventListener('resize', resizeCanvas);
