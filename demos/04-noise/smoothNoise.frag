#version 300 es

// Truchet Noise

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

float rand(float x)
{
    return fract(sin(x * 12.3434)* 523215.535);
}

void main()
{
    // [-xRange, xRange], [-yRange, yRange]
    vec2 st = gl_FragCoord.xy / iResolution.xy;
    float xRange = 3.0;
    float yRange = 2.0;
    st.x = (st.x * 2.0 - 1.0) * xRange;
    st.y = (st.y * 2.0 - 1.0) * yRange;
    float yw = 2.0 * fwidth(st.y);

    float x = floor(st.x);
    float f = fract(st.x);
    float y = mix(rand(x), rand(x+1.0), smoothstep(0. ,1., f));

    float graph = 1.0 -  smoothstep(0.0, yw, abs(y - st.y));
    outColor = vec4(vec3(1.0- graph), 1.0);
}