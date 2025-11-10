#pragma header

// edited and improved version of the adjustColor shader from Friday Night Funkin'

uniform float hue;
uniform float saturation;
uniform float brightness;
uniform float contrast;

// incase you want more control over hueshifting style

uniform float hue_mix_algorithm;     // 0 -> classic HSV, 0.5 -> FNF v0.5 axis, 1.0 -> FNF v0.6 luminance-preserving
uniform float hue_mix_sigma;         // gaussian width around legacy axis (default ~0.18)
uniform float hue_mix_dip_strength;  // dip strength near legacy peak (default ~0.25)

const vec3 grayscaleValues = vec3(0.3098039215686275, 0.607843137254902, 0.0823529411764706);

// ---------- hsv utils ----------
vec3 rgb2hsv(vec3 c) {
    float maxc = max(max(c.r, c.g), c.b);
    float minc = min(min(c.r, c.g), c.b);
    float delta = maxc - minc;

    float h = 0.0;
    if (delta > 1e-6) {
        if (maxc == c.r)      h = mod(((c.g - c.b) / delta), 6.0);
        else if (maxc == c.g) h = ((c.b - c.r) / delta) + 2.0;
        else                  h = ((c.r - c.g) / delta) + 4.0;
        h = h * 60.0;
        if (h < 0.0) h += 360.0;
    }

    float s = (maxc <= 0.0) ? 0.0 : (delta / maxc);
    float v = maxc;
    return vec3(h, s, v);
}

vec3 hsv2rgb(vec3 hsv) {
    float h = hsv.x;
    float s = hsv.y;
    float v = hsv.z;

    if (s <= 0.0) return vec3(v);

    float c = v * s;
    float hh = h / 60.0;
    float x = c * (1.0 - abs(mod(hh, 2.0) - 1.0));

    vec3 rgb1;
    if      (hh < 1.0) rgb1 = vec3(c, x, 0.0);
    else if (hh < 2.0) rgb1 = vec3(x, c, 0.0);
    else if (hh < 3.0) rgb1 = vec3(0.0, c, x);
    else if (hh < 4.0) rgb1 = vec3(0.0, x, c);
    else if (hh < 5.0) rgb1 = vec3(x, 0.0, c);
    else               rgb1 = vec3(c, 0.0, x);

    float m = v - c;
    return rgb1 + vec3(m);
}

vec3 applyHueRotateHSV(vec3 aColor, float aHueDeg){
    vec3 hsv = rgb2hsv(aColor);
    hsv.x = mod(hsv.x + aHueDeg, 360.0);
    if (hsv.x < 0.0) hsv.x += 360.0;
    return hsv2rgb(hsv);
}

// ---------- pitstop 2 hueshift ----------
vec3 luminancePreserveHueShift(vec3 color, float hueDeg) {
    float angle = radians(hueDeg);

    mat3 m1 = mat3(0.213, 0.213, 0.213,
                   0.715, 0.715, 0.715,
                   0.072, 0.072, 0.072);
    mat3 m2 = mat3(0.787, -0.213, -0.213,
                   -0.715,  0.285, -0.715,
                   -0.072, -0.072,  0.928);
    mat3 m3 = mat3(-0.213,  0.143, -0.787,
                   -0.715,  0.140,  0.715,
                    0.928, -0.283,  0.072);
    mat3 m = m1 + cos(angle) * m2 + sin(angle) * m3;

    return m * color;
}

// ---------- destination 2 hueshift ----------
vec3 applyHueAxis(vec3 aColor, float aHueDeg)
{
    float angle = radians(aHueDeg);
    // axis = normalize(vec3(1,1,1)) = (1,1,1)/sqrt(3)
    // 0.57735.. is 1/sqrt(3)
    vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float c = cos(angle);
    float s = sin(angle);
    return aColor * c + cross(k, aColor) * s + k * dot(k, aColor) * (1.0 - c);
}

// ---------- saturation / contrast ----------
vec3 applySaturation(vec3 aColor, float value){
    if (value > 0.0) { value = value * 3.0; }
    value = (1.0 + (value / 100.0));
    vec3 grayscale = vec3(dot(aColor, grayscaleValues));
    return clamp(mix(grayscale, aColor, value), 0.0, 1.0);
}

vec3 applyContrast(vec3 aColor, float value){
    value = (1.0 + (value / 100.0));
    if (value > 1.0){
        value = (((0.00852259 * exp(4.76454 * (value - 1.0))) * 1.01) - 0.0086078159) * 10.0;
        value += 1.0;
    }
    return clamp((aColor - 0.25) * value + 0.25, 0.0, 1.0);
}

// ---------- hue mixer ----------
// this blends three rotation methods, with a boost around the legacy axis method
vec3 mixHueRotations(vec3 color, float hueDeg, float styleVal) {
    vec3 hsvRot       = applyHueRotateHSV(color, hueDeg);            // algorithm ~ 0.0
    vec3 legacyAxis   = applyHueAxis(color, hueDeg);                 // algorithm ~ 0.5
    vec3 luminanceRot = luminancePreserveHueShift(color, hueDeg);    // algorithm ~ 1.0

    float t = clamp(styleVal, 0.0, 1.0);

    // If the host hasn't set the uniforms they will be 0; fall back to the original
    // default values so behaviour remains unchanged. Accept small values too.
    float SIGMA = (abs(hue_mix_sigma) < 1e-6) ? 0.18 : hue_mix_sigma;
    float DIP_STRENGTH = (abs(hue_mix_dip_strength) < 1e-6) ? 0.25 : hue_mix_dip_strength;

    float d = t - 0.5;
    float w05_raw = exp(- (d * d) / (2.0 * SIGMA * SIGMA)); // peak = 1 at t=0.5

    float w0_raw = 1.0 - t; // HSV end
    float w1_raw = t;       // v0.6 end

    float dip = DIP_STRENGTH * w05_raw;
    float w0 = max(0.0, w0_raw * (1.0 - dip));
    float w1 = max(0.0, w1_raw * (1.0 - dip));

    float sumW = w0 + w05_raw + w1 + 1e-6;
    w0      /= sumW;
    float w05 = w05_raw / sumW;
    w1      /= sumW;

    return hsvRot * w0 + legacyAxis * w05 + luminanceRot * w1;
}

// apply HSB+C pipeline: brightness -> hue mix -> contrast -> saturation
vec3 applyHSBCEffect(vec3 color) {

    color = color + (brightness / 255.0);
    vec3 hueMixed = mixHueRotations(color, hue, hue_mix_algorithm);
    hueMixed = applyContrast(hueMixed, contrast);
    hueMixed = applySaturation(hueMixed, saturation);

    return hueMixed;
}

void main(){
    vec4 textureColor = flixel_texture2D(bitmap, openfl_TextureCoordv);

    // Un-multiply alpha to avoid dark fringes on premultiplied textures
    float a = max(textureColor.a, 1e-5);
    vec3 unpremultipliedColor = textureColor.rgb / a;

    vec3 outColor = applyHSBCEffect(unpremultipliedColor);

    gl_FragColor = vec4(outColor * textureColor.a, textureColor.a);
}
