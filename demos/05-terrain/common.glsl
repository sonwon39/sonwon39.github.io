#define SUN_DIR normalize(vec3(0.,22.,22.))
#define PI 3.141592
#define RAY_STEP 0.42

#define TERRAIN_BASE -0.35
#define AMP 1.7

mat3 rotateZ(float theta)
{
    vec3 x = vec3(cos(theta), sin(theta), 0.);
    vec3 y = vec3(-sin(theta), cos(theta), 0.);
    vec3 z = vec3(0.,0.,1.);
    return mat3(x,y,z);
}

float hash(vec2 p){ 
  p=fract(p*0.3183099+0.1); 
  p*=17.0;
  return fract(p.x*p.y*(p.x+p.y)); 
}

vec3 getSkyColor(vec3 rd, float time){
    vec3 L = rotateZ(time) * SUN_DIR;
    float sundot = clamp(dot(L, rd), 0., 1.);

    float y= max(rd.y, 0.);
	vec3 col = vec3(0.2,0.5,0.85)- y*y*0.5;
    col = mix( col, 0.85*vec3(0.7,0.75,0.85), pow(1.0-y, 6.0) );

    col += 0.25 * vec3(1.0,0.7,0.4) * pow( sundot, 5.0 );
    col += 0.25 * vec3(1.0,0.8,0.6) * pow( sundot, 64.0 );
    col += 0.2  * vec3(1.0,0.8,0.6) * pow( sundot, 512.0 );
    col += 0.2  * vec3(1.0,0.8,0.6) * pow( sundot, 8.0 );
    
    col += clamp((0.1-rd.y)*10., 0., 1.) * vec3(.0,.1,.2);
    return col;
}

mat3 getCamera(in vec3 cz)
{
    vec3 up = vec3(0.,1.,0.);
    vec3 cx = normalize(cross(up, cz));
    vec3 cy = normalize(cross(cz, cx));

    return mat3(cx, cy, cz);
}

void getRay(in vec2 fragCoord, in vec2 resolution, inout vec3 ro, inout vec3 rd)
{
    float ratio = resolution.x/ resolution.y;
    vec2 uv = (fragCoord.xy * 2. - resolution) / resolution.y;
    
    ro = vec3(0., 2., -3.2);
    vec3 cw = normalize(vec3(0., 0.4, 2.0) - ro);
    
    mat3 camera = getCamera(cw);
    float cameraZ = ratio ;
    rd = camera * normalize(vec3(uv, cameraZ));
}

// x : bilinear , yz : noise gradient
vec3 noised(vec2 x){
    vec2 p=floor(x);
    vec2 f=fract(x);
    vec2 u = f*f*(3.-2.*f);
    vec2 du = 6.*f*(1.-f);

    float a = hash(p);
    float b = hash(p + vec2(1.,0.));
    float c = hash(p + vec2(0.,1.));
    float d = hash(p + vec2(1.,1.));

    return vec3( (a + (b-a)* u.x) +  (c-a) * u.y + (d-c-b+a) *u.x*u.y,
       du * (vec2(b-a, c-a) + (d-c-b+a) * u.yx));   
}

float fbm(vec2 p, int octaves)
{
    float amp = 0.5;
    float sum = 0.;
    const mat2 M = mat2(1.6,-1.2, 
                        1.2,1.6);
    vec2 dn = vec2(0.);
    for(int i = 0; i< octaves; ++i){
        vec3 noise = noised(p);
        dn += noise.yz;
        sum += amp * noise.x / (1. + dot(dn, dn));
        amp *= 0.5;
        p = M*p;
    }
    return sum;
}

float terrainH(vec2 q){
  vec2 p = q*0.55;       

  return fbm(p, 9)*AMP + TERRAIN_BASE;   
}

vec3 calcNormal(vec2 p, float t)
{
    vec2 del = vec2(0.0025 * t, 0.);
    float dx = terrainH(p + del.xy) - terrainH(p - del.xy);
    float dz = terrainH(p + del.yx) - terrainH(p - del.yx);

    return normalize(vec3(-dx, 2. * del.x, -dz));
}

float shadow(vec3 ro, vec3 rd)
{
    float t = 0.1;
    float res=1.0;
    for(int i = 0; i < 10; i++)
    {
        vec3 p = ro + rd * t;
        float h = p.y - terrainH(p.xz);
        res = min(res, 10. * h / t);
        if(h < 0.01) {
            break;
        }
        t += h * RAY_STEP;
    }
    return clamp(res, 0., 1.);
    
}
vec3 raymarch(vec3 ro, vec3 rd, float time)
{
    vec3 p;
    vec3 col = vec3(0.);
    bool hit = false;
    float t = 0.1;
    float tmax = 22.0;
    for(int i = 1; i < 200; ++i)
    {
        p = ro + rd * t;
        float h = p.y - terrainH(p.xz);
        if(h < 0.0015 * t) {
            hit = true;
            break;
        }
        t += RAY_STEP * h;
        if(t > tmax) break;
        
    }
    vec3 sky = getSkyColor(rd, time);
    if(!hit)
        return sky;

    p=ro+rd*t;
    vec3 L = rotateZ(time) * SUN_DIR;
    vec3 N = calcNormal(p.xz, t);
    float dif = max(dot(N, L), 0.0);
    dif *= shadow(p+N*0.02, L);

    vec3 albedo = vec3(0.62);
    vec3 lin = vec3(1.05,.95,.8)*dif*1.3          
             + vec3(0.5,.7,1.)*0.35;             
    col = vec3(dif);

    col = mix(col, sky, smoothstep(8., tmax, t));
    return col;

}