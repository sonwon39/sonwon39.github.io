#version 300 es

precision highp float;

uniform float iTime;
uniform vec2 iResolution;

out vec4 outColor;

void main(){
    float ratio = iResolution.x / iResolution.y;
    // [-ratio, -1] [ratio , 1]
    vec2 uv = vec2(2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    
    float y = sin(uv.x);
    if(abs(uv.y - y)< 0.01)
    {
        outColor = vec4(0,0,0,1);
    }
    else
        outColor = vec4(1.0,0.0,1.0, 1.0);
}