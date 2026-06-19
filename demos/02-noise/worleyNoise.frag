#version 300 es

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

vec2 hash2(vec2 st);
float gnoise(vec2 st);
float fbm(vec2 st);
float wnoise(vec2 st);

void main()
{
    vec2 range = vec2(16.);
    vec2 uv = gl_FragCoord.xy / iResolution.xy * range;

    outColor = vec4(vec3(wnoise(uv)),1.0);
}
vec2 hash2(vec2 st)
{
    st = sin(vec2(
        dot(st.xy , vec2(12.3434, 54.1274)), 
        dot(st.xy , vec2(32.4154, 72.9263)))
    );

    return fract(st * 523215.535) * 2. - 1.;
}

float gnoise(vec2 p)
{
    vec2 v0 = vec2(0.,0.);
    vec2 v1 = vec2(1.,0.);
    vec2 v2 = vec2(0.,1.);
    vec2 v3 = vec2(1.,1.);

    vec2 a = vec2(floor(p));    // 원점
    vec2 b = a + v1;            // 우측
    vec2 c = a + v2;            // 위
    vec2 d = a + v3;            // 대각

    vec2 r0 = hash2(a);
    vec2 r1 = hash2(b);
    vec2 r2 = hash2(c);
    vec2 r3 = hash2(d);

    vec2 f = fract(p);
    vec2 u = smoothstep(0., 1. ,f);

    return mix(
        mix(dot(r0, f - v0),dot(r1, f - v1), u.x ),
        mix(dot(r2, f - v2),dot(r3, f - v3), u.x ),
        u.y
    );
}
float fbm(vec2 st)
{
    float amp = 0.5;
    float freq = 1.0;
    float sum = 0.0;

    int octaves = 3;
    for(int i =0;i < octaves; i++)
    {
        sum += amp* gnoise(st*freq);
        freq *= 2.0;
        amp *=0.5;
    }
    return sum;
}

// worley noise
float wnoise(vec2 st)
{
    vec2 cell = floor(st);
    vec2 f = fract(st);
    float minDist=  1e8;
    // 셀 단위 공유 hash를 이용 ( 같은 셀일 경우 point 동일 )
    // 자신을 포함한 이웃 셀을 돌면서 가장 작은 거리를 찾는다
    for(int y = -1; y <= 1; y++)    {
        for(int x = -1; x <= 1; x++){
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(cell + neighbor) * 0.5  + 0.5;
            vec2 diff = neighbor + point - f;
            minDist = min(minDist, length(diff));
        }
    }
    return minDist;
}