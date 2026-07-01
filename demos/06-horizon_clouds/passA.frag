#version 300 es

precision highp float;

uniform vec2 iResolution;

out vec4 fragColor;

#include "common.glsl"


void main() {
    vec2 fragCoord = gl_FragCoord.xy; 
    vec2 uv = fragCoord / iResolution.xy;
    vec3 coord = fract(vec3(uv + vec2(.2,0.62), .5));
    vec4 col = vec4(1);
        
    col.r = perlinWorley( coord, 5, 4, 3. );

    col.g = 0.625 * wFbm( coord, 15., 3 ) +
    		0.250 * wFbm( coord, 19., 3 ) +
    		0.125 * wFbm( coord, 23., 3 ) 
        	-1.;
    col.b = 1. - wFbm( coord + 0.5, 9. , 6);
         
    fragColor = vec4(vec3(col),1.);
}