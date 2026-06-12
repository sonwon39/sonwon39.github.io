#version 300 es

// 버텍스 셰이더: 정점(vertex) 하나마다 한 번씩 실행된다.
// in  = 정점 버퍼에서 들어오는 attribute
// out = 프래그먼트 셰이더로 넘어가는 값 (삼각형 내부에서 자동 보간됨)

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_color;

out vec3 v_color;

void main() {
  v_color = a_color;
  // gl_Position은 클립 공간 좌표. x, y가 -1 ~ +1이면 화면 안에 보인다.
  gl_Position = vec4(a_position, 0.0, 1.0);
}
