#version 300 es

precision highp float;

// 3D 노이즈 텍스처를 한 슬라이스(z)씩 그린다. main.ts가 z를 0..1로 바꿔가며
// FBO 색 첨부에 z 레이어를 갈아 끼우는 방식으로 64회(BAKE_SIZE) 호출된다.
uniform float uZSlice;
uniform vec2 iResolution;

#include "noise.glsl"

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution; // [0,1]
  vec3 p = vec3(uv, uZSlice);
  //
  float R = clamp(perlinWorleyNoise(p * 2.0, 4.0), 0.0, 1.0);
  float G = clamp(cloudNoise(p * 2.0, 4.0), 0.0, 1.0);
  float B = clamp(worleyFbm(p, 4.0), 0.0, 1.0);
  float A = clamp(abs(gFbm(p, 4.0, 7)), 0.0, 1.0);
  outColor = vec4(R, G, B, A); // R8 포맷이라 .r만 저장됨
}
