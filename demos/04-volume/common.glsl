#define NEAR_Z 0.1
#define FAR_Z 100.0
#define MAX_STEPS 40
#define SURFACE_DIST 0.01
#define MARCH_SIZE 0.08

// 미리 구워둔 perlin-worley 노이즈 3D 텍스처. main.ts가 시작할 때 한 번
// bake.frag로 채워서 uNoise에 바인딩한다. 매 step마다 hash 수천 번 도는
// 대신 texture 한 번이면 됨.
uniform highp sampler3D uNoise;

// 텍스처가 커버하는 월드 공간 박스 (bake.frag와 동일해야 함)
const vec3 NOISE_BOUNDS_MIN = vec3(-2.0, -2.0, 0.0);
const vec3 NOISE_BOUNDS_SIZE = vec3(4.0, 4.0, 4.0);

float sampleNoise(vec3 p) {
  vec3 uv = (p - NOISE_BOUNDS_MIN) / NOISE_BOUNDS_SIZE;
  return texture(uNoise, uv).r;
}

float sdfSphere(vec3 p, vec3 c, float r) {
  return length(p - c) - r;
}

float scene(vec3 p) {
  float sphere = sdfSphere(p, vec3(0.0, 0.0, 2.0), 1.0);
  return sphere;
}
float volume_scene(vec3 p) {
  float sphere = sdfSphere(p, vec3(0.0, 0.0, 2.0), 1.0);
  vec3 noisePos = p;
  noisePos.xy += iTime;
  float f = sampleNoise(noisePos);
  return -sphere + f;
}
float raymarch(vec3 ro, vec3 rd) {
  float dist = 0.0;
  for (int t = 0; t < MAX_STEPS; t++) {
    vec3 p = ro + rd * dist;

    float s = scene(p);
    dist += s;
    if (s < SURFACE_DIST || dist > FAR_Z) break;
  }
  return dist;
}

vec4 volume_raymarch(vec3 ro, vec3 rd) {
  float depth = 0.0;
  vec3 p = ro + rd * depth;
  vec4 res = vec4(0.0);

  for (int t = 0; t < MAX_STEPS; t++) {
    float density = volume_scene(p);

    if (density > 0.0) {
      vec4 color = vec4(mix(vec3(1.0), vec3(0.0), density), density);
      color.rgb *= density;
      res += color * (1.0 - res.a);
    }
    depth += MARCH_SIZE;
    p = ro + rd * depth;
  }

  return res;
}
