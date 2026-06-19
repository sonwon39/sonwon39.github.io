#version 300 es

// Truchet Noise

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

float rand(float st)
{
    return fract(sin(dot(st ,12.3434))* 523215.535);
}
float rand(vec2 st)
{
    return fract(sin(dot(st.xy , vec2(12.3434, 54.1234)))* 523215.535);
}
vec2 rand2(vec2 st)
{
    st = sin(
        vec2(dot(st.xy , vec2(12.3434, 54.1274)), 
        dot(st.xy , vec2(32.4154, 72.9263)))
    );

    return fract(st * 523215.535) * 2. - 1.;
}
float noise(vec2 p)
{
    vec2 v0 = vec2(0.,0.);
    vec2 v1 = vec2(1.,0.);
    vec2 v2 = vec2(0.,1.);
    vec2 v3 = vec2(1.,1.);

    vec2 a = vec2(floor(p));    // 원점
    vec2 b = a + v1;            // 우측
    vec2 c = a + v2;            // 위
    vec2 d = a + v3;            // 대각

    vec2 r0 = rand2(a);
    vec2 r1 = rand2(b);
    vec2 r2 = rand2(c);
    vec2 r3 = rand2(d);

    vec2 f = fract(p);
    vec2 u = smoothstep(0., 1. ,f);

    float color = mix(
        mix(dot(r0, f - v0),dot(r1, f - v1), u.x ),
        mix(dot(r2, f - v2),dot(r3, f - v3), u.x ),
        u.y
    );
    return color;
}

void main()
{
    // [0, xRange), [0, yRange)
    vec2 range = vec2(16.0);
    vec2 st = gl_FragCoord.xy / iResolution.xy * range;
    float color = noise(st);
    color = (color + 1.0)  * 0.5;
    outColor = vec4(vec3(color), 1.0);
}