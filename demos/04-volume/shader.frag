#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

#include "common.glsl"

out vec4 outColor;

void main(){
    
    outColor = vec4(vec3(0.5), 1.0);
}