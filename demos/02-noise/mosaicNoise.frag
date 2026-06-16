#version 300 es

// Mosaic Noise

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

float random(vec2 uv)
{
    return fract(sin(dot(uv.xy, vec2(12.3434, 54.343)))* 523215.535);
}

void main()
{
    vec2 gridSize = vec2(16.0);
    vec2 grid = (gl_FragCoord.xy / iResolution.xy) * (gridSize);


    float x =  floor(grid.x);
    float y =  floor(grid.y);
    float c = random(floor(grid));
    outColor = vec4(vec3(c), 1.0);
}