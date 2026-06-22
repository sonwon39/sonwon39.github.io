#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

#include "noise.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.y;
  const float freq = 8.0;

  float p = gFbm(vec3(uv, 0.0) * 0.5, freq, 7);
  float c = abs(p);

  outColor = vec4(vec3(c), 1.0);
}
