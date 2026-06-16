#version 300 es

// Truchet Noise

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

float rand(vec2 st)
{
    return fract(sin(dot(st.xy , vec2(12.3434, 54.1234)))* 523215.535);
}

void main()
{
    // [-xRange, xRange], [-yRange, yRange]
    float range = 16.0;
    vec2 st = gl_FragCoord.xy / iResolution.xy * range;
   
    vec2 a = vec2(floor(st.x), floor(st.y));    // 원점
    vec2 b = a + vec2(1.,0.);                   // 우측
    vec2 c = a + vec2(0.,1.);                   // 위
    vec2 d = a + vec2(1.,1.);                   // 대각

    float r0 = rand(a);
    float r1 = rand(b);
    float r2 = rand(c);
    float r3 = rand(d);

    vec2 f = fract(st);
  
    vec2 u = smoothstep(0., 1. ,f);

    float c0 = mix(r0, r1, u.x);
    float c1 = mix(r2, r3, u.x);

    float color  = mix(c0, c1, u.y);

    outColor = vec4(vec3(color), 1.0);
}