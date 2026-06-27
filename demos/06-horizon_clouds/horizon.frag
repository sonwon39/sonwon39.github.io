#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

#include "common.glsl"

out vec4 outColor;

void main() {
    vec2  aspect_ratio = vec2(iResolution.x / iResolution.y, 1.0);
    float fov          = tan(radians(70.0));
    vec2  point_ndc    = gl_FragCoord.xy / iResolution.xy;
    vec3  point_cam    = vec3((2.0 * point_ndc - 1.0) * aspect_ratio * fov, -1.0);

    // Fixed camera looking towards the horizon (no rotation, no mouse).
    vec3 eye     = vec3(0.0, 1.0, 0.0);
    vec3 look_at = vec3(0.0, 1.6, -1.0);
    ray_t eye_ray = get_primary_ray(point_cam, eye, look_at);

    vec3 col;

    // A simple ground plane gives the horizon a reference line.
   // plane_t ground = plane_t(vec3(0.0, -1.0, 0.0), 0.0, 1);
    hit_t hit = make_no_hit();
    //intersect_plane(eye_ray, ground, hit);

    if (hit.material_id == 1) {
        float cb = checkboard_pattern(hit.origin.xz, 0.5);
        col = mix(vec3(0.6), vec3(0.75), cb);
    } else {
        vec3 sky = render_sky_color(eye_ray);
        vec4 cld = render_clouds(eye_ray);
        col = mix(sky, cld.rgb / (0.000001 + cld.a), cld.a);
    }

    outColor = vec4(col, 1.0);
}
