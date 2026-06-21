#version 300 es

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

#include "common.glsl"

void main()
{
    vec2 uv = gl_FragCoord.xy / iResolution.y;
    vec3 pos = vec3(uv, 0.);
    pos.xy += iTime*0.1;
    float cellCount = 4.0;

    float pfbm = abs(gFbm(pos * 0.5 , cellCount, 7));
    float wfbm0 = worleyFbm(pos * 0.5, cellCount);
    float wfbm1 = worleyFbm(pos, cellCount);

    float perlinWorley = remap(pfbm, 0., 1., wfbm0, 1.);
    float cloud = remap(perlinWorley, wfbm1 - 1., 1., 0., 1.);
    cloud = remap(cloud, .85, 1., 0., 1.); 
    
    float c = cloud;

    outColor = vec4(vec3(c),1.0);
}
