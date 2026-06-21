#version 300 es

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

#include "common.glsl"

void main()
{
   float cellCount = 4.0;
    vec2 uv = gl_FragCoord.xy / iResolution.y;
    float w = worleyFbm(vec3(uv, 0.0), cellCount);
    outColor = vec4(vec3(w),1.0);
}
