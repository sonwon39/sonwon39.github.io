#version 300 es

precision highp float;

uniform float iTime;       // JS에서 매 프레임 넘겨줘야 함
uniform vec2  iResolution; // 캔버스 픽셀 크기

out vec4 outColor;

// 장면 정의: 점 p에서 가장 가까운 표면까지의 거리를 반환
float map(vec3 p) {
    // 구: 중심까지 거리 - 반지름. 시간에 따라 위아래로 움직임
    float sphere = length(p - vec3(0.0, 0.5 + 0.3*sin(iTime), 0.0)) - 0.5;
    // 바닥 평면: 그냥 y 좌표
    float ground = p.y + 0.5;
    return min(sphere, ground);   // min = 두 물체의 합집합
}

// 법선: SDF의 기울기(gradient)를 수치미분으로 구함
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // 픽셀 좌표를 -1~1 범위로 정규화 (종횡비 보정)
    vec2 uv = (2.0*fragCoord - iResolution.xy) / iResolution.y;

    // 카메라: 원점에서 약간 뒤, 레이는 픽셀 방향으로
    vec3 ro = vec3(0.0, 0.5, -3.0);          // ray origin
    vec3 rd = normalize(vec3(uv, 1.5));       // ray direction

    // === Raymarching 루프: 이 셰이더의 심장 ===
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;     // 레이 위의 현재 위치
        float d = map(p);          // 가장 가까운 표면까지 거리
        if (d < 0.001) break;      // 표면에 닿음
        t += d;                    // 그 거리만큼 안전하게 전진
        if (t > 20.0) break;       // 너무 멀면 포기 (하늘)
    }

    vec3 col = vec3(0.6, 0.75, 0.9);          // 하늘색 (기본값)
    if (t < 20.0) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 lightDir = normalize(vec3(0.8, 0.7, -0.5));
        float diff = max(dot(n, lightDir), 0.0);          // 램버트 조명
        col = vec3(1.0, 0.5, 0.3) * diff + vec3(0.05);    // 주황색 물체
        col = mix(col, vec3(0.6, 0.75, 0.9), 1.0 - exp(-0.02*t*t)); // 거리 안개
    }

    fragColor = vec4(pow(col, vec3(0.4545)), 1.0);  // 감마 보정
    //fragColor = vec4(1.0,1.0,1.0,1.0);
}

void main() {
  mainImage(outColor, gl_FragCoord.xy);  // 진짜 진입점
}

