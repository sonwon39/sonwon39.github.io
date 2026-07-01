#version 300 es

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

#include "common.glsl"

uniform highp sampler2D iChannel0;
uniform highp sampler3D iChannel1;   // passB는 2D에 패킹된 3D(34-padding) → sampler2D로 읽어야 함

out vec4 fragColor;
#define CLOUD_MARCH_STEPS 30
#define CLOUD_SELF_SHADOW_STEPS 6

#define EARTH_RADIUS    (6371000.) // (6371000.)
#define CLOUDS_BOTTOM   (3200.)
#define CLOUDS_TOP      (5400.)

#define CLOUDS_FORWARD_SCATTERING_G (.8)
#define CLOUDS_BACKWARD_SCATTERING_G (-.2)
#define CLOUDS_SCATTERING_LERP (.5)

#define CLOUDS_COVERAGE (.4)
#define CLOUDS_BASE_EDGE_SOFTNESS (.12)
#define CLOUDS_BOTTOM_SOFTNESS (.25)
#define CLOUDS_DENSITY (.06)
#define CLOUDS_DETAIL_STRENGTH (.2)

#define CLOUDS_BASE_SCALE 1.0
#define CLOUDS_DETAIL_SCALE 12.

#define CLOUDS_AMBIENT_COLOR_TOP (vec3(149., 167., 200.)*(1.5/255.))
#define CLOUDS_AMBIENT_COLOR_BOTTOM (vec3(39., 67., 87.)*(1.5/255.))

float HG( float LoV, float g) {
	float gg = g * g;
	return (1. - gg) / pow( 1. + gg - 2. * g * LoV, 1.5);
}

float interectSphere( vec3 rd, float r ) {
   float t1 = rd.y * EARTH_RADIUS;
   vec3 x = -rd * t1 + vec3(0., EARTH_RADIUS, 0.);
   float r1 = (EARTH_RADIUS + r);
   float t2 = sqrt( dot(r1,r1) - dot(x,x) );

   return (t2 - t1);
}

float linearstep( const float s, const float e, float v ) {
    return clamp( (v-s)*(1./(e-s)), 0., 1. );
}

float linearstep0( const float e, float v ) {
    return min( v*(1./e), 1. );
}
float cloudGradient( float norY ) {
    return linearstep( 0., .05, norY ) - linearstep( .8, 1.2, norY);
}
float remap(float v, float s, float e) {
	return (v - s) / (e - s);
}

float cloudMapBase(vec3 p, float norY) {
	vec3 uv = p * (0.00005 * CLOUDS_BASE_SCALE);
    vec3 cloud = texture(iChannel0, uv.xz).rgb;
   
    float n = norY*norY;
    n *= cloud.b ;
        n+= pow(1.-norY, 16.); 
	return remap( cloud.r - n, cloud.g, 1.);
}
float cloudMapDetail(vec3 p) {
    p = abs(p) * (0.0016 * CLOUDS_BASE_SCALE * CLOUDS_DETAIL_SCALE);
    return texture(iChannel1, p / 32.).r;
}


float cloudMap(vec3 pos, vec3 rd, float norY) {
    vec3 ps = pos;
    
    float m = cloudMapBase(ps, norY);
	m *= cloudGradient( norY );
    float h = norY;
    float stratus = smoothstep(0.0,0.07,h) * smoothstep(0.35,0.18,h);   
    float cumulus = smoothstep(0.0,0.18,h) * smoothstep(0.95,0.55,h);   
    float cumulonimb = smoothstep(0.0,0.10,h) * smoothstep(1.0,0.85,h); 
    //m*=cumulonimb;
	float dstrength = smoothstep(1., 0.5, m);
    
    // erode with detail
    if(dstrength > 0.) {
		m -= cloudMapDetail( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
    }

	m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_COVERAGE-1.) );
    m *= linearstep0(CLOUDS_BOTTOM_SOFTNESS, norY);
    return clamp(m * CLOUDS_DENSITY, 0., 1.);
    //return clamp(m * CLOUDS_DENSITY * (1.+max((ps.x-7000.)*0.005,0.)), 0., 1.);
}

float volumetricShadow(vec3 ro, vec3 L){
    float step = 10.;
    float t = step * 0.5;
    float shadow = 1.;
    for(int i = 0; i<CLOUD_SELF_SHADOW_STEPS; ++i )  {
        vec3 pos = ro + L * t;
    
        float norY = (length(pos) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM));
        if(norY > 1.) return shadow;

        float alpha = cloudMap(pos, L, norY);
        shadow *= exp(-alpha * step);
        step *= 1.3;
        t += step;

    }
    return shadow;
}
vec4 renderClouds( vec3 ro, vec3 rd, inout float dist , float time) {
    if( rd.y < 0. ) {
        return vec4(0.,0.,0.,2.);
    }
    ro.xz *= SCENE_SCALE;
    ro.y = sqrt(EARTH_RADIUS*EARTH_RADIUS-dot(ro.xz,ro.xz));
    
    float start = interectSphere(rd, CLOUDS_BOTTOM);
    float end  =  interectSphere(rd, CLOUDS_TOP);
    if (start > dist) return vec4(0.,0.,0.,2.);
    end = min(end, dist);

    float dx = (end - start) / float(CLOUD_MARCH_STEPS);
    float t = start;
    float T = 1.;
    vec3 L = getSunDir(time);
    float LoV = dot(-L, rd);


    t-= hash13(rd) * dx;
    float scattering =  mix( HG(LoV, CLOUDS_FORWARD_SCATTERING_G),
         HG(LoV, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

    vec3 scatteredLight = vec3(0.0);
    dist = EARTH_RADIUS;

    for(int i = 0; i< CLOUD_MARCH_STEPS; ++i){
        vec3 p = ro + rd * t;
        float norY = (length(p) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM));

       
        vec2 uv =  p.xz * 0.0005;
        float m = cloudMap(p, rd ,norY);
        float alpha = m;
        if(alpha > 0.)   {
           dist = min(dist, t);


            vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );
            vec3 S = (ambientLight +  SUN_COLOR * scattering * volumetricShadow(p, L)) * alpha;
            
            float a = 1. - exp(-alpha * dx);
            scatteredLight += T *(S / alpha) * a;
            T *= (1. - a);
        }     
        if(T < 0.1) break;
        t+=dx;
    }
    return vec4(scatteredLight, T);
}

void main(){
    vec2 fragCoord  = gl_FragCoord.xy;
    float dist = 10000.;
    vec3 ro, rd;
    float time = iTime;
    //time = 0.;

    getRay( time, fragCoord, iResolution.xy, ro, rd);

    vec3 sky = getSkyColor(rd, time);

    vec4 clouds = vec4(0.0, 0.0, 0.0, 1.0);
    if( rd.y > 0. ) {
        clouds = renderClouds(ro, rd, dist, time);
        if( clouds.a > 1.0 ) clouds = vec4(0.0, 0.0, 0.0, 1.0); 
        float fogAmount = 1.-(.1 + exp(-dist*0.0001));
        clouds.rgb = mix(clouds.rgb, sky*(1.-clouds.a), fogAmount);

    }
   
    vec3 col = sky * clouds.a  + clouds.rgb;
    col.rgb = mix( col.rgb, pow(col.rgb, vec3(1./2.2)), 0.85); 
    col.rgb = mix( col.rgb, col.bbb, 0.2 ); 
    fragColor = vec4( col.rgb, 1. );

}
