#include "noise.glsl"
#include "raymarch.glsl"

// 미리 구워둔 노이즈 3D 텍스처. main.ts가 시작할 때 한 번
uniform highp sampler3D uNoise;
vec4 sampleNoise(vec3 p) {
  return texture(uNoise, p);
}


#define COVERAGE    0.50        // how much of the sky is covered (0..1)
#define THICKNESS   15.0        // vertical thickness of the cloud slab
#define ABSORPTION  1.030725    // how strongly clouds absorb light
#define STEPS       25          // raymarch steps through the slab
#define FBM_FREQ    2.76434     // lacunarity of the fractal noise

// Clouds drift over time. Set to vec3(0.0) to freeze them.
#define WIND        vec3(0.0, 0.0, -iTime * 0.2)

// Fixed sun direction (was animated with time in the original).
#define SUN_DIR     normalize(vec3(0.0, 0.6, -1.0))

const float MAX_DIST = 1e8;


// ------------------------------- Types --------------------------------------
struct ray_t    { vec3 origin; vec3 direction; };
struct sphere_t { vec3 origin; float radius; int material; };
struct plane_t  { vec3 direction; float distance; int material; };
struct hit_t    { float t; int material_id; vec3 normal; vec3 origin; };

hit_t make_no_hit() {
    return hit_t(MAX_DIST + 1.0, -1, vec3(0.0), vec3(0.0));
}


// ------------------------------- Camera -------------------------------------
ray_t get_primary_ray(vec3 cam_local_point, vec3 cam_origin, vec3 cam_look_at) {
    vec3 fwd   = normalize(cam_look_at - cam_origin);
    vec3 up    = vec3(0.0, 1.0, 0.0);
    vec3 right = cross(up, fwd);
    up = cross(fwd, right);
    return ray_t(
        cam_origin,
        normalize(fwd + up * cam_local_point.y + right * cam_local_point.x)
    );
}


// --------------------- Ray / surface intersections --------------------------
// Ray-sphere (geometric solution).
void intersect_sphere(ray_t ray, sphere_t sphere, inout hit_t hit) {
    vec3  rc      = sphere.origin - ray.origin;
    float radius2 = sphere.radius * sphere.radius;
    float tca     = dot(rc, ray.direction);
    float d2      = dot(rc, rc) - tca * tca;
    if (d2 > radius2) return;

    float thc = sqrt(radius2 - d2);
    float t0  = tca - thc;
    float t1  = tca + thc;

    if (t0 < 0.0)     t0 = t1;
    if (t0 > hit.t)   return;

    vec3 impact = ray.origin + ray.direction * t0;
    hit.t           = t0;
    hit.material_id = sphere.material;
    hit.origin      = impact;
    hit.normal      = (impact - sphere.origin) / sphere.radius;
}

// Ray-plane:  t = ((P0 - O) . N) / (N . D)
void intersect_plane(ray_t ray, plane_t p, inout hit_t hit) {
    float denom = dot(p.direction, ray.direction);
    if (denom < 1e-6) return;

    vec3  P0 = vec3(p.distance);
    float t  = dot(P0 - ray.origin, p.direction) / denom;
    if (t < 0.0 || t > hit.t) return;

    hit.t           = t;
    hit.material_id = p.material;
    hit.origin      = ray.origin + ray.direction * t;
    hit.normal      = faceforward(p.direction, ray.direction, p.direction);
}

float checkboard_pattern(vec2 pos, float scale) {
    vec2 pattern = floor(pos * scale);
    return mod(pattern.x + pattern.y, 2.0);
}


// ------------------------------- Noise --------------------------------------
// Value noise by iq (analytic / texture-free variant).
float hash(float n) {
    return fract(sin(n) * 753.5453123);
}

float noise_iq(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n +   0.0), hash(n +   1.0), f.x),
                   mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
}

#define noise(x) noise_iq(x)


// -------------------------- Fractal Brownian Motion -------------------------
float fbm(vec3 pos, float lacunarity) {
    vec3 p = pos;
    float t;
    t  = 0.51749673 * noise(p); p *= lacunarity;
    t += 0.25584929 * noise(p); p *= lacunarity;
    t += 0.12527603 * noise(p); p *= lacunarity;
    t += 0.06255931 * noise(p);
    return t;
}

float get_noise(vec3 x) {
    return fbm(x, FBM_FREQ);
}


// ------------------------------- Sky ----------------------------------------
const vec3 sun_color = vec3(1.0, 0.7, 0.55);

vec3 render_sky_color(ray_t eye) {
    vec3  rd         = eye.direction;
    float sun_amount = max(dot(rd, SUN_DIR), 0.0);

    vec3 sky = mix(vec3(0.0, 0.1, 0.4), vec3(0.3, 0.6, 0.8), 1.0 - rd.y);
    sky += sun_color * min(pow(sun_amount, 1500.0) * 5.0, 1.0);  // sharp sun disk
    sky += sun_color * min(pow(sun_amount,   10.0) * 0.6, 1.0);  // soft glow
    return sky;
}


// ----------------------------- Cloud density --------------------------------
float density(vec3 pos, vec3 offset) {
    vec3  p    = pos * 0.0212242 + offset;
    float dens = get_noise(p);
    //dens = sampleNoise(p * 0.5).g;
    float cov = 1.0 - COVERAGE;
    dens *= smoothstep(cov, cov + 0.05, dens);   // carve out the gaps
    return clamp(dens, 0.0, 1.0);
}


// -------------------- Volumetric cloud raymarch -----------------------------
vec4 render_clouds(ray_t eye) {
    // The clouds live on the inside of a big sphere -> gives the curved horizon.
    sphere_t atmosphere = sphere_t(vec3(0.0, -0.0, 0.0), 500.0, 0);

    hit_t hit = make_no_hit();
    intersect_sphere(eye, atmosphere, hit);

    float march_step = THICKNESS / float(STEPS);
    // Step along the view ray, normalized so each step covers a constant height.
    vec3  dir_step   = eye.direction / eye.direction.y * march_step;
    vec3  pos        = hit.origin;

    float T     = 1.0;        // transmittance
    vec3  C     = vec3(0.0);  // accumulated colour
    float alpha = 0.0;

    for (int i = 0; i < STEPS; i++) {
        float h    = float(i) / float(STEPS);
        float dens = density(pos, WIND);

        float T_i = exp(-ABSORPTION * dens * march_step);
        T *= T_i;
        if (T < 0.01) break;

        // Fake light: brighter towards the top of the slab (exp(h)).
        C     += T * (exp(h) / 1.75) * dens * march_step;
        alpha += (1.0 - T_i) * (1.0 - alpha);

        pos += dir_step;
        if (length(pos) > 1e3) break;
    }

    return vec4(C, alpha);
}



