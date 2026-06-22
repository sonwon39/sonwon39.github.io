#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

#include "common.glsl"

out vec4 outColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution) / iResolution.y;
  vec3 ro = vec3(0.0, 0.0, -1.0);
  vec3 rd = normalize(vec3(uv, NEAR_Z) - ro);

  vec4 c = volume_raymarch(ro, rd);
  outColor = vec4(c);
}
