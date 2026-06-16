#version 300 es

// Gradient Noise (Perlin 계열)
// 격자 모서리마다 "난수 값"이 아니라 "난수 방향(그래디언트)"을 두고,
// 모서리→픽셀 방향벡터와의 내적을 보간한다. value noise보다 더 부드럽고 자연스럽다.

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

// 2D → 2D 해시. -1~1 범위의 임의 방향 벡터.
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gradientNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    // 각 모서리: 그래디언트 · (모서리에서 픽셀까지의 거리벡터)
    float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.y;
    float n = gradientNoise(uv * 8.0 + iTime * 0.3);
    n = n * 0.5 + 0.5; // [-1,1] → [0,1]
    outColor = vec4(vec3(n), 1.0);
}
