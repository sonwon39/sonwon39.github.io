#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

#include "noise.glsl"

void main() {
  const float freq = 8.0;

  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float c = gFbm(vec3(uv, 0.0), freq, 7) * 0.5 + 0.5;
  outColor = vec4(vec3(c), 1.0);
}
