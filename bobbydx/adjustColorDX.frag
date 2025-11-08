#pragma header

// this shader is a slighly edited recreation of the Animate/Flash "Adjust Color" filter,
// which was kindly provided and written by Rozebud https://github.com/ThatRozebudDude ( thank u rozebud :) )
// Adapted from Andrey-Postelzhuks shader found here: https://forum.unity.com/threads/hue-saturation-brightness-contrast-shader.260649/
// Hue rotation stuff is from here: https://www.w3.org/TR/filter-effects/#feColorMatrixElement

uniform float hue;
uniform float saturation;
uniform float brightness;
uniform float contrast;

uniform float style;
// the style parameter controls the mix of hueshifting algorithms
// 0 -> regular HSV, 1.0 -> fnf current adjustColor

const vec3 grayscaleValues = vec3(0.3098039215686275, 0.607843137254902, 0.0823529411764706);

// Traditional RGB -> HSV -> rotate hue -> HSV -> RGB approach gives a more classic hue shift
vec3 rgb2hsv(vec3 c) {
	float maxc = max(max(c.r, c.g), c.b);
	float minc = min(min(c.r, c.g), c.b);
	float delta = maxc - minc;

	float h = 0.0;
	if (delta > 1e-6) {
		if (maxc == c.r) {
			h = mod(((c.g - c.b) / delta), 6.0);
		} else if (maxc == c.g) {
			h = ((c.b - c.r) / delta) + 2.0;
		} else {
			h = ((c.r - c.g) / delta) + 4.0;
		}
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
	if (hh < 1.0) rgb1 = vec3(c, x, 0.0);
	else if (hh < 2.0) rgb1 = vec3(x, c, 0.0);
	else if (hh < 3.0) rgb1 = vec3(0.0, c, x);
	else if (hh < 4.0) rgb1 = vec3(0.0, x, c);
	else if (hh < 5.0) rgb1 = vec3(x, 0.0, c);
	else rgb1 = vec3(c, 0.0, x);

	float m = v - c;
	return rgb1 + vec3(m);
}

vec3 applyHueRotate(vec3 aColor, float aHue){
	// aHue expected in degrees; convert and wrap using HSV space for a classic hue shift
	vec3 hsv = rgb2hsv(aColor);
	hsv.x = mod(hsv.x + aHue, 360.0);
	if (hsv.x < 0.0) hsv.x += 360.0;
	return hsv2rgb(hsv);
}

vec3 luminancePreserveHueShift(vec3 color, float hue) {
	float angle = radians(hue);

	mat3 m1 = mat3(0.213, 0.213, 0.213,
				   0.715, 0.715, 0.715,
				   0.072, 0.072, 0.072);
	mat3 m2 = mat3(0.787, -0.213, -0.213,
				  -0.715, 0.285, -0.715,
				  -0.072, -0.072, 0.928);
	mat3 m3 = mat3(-0.213, 0.143, -0.787,
				   -0.715, 0.140, 0.715,
				   0.928, -0.283, 0.072);
	mat3 m = m1 + cos(angle) * m2 + sin(angle) * m3;

	return m * color;
}

vec3 applySaturation(vec3 aColor, float value){
	if(value > 0.0){ value = value * 3.0; }
	value = (1.0 + (value / 100.0));
	vec3 grayscale = vec3(dot(aColor, grayscaleValues));
    return clamp(mix(grayscale, aColor, value), 0.0, 1.0);
}

vec3 applyContrast(vec3 aColor, float value){
	value = (1.0 + (value / 100.0));
		if(value > 1.0){
			// Use exp() instead of pow(e, ...) for clarity and likely better precision/perf
			value = (((0.00852259 * exp(4.76454 * (value - 1.0))) * 1.01) - 0.0086078159) * 10.0; //Just roll with it...
			value += 1.0;
		}
  return clamp((aColor - 0.25) * value + 0.25, 0.0, 1.0);
}

vec3 applyHSBCEffect(vec3 color) {
	// Brightness
	color = color + ((brightness) / 255.0);

	// Hue
	vec3 hsvRotated = applyHueRotate(color, hue);
	vec3 luminanceRotated = luminancePreserveHueShift(color, hue);
	color = mix(hsvRotated, luminanceRotated, clamp(style, 0.0, 1.0));

	// Contrast
	color = applyContrast(color, contrast);

	// Saturation
	color = applySaturation(color, saturation);

	return color;
}

void main(){

	vec4 textureColor = flixel_texture2D(bitmap, openfl_TextureCoordv);

	// Un-multiply alpha if the texture is premultiplied
	// Lime premultiplies alphas before sending it to render, so we want to accomodate header. This fixes some antialiased edges appearing darker
	// Use a small epsilon to avoid huge values when alpha is tiny
	float a = max(textureColor.a, 1e-5);
	vec3 unpremultipliedColor = textureColor.rgb / a;

	// Apply effects to the unpremultiplied color
	vec3 outColor = applyHSBCEffect(unpremultipliedColor);

	gl_FragColor = vec4(outColor * textureColor.a, textureColor.a);
}