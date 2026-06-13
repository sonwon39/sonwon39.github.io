#version 300 es

// 프래그먼트 셰이더: 삼각형이 덮는 픽셀 하나마다 한 번씩 실행된다.
precision highp float;

// 버텍스 셰이더의 out과 이름이 같은 in으로 값을 받는다.
// 세 정점 사이에서 보간된 값이 들어오므로 색이 그라데이션으로 나타난다.
in vec3 v_color;

out vec4 fragColor;

void main() {
  fragColor = vec4(v_color, 1.0);
}
