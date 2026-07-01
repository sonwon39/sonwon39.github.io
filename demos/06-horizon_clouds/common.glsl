#define SCENE_SCALE (10.)
#define INV_SCENE_SCALE (.1)

#define SUN_DIR normalize(vec3(0.,.8,.75))
#define SUN_COLOR (vec3(1.,.9,.85)*1.4)

#define CAMERA_RO (vec3(3980.,730.,-2650.)*INV_SCENE_SCALE)
#define CAMERA_FL 2.

#define HEIGHT_BASED_FOG_B 0.02
#define HEIGHT_BASED_FOG_C 0.05

mat3 rotateZ(float theta)
{
    vec3 x = vec3(cos(theta), sin(theta), 0.);
    vec3 y = vec3(-sin(theta), cos(theta), 0.);
    vec3 z = vec3(0.,0.,1.);
    return mat3(x,y,z);
}
mat3 rotateY(float theta)
{
    vec3 x = vec3(cos(theta), 0., sin(theta));
    vec3 y = vec3(0.,1.,0.);
    vec3 z = vec3(-sin(theta), 0., cos(theta));
    return mat3(x,y,z);
}

float hash(vec3 p3) {
    p3  = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
    p3  = fract(p3 * 1031.1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
	p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+19.19);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}
float wnoise( vec3 x, float tile ) {
    vec3 p = floor(x);
    vec3 f = fract(x);

    float res = 100.;
    for(int k=-1; k<=1; k++){
        for(int j=-1; j<=1; j++) {
            for(int i=-1; i<=1; i++) {
                vec3 offset = vec3(i, j, k);
                vec3 r =offset - f + hash13(mod(offset + p, vec3(tile)));
                res = min(res, dot(r, r));
            }
        }
    }
      return 1. - res;
}

float vnoise( in vec3 x, float freq ) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    vec3 u = f*f*(3.0-2.0*f);
	
    return mix(mix(mix( hash(mod(p+vec3(0,0,0),freq)), 
                        hash(mod(p+vec3(1,0,0),freq)),u.x),
                   mix( hash(mod(p+vec3(0,1,0),freq)), 
                        hash(mod(p+vec3(1,1,0),freq)),u.x),u.y),
               mix(mix( hash(mod(p+vec3(0,0,1),freq)), 
                        hash(mod(p+vec3(1,0,1),freq)),u.x),
                   mix( hash(mod(p+vec3(0,1,1),freq)), 
                        hash(mod(p+vec3(1,1,1),freq)),u.x),u.y),
                        u.z);
}
vec3 gradientDir( vec3 ip, float tile ) {
    if( tile > 0. ) ip = mod( ip, vec3(tile) );
    return normalize( hash33(ip) - 0.5 );
}
float gnoise( vec3 x, float freq ) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    vec3 u = f*f*(3.0-2.0*f);   // 5차 대신 3차 보간 (기존 노이즈들과 톤 맞춤)

    return mix(
        mix( mix( dot( gradientDir(i+vec3(0,0,0),freq), f-vec3(0,0,0) ),
                  dot( gradientDir(i+vec3(1,0,0),freq), f-vec3(1,0,0) ), u.x),
             mix( dot( gradientDir(i+vec3(0,1,0),freq), f-vec3(0,1,0) ),
                  dot( gradientDir(i+vec3(1,1,0),freq), f-vec3(1,1,0) ), u.x), u.y),
        mix( mix( dot( gradientDir(i+vec3(0,0,1),freq), f-vec3(0,0,1) ),
                  dot( gradientDir(i+vec3(1,0,1),freq), f-vec3(1,0,1) ), u.x),
             mix( dot( gradientDir(i+vec3(0,1,1),freq), f-vec3(0,1,1) ),
                  dot( gradientDir(i+vec3(1,1,1),freq), f-vec3(1,1,1) ), u.x), u.y), u.z);
}

float wFbm(vec3 p, float freq, const int octaves) {
  float amp = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  for (int i = 0; i < octaves; i++) {
    sum += amp * wnoise(p* freq, freq);
    norm += amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum / norm;
}

float fbm(vec3 p, float freq, const int octaves) {
  float amp = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  for (int i = 0; i < octaves; i++) {
    sum += amp * vnoise(p* freq, freq);
    norm += amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum / norm;
}

mat3 getCamera( in float time, inout vec3 ro) {
    ro = CAMERA_RO;
    vec3 cz = normalize(vec3(0.,.4,1.));
    mat3 M = rotateY(time);
    //cz = normalize(M * cz);
    vec3 up = vec3(0.,1.,0.);
    vec3 cx = normalize(cross(up, cz));
    vec3 cy = normalize(cross(cz, cx));
    return mat3(cx, cy, cz);
}

void getRay( in float time, in vec2 fragCoord, in vec2 resolution, inout vec3 ro, inout vec3 rd) {
	mat3 cam = getCamera(time, ro);
    vec2 p = (-resolution.xy + 2.0*(fragCoord))/resolution.y;
    rd = cam * normalize(vec3(p,CAMERA_FL));     
}
vec3 getSunDir(float time){
    return rotateZ(time) * SUN_DIR;
}

vec3 getSkyColor(vec3 rd, float time){
    vec3 L = getSunDir(time);
    float sundot = clamp(dot(L, rd), 0., 1.);

    float y= max(rd.y, 0.);
	vec3 col = clamp(vec3(0.2,0.5,0.85)- y*y*0.5, 0., 1.);
    col = mix( col, 0.85*vec3(0.7,0.75,0.85), pow(1.0-y, 6.0) );

    col += 0.25 * vec3(1.0,0.7,0.4) * pow( sundot, 5.0 );
    col += 0.25 * vec3(1.0,0.8,0.6) * pow( sundot, 64.0 );
    col += 0.2  * vec3(1.0,0.8,0.6) * pow( sundot, 512.0 );
    col += 0.2  * vec3(1.0,0.8,0.6) * pow( sundot, 8.0 );
    
    col += clamp((0.1-rd.y)*10., 0., 1.) * vec3(.0,.1,.2);
    return col;
}

float remap( float v, float oldLo, float oldHi, float newLo, float newHi ) {
    return newLo + (v - oldLo) * (newHi - newLo) / (oldHi - oldLo);
}
#define PERLIN_FBM_GAIN 1.5
float gFbm( vec3 p, float freq, const int octaves ) {
    float f = 1.;
    float a = 1.;
    float c = 0.;
    float w = 0.;

    if( freq > 0. ) f = freq;

    for( int i=0; i<octaves; i++ ) {
        c += a*gnoise( p * f, f );
        f *= 2.0;
        w += a;
        a *= 0.5;
    }

    return clamp( 0.5 + PERLIN_FBM_GAIN * (c / w), 0., 1. );
}

float perlinWorley( vec3 p, const int perlinOct, const int worleyOct, float tile ) {
    float perlin = gFbm( p, tile, perlinOct );
    float worley = wFbm( p,tile * 2., worleyOct );   // 이미 [0,1], 1-거리² 형태
    return clamp( remap( perlin, worley - 1.0, 1.0, 0.0, 1.0 ), 0., 1. );
}
