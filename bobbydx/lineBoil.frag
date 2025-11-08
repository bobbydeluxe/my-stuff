#pragma header

uniform float iTime;
uniform float fps;   // frame rate of boil [default: 3]
uniform float amp;   // jitter amplitude [default: 0.01]
uniform float freq;  // noise frequency [default: 5]

#define iChannel0 bitmap
#define texture flixel_texture2D

float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float valueNoise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i + vec3(0,0,0));
    float n100 = hash31(i + vec3(1,0,0));
    float n010 = hash31(i + vec3(0,1,0));
    float n110 = hash31(i + vec3(1,1,0));
    float n001 = hash31(i + vec3(0,0,1));
    float n101 = hash31(i + vec3(1,0,1));
    float n011 = hash31(i + vec3(0,1,1));
    float n111 = hash31(i + vec3(1,1,1));

    float nx00 = mix(n000, n100, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx11 = mix(n011, n111, u.x);
    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);
    return mix(nxy0, nxy1, u.z);
}

void main()
{
    vec2 uv = openfl_TextureCoordv;

    // quantize time to fps
    float frame = floor(iTime * fps);

    // noise offsets
    float n1 = valueNoise3(vec3(uv * freq, frame));
    float n2 = valueNoise3(vec3(uv * freq + 13.37, frame + 7.0));
    vec2 jitter = amp * (vec2(n1, n2) - 0.5);

    // sample with jitter
    vec4 texColor = flixel_texture2D(bitmap, uv + jitter);

    gl_FragColor = texColor * openfl_Alphav;
}
