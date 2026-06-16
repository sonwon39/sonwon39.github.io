#version 300 es

// Worley Noise (Cellular / Voronoi)
// 공간을 셀로 나누고 셀마다 특징점(feature point)을 하나 둔다.
// 각 픽셀에서 "가장 가까운 특징점까지의 거리"를 값으로 쓴다 → 세포/물방울 무늬.

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123); // 0~1
}

float worley(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float minDist = 1.0;
    // 자기 셀과 이웃 8개 셀의 특징점을 검사
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = hash2(i + g);
            // 특징점이 셀 안에서 시간에 따라 움직이도록
            o = 0.5 + 0.5 * sin(iTime + 6.2831 * o);
            float d = length(g + o - f);
            minDist = min(minDist, d);
        }
    }
    return minDist;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.y * 6.0; // 6.0 = 셀 밀도
    float d = worley(uv);
    outColor = vec4(vec3(d), 1.0);
}
