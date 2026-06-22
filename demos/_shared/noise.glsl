// 여러 데모가 함께 쓰는 노이즈 함수 모음.

const float freq = 8.0;
vec3 quintic(vec3 x) {
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

vec2 hash22(vec2 p) {
  p = sin(
    vec2(dot(p.xy, vec2(12.3434, 54.1274)), dot(p.xy, vec2(32.4154, 72.9263)))
  );

  return fract(p * 523215.535) * 2.0 - 1.0;
}

vec3 hash33(vec3 p) {
  p = sin(
    vec3(
      dot(p, vec3(12.3434, 54.1274, 32.54236)),
      dot(p, vec3(32.4154, 72.9263, 54.435342)),
      dot(p, vec3(70.2315, 62.34593, 34.43525))
    )
  );

  return fract(p * 523215.535) * 2.0 - 1.0;
}

float gnoise(vec3 p) {
  vec3 v0 = vec3(0.0, 0.0, 0.0);
  vec3 v1 = vec3(1.0, 0.0, 0.0);
  vec3 v2 = vec3(0.0, 1.0, 0.0);
  vec3 v3 = vec3(1.0, 1.0, 0.0);
  vec3 v4 = vec3(0.0, 0.0, 1.0);
  vec3 v5 = vec3(1.0, 0.0, 1.0);
  vec3 v6 = vec3(0.0, 1.0, 1.0);
  vec3 v7 = vec3(1.0, 1.0, 1.0);

  vec3 a = floor(p);
  vec3 b = a + v1;
  vec3 c = a + v2;
  vec3 d = a + v3;
  vec3 e = a + v4;
  vec3 f = a + v5;
  vec3 g = a + v6;
  vec3 h = a + v7;

  vec3 h0 = hash33(a);
  vec3 h1 = hash33(b);
  vec3 h2 = hash33(c);
  vec3 h3 = hash33(d);
  vec3 h4 = hash33(e);
  vec3 h5 = hash33(f);
  vec3 h6 = hash33(g);
  vec3 h7 = hash33(h);

  vec3 w = fract(p);
  vec3 u = clamp(quintic(w), 0.0, 1.0);

  float va = dot(h0, w - v0);
  float vb = dot(h1, w - v1);
  float vc = dot(h2, w - v2);
  float vd = dot(h3, w - v3);
  float ve = dot(h4, w - v4);
  float vf = dot(h5, w - v5);
  float vg = dot(h6, w - v6);
  float vh = dot(h7, w - v7);

  return mix(
    mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y),
    mix(mix(ve, vf, u.x), mix(vg, vh, u.x), u.y),
    u.z
  );
}

float gFbm(vec3 st, float freq, const int octaves) {
  float G = exp2(-0.85);
  float amp = 1.0;
  float sum = 0.0;
  float norm = 0.0;

  for (int i = 0; i < octaves; i++) {
    sum += amp * gnoise(st * freq);
    norm += amp;
    freq *= 2.0;
    amp *= G;
  }
  //return clamp((sum / norm) * 0.5 + 0.5, 0.0, 1.0);
  return sum;
}

// worley noise by 2d hash
float wnoise2d(vec2 st) {
  vec2 cell = floor(st);
  vec2 f = fract(st);
  float minDist = 1e8;
  // 셀 단위 공유 hash를 이용 ( 같은 셀일 경우 point 동일 )
  // 자신을 포함한 이웃 셀을 돌면서 가장 작은 거리를 찾는다
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 point = hash22(cell + offset) * 0.5 + 0.5;
      vec2 diff = offset + point - f;
      minDist = min(minDist, dot(diff, diff));
    }
  }
  return 1.0 - minDist;
}

float wnoise(vec3 st) {
  vec3 cell = floor(st);
  vec3 f = fract(st);

  float minDist = 1e9;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 offset = vec3(float(x), float(y), float(z));
        vec3 p = hash33(offset + cell) * 0.5 + 0.5;
        vec3 diff = offset + p - f;
        minDist = min(minDist, dot(diff, diff));
      }

    }
  }
  return clamp(minDist, 0.0, 1.0);
}

float worleyFbm(vec3 p, float freq) {
  return (1.0 - wnoise(p * freq)) * 0.625 +
  (1.0 - wnoise(p * freq * 2.0)) * 0.25 +
  (1.0 - wnoise(p * freq * 4.0)) * 0.125;
}

float wFbm(vec3 p, float freq, const int octaves) {
  float amp = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  for (int i = 0; i < octaves; i++) {
    sum += amp * wnoise(p);
    norm += amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum / norm;
}

float remap(
  float Perlin,
  float Worley_FBM,
  float OldMax,
  float NewMin,
  float NewMax
) {
  return NewMin +
  (Perlin - Worley_FBM) / (OldMax - Worley_FBM) * (NewMax - NewMin);
}

float perlinWorleyNoise(vec3 p, float freq) {
  float pfbm = abs(gFbm(p * 0.5, freq, 7));
  float wfbm = worleyFbm(p * 0.5, freq);

  float perlinWorley = remap(pfbm, 0.0, 1.0, wfbm, 1.0);
  return perlinWorley;

}

float cloudNoise(vec3 p, float freq) {
  float wfbm = worleyFbm(p, freq);
  float perlinWorley = perlinWorleyNoise(p, freq);
  float cloud = remap(perlinWorley, wfbm - 1.0, 1.0, 0.0, 1.0);

  return remap(cloud, 0.85, 1.0, 0.0, 1.0);

}
