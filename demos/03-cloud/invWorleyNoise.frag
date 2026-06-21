#version 300 es

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

#include "common.glsl"

void main()
{
    //vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    //float w = wnoise(vec3(uv, iTime * 0.1) * freq);
    
    vec2 uv = gl_FragCoord.xy  / iResolution.y;
    float w = wnoise(vec3(uv, 0.) * freq * 1.5);
    float c = 1.0 - w;
    outColor = vec4(vec3(c),1.0);
}
