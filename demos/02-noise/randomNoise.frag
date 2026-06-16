#version 300 es

// Value Noise

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

float random(vec2 st)
{
    return fract(sin(dot(st.xy , vec2(12.424, 52.323))) * 424.2123);
}
void main()
{
    
    vec2 st = gl_FragCoord.xy / iResolution.xy;
    outColor = vec4(vec3(random(st)), 1.0);
}