#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

#include "noise.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.y;
  float cellCount = 4.0;

  vec3 p = vec3(uv, 0.0);
  float c = perlinWorleyNoise(p, cellCount);

  outColor = vec4(vec3(c), 1.0);
}
