#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

#include "noise.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.y;
  vec3 pos = vec3(uv, 0.0);
  pos.xy += iTime * 0.1;
  float cellCount = 4.0;

  float c = cloudNoise(pos, cellCount);

  outColor = vec4(vec3(c), 1.0);
}
