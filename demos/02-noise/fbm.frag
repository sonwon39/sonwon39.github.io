#version 300 es

// fBm (fractional Brownian motion)
// 그래디언트 노이즈를 주파수를 2배씩 키우고 진폭을 절반씩 줄이며 여러 번(옥타브) 더한다.
// 큰 굴곡 위에 점점 작은 디테일이 얹혀 구름/연기/지형 같은 모습이 된다.

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gradientNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;  // 진폭
    float freq = 1.0; // 주파수
    for (int i = 0; i < 6; i++) {
        sum += amp * gradientNoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.y;
    float n = fbm(uv * 3.0 + vec2(iTime * 0.1, 0.0));
    n = n * 0.5 + 0.5;
    // 어두운 파랑 → 흰색으로 매핑해 구름 느낌
    vec3 col = mix(vec3(0.05, 0.1, 0.25), vec3(0.95, 0.97, 1.0), n);
    outColor = vec4(col, 1.0);
}
