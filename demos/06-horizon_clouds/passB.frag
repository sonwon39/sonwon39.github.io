#version 300 es

precision highp float;

uniform float uLayer;   // 현재 z 슬라이스 인덱스 (0..uSize-1)
uniform float uSize;    // 3D 텍스처 한 변 크기 (32)


#include "common.glsl"

out vec4 fragColor;


void main() {
    vec3 coord = vec3(gl_FragCoord.xy, uLayer + 0.5) / uSize;

    float r = wFbm( coord,  3. , 16);
    float g = wFbm( coord,  8. ,  4);
    float b = wFbm( coord, 16. ,  4);
 
    float c = max(0., 1.-(r + g * .5 + b * .25) / 1.75);
 
    fragColor = vec4(c);
}