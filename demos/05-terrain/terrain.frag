#version 300 es
precision highp float;

#include "common.glsl"

uniform float iTime;
uniform vec2 iResolution;

out vec4 fragColor;

void main() {
    vec3 ro, rd;
    getRay(gl_FragCoord.xy, iResolution.xy, ro, rd);

    vec3 col = raymarch(ro, rd, iTime);
    //col = mix(col, pow(col, vec3(1./2.2)), 0.85);
    col = pow(clamp(col,0.,1.), vec3(0.85));  
    fragColor = vec4(col, 1.);
}
