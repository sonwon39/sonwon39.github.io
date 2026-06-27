#include "noise.glsl"
#include "raymarch.glsl"

// 미리 구워둔 노이즈 3D 텍스처. main.ts가 시작할 때 한 번
uniform highp sampler3D uNoise;

vec4 sampleNoise(vec3 p) {
  return texture(uNoise, p);
}
