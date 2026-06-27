#define NEAR_Z 0.1
#define FAR_Z 100.0
#define MAX_STEPS 40
#define SURFACE_DIST 0.01
#define MARCH_SIZE 0.08
#define PI 3.141592

vec4 sampleNoise(vec3 p);

const vec3 palette[7] = vec3[7](
  vec3(0.96, 0.26, 0.34),
  vec3(0.98, 0.55, 0.22),
  vec3(0.99, 0.8, 0.3),
  vec3(0.4, 0.78, 0.45),
  vec3(0.2, 0.65, 0.72),
  vec3(0.3, 0.45, 0.85),
  vec3(0.6, 0.35, 0.78)
);
mat3 rotX(float a){ float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }
mat3 rotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rotZ(float a){ float c=cos(a),s=sin(a); return mat3(c,s,0, -s,c,0, 0,0,1); }

float sdfSphere(vec3 p, vec3 c, float r) {
  return length(p - c) - r;
}

float sdTorus( vec3 p, vec3 c,  vec2 t, mat3 matrix )
{
  p = transpose(matrix)* (p-c);
  vec2 q = vec2(length(p.xz)-t.x, p.y);
  return length(q)-t.y;
}

float scene(vec3 p) {
  float sphere = sdfSphere(p, vec3(0.0, 0.0, 2.0), 1.0);
  return sphere;
}

float volume_scene(vec3 p) {
  float sphere = sdfSphere(p, vec3(0.0, 0.0, 2.0), 1.0);
  float tours = sdTorus(p.xyz, vec3(0.0, 0.0, 2.0), vec2(1.5,0.2), rotX(PI / 2.));
  float s = mix(sphere, tours, sin(iTime));
  vec3 noisePos = p;
  noisePos.xy += iTime;
  vec4 noise0 = sampleNoise(noisePos * 0.5);
  vec4 noise1 = sampleNoise(noisePos);
  float pwFbm = noise0.r;
  float cloud = noise0.g;
  float wFbm = noise1.b;
  float perlin = noise0.a;
  return -s + pwFbm * 0.5;
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
      int idx = int(mod(iTime, 7.0));
      int next = int(mod(float(idx) + 1.0, 7.0));
      float f = fract(iTime);
      vec3 c = mix(palette[idx], palette[next], f);

      vec4 color = vec4(mix(c, vec3(0.0), density), density);
      color.rgb *= density;
      res += color * (1.0 - res.a);
    }
    depth += MARCH_SIZE;
    p = ro + rd * depth;
  }

  return res;
}
