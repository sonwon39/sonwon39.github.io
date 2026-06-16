#version 300 es

// Truchet Noise

precision highp float;

uniform float iTime;
uniform vec2  iResolution;

out vec4 outColor;

float random(vec2 uv)
{
    return fract(sin(dot(uv.xy, vec2(12.3434, 54.343)))* 523215.535);
}
vec2 truchetPattern(in vec2 _st, in float _index){
    _index = fract(((_index-0.5)*2.0));
    if (_index > 0.75) {
        _st = vec2(1.0) - _st;
    } else if (_index > 0.5) {
        _st = vec2(1.0-_st.x,_st.y);
    } else if (_index > 0.25) {
        _st = 1.0-vec2(1.0-_st.x,_st.y);
    }
    return _st;
}
void main()
{
    vec2 gridSize = vec2(10.0, 10.0);
    vec2 grid = (gl_FragCoord.xy / iResolution.xy) * (gridSize);

    vec2 ipos = floor(grid);
    vec2 fpos = fract(grid);
    vec2 tile = truchetPattern(fpos, random(ipos));

    float c = smoothstep(tile.x-0.3,tile.x,tile.y)-
            smoothstep(tile.x,tile.x+0.3,tile.y);
    outColor = vec4(vec3(c), 1.0);
}