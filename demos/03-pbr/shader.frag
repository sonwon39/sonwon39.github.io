#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

struct BRDFContext
{
    float NoH;
    float NoL;
    float NoV;
    float VoH;
};

float map(vec3 p)
{
   
    vec3 center = vec3(0.0, 0.0, 1.0);
    float radius = 0.5;
    float s0_value = length(p - center) - radius;

    return s0_value;
}

vec3 calcNormal(vec3 p)
{
    vec2 del = vec2(0.001,0);

    return normalize(vec3(
        (map(p+del.xyy) - map(p-del.xyy)),
        (map(p+del.yxy) - map(p-del.yxy)),
        (map(p+del.yyx) - map(p-del.yyx)))
    );
}
// gl_FragCoord [0.5, 0.5] - [width- 0.5, height - 0.5]
// iResolution  [width, height]

float Pow2(float x)
{
    return x*x;
}
float Pow5(float x)
{
    float xSq = Pow2(x);
    return xSq* xSq * x;
}
float rcp(float x)
{
    return 1.0 / x;
}
vec3 fresnel(vec3 f0, vec3 f90, float cosine)
{
    return mix(f0, f90, Pow5(1.0-cosine));
}
float Vis_SmithJointApprox(float a, float NoV, float NoL )
{            
    float Vis_SmithV = NoL * ( NoV * ( 1.0 - a ) + a );
    float Vis_SmithL = NoV * ( NoL * ( 1.0 - a ) + a );
    return 0.5 * rcp( Vis_SmithV + Vis_SmithL );
}
float D_GGX(float a2, float NoH)
{
    float PI = 3.141592f;
	float NoH2 = NoH * NoH;
	float b = (NoH2* (a2-1.0)+1.0);
	return a2 / (PI * b*b);
}
vec3 specularBRDF(float roghness, BRDFContext c)
{
    vec3 dielectric = vec3(0.04);
    float a = Pow2(roghness);
    float a2 = Pow2(a);
    
    vec3 F = fresnel(dielectric, vec3(1.0), c.VoH);
    float Vis = Vis_SmithJointApprox(a, c.NoV, c.NoL);
    float D = D_GGX(a2, c.NoH);

    return (D * Vis) * F ;
}
vec3 EnvBRDFApprox(vec3 F0, float roughness, float NoV) {
    const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
    const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
    vec4 r = roughness * c0 + c1;
    float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
    vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw;
    return F0 * AB.x + AB.y;
}
vec3 skyColor(vec3 dir) {
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    return mix(vec3(0.35, 0.3, 0.25),     // 아래쪽(지면 반사광)
               vec3(0.5, 0.7, 0.95), h);  // 위쪽(하늘)
}

void main(){
    float ratio = iResolution.x / iResolution.y;
    
    // [-ratio, -1] [ratio , 1]
    vec2 uv = vec2(2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    
    vec3 lo = vec3(0.0, 5.0, 0.0);
    float lightR = 5.0;
    float init = 10.3f;
    vec3 lightPos = lo + lightR * vec3(cos(init),0,sin(init));
    //vec3 lightPos = lo + lightR * vec3(cos(init+ iTime),0,sin(init+ iTime));
    // ray 원점과 방향 벡터
    vec3 ro = vec3(0,0,-3.0);
    vec3 rd = normalize(vec3(uv,0) - ro);

    float t = 0.0;
    for(int i=0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001)
            break;
        t+=d;
        if(t>20.0) break;
    }
    vec3 color = vec3(0.6,0.8,0.9);
    if( t <= 20.0)
    {
        vec3 p = ro+ rd * t;
        vec3 N = calcNormal(p);
        vec3 L = normalize(lightPos - p);
        vec3 H = normalize(L+N);
        vec3 V = normalize(ro - p);
        vec3 R = normalize(dot(N,V)* 2.0 * N - V);
        float NoH = max(1e-5, dot(N, H));
        float NoL = max(1e-5, dot(N, L));
        float NoV = max(1e-5, dot(N, V));
        float VoH = max(1e-5, dot(V, H));

        BRDFContext c = BRDFContext(NoH, NoL, NoV, VoH);

        vec3 albedo = vec3(1.000, 0.766, 0.336);
        float metallic = 0.8;
        float roughness = 0.1;
        vec3 F0 = fresnel(vec3(0.04), albedo, 1.0-metallic);
        vec3 kd = (vec3(1.0) - F0) * (1.0-metallic);
        
        vec3 ambient = kd * albedo * skyColor(N)
             + EnvBRDFApprox(F0, roughness, NoV) * skyColor(R);

        vec3 diffuse = albedo * kd;
        vec3 specular = specularBRDF(roughness, c);

        color = (diffuse + specular) * NoL + ambient * 2.3;
    }
    
    outColor = vec4(color, 1.0);
}