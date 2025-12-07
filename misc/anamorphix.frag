// https://www.shadertoy.com/view/3tfcD8

#pragma header

float NoiseSeed;
uniform vec3 flareTint;
// flareParams: x = mix, y = threshold, z = intensity, w = stretch
uniform vec4 flareParams;
uniform float flareBrightness;
// other customization
uniform float chromaAmount;
uniform float grainAmount;
uniform float glowStrength;
uniform float glowBase;
uniform float contrastAmount;
uniform float marginSize;
// contrast curve modifiers as vec3: x=Red, y=Green, z=Blue
uniform vec3 contrastCurve;
// contrast correction factors as vec3: x=Red, y=Green, z=Blue
uniform vec3 contrastCorrection;
uniform float toneMapMix;
float randomFloat(){
	NoiseSeed = sin(NoiseSeed) * 84522.13219145687;
	return fract(NoiseSeed);
}

uniform vec3 gradeColor;

float SCurve (float value, float amount, float correction) {
	float curve = 1.0;

	if (value < 0.5) {
		curve = pow(value, amount) * pow(2.0, amount) * 0.5; 
	}
	else { 	
		curve = 1.0 - pow(1.0 - value, amount) * pow(2.0, amount) * 0.5; 
	}

	return pow(curve, correction);
}

//ACES tonemapping from: https://www.shadertoy.com/view/wl2SDt
vec3 ACESFilm(vec3 x) {
	float a = 2.51;
	float b = 0.03;
	float c = 2.43;
	float d = 0.59;
	float e = 0.14;
	return (x*(a*x+b))/(x*(c*x+d)+e);
}

//Chromatic Abberation from: https://www.shadertoy.com/view/XlKczz
vec3 chromaticAbberation(sampler2D tex, vec2 uv, float amount) {
	float aberrationAmount = amount/10.0;
   	vec2 distFromCenter = uv - 0.5;

	// stronger aberration near the edges by raising to power 3
	vec2 aberrated = aberrationAmount * pow(distFromCenter, vec2(3.0, 3.0));
	
	vec3 color = vec3(0.0);
	
	for (int i = 1; i <= 8; i++) {
		float weight = 1.0 / pow(2.0, float(i));
		color.r += flixel_texture2D(tex, uv - float(i) * aberrated).r * weight;
		color.b += flixel_texture2D(tex, uv + float(i) * aberrated).b * weight;
	}
	
	color.g = flixel_texture2D(tex, uv).g * 0.9961; // 0.9961 = weight(1)+weight(2)+...+weight(8);
	
	return color;
}

//film grain from: https://www.shadertoy.com/view/wl2SDt
vec3 filmGrain() {
	return vec3(0.9 + randomFloat()*0.15);
}

//Sigmoid Contrast from: https://www.shadertoy.com/view/MlXGRf
vec3 contrast(vec3 color, float rAmount, float gAmount, float bAmount, float rCorrection, float gCorrection, float bCorrection)
{
	return vec3(SCurve(color.r, rAmount, rCorrection), 
				SCurve(color.g, gAmount, gCorrection), 
				SCurve(color.b, bAmount, bCorrection)
			   );
}

//anamorphic-ish flares from: https://www.shadertoy.com/view/MlsfRl
vec3 flares(sampler2D tex, vec2 uv, float threshold, float intensity, float stretch, float brightness) {
	threshold = 1.0 - threshold;
	
	vec3 hdr = flixel_texture2D(tex, uv).rgb;
	hdr = vec3(floor(threshold+pow(hdr.r, 1.0)));
	
	float d = intensity; //200.;
	float c = intensity*stretch; //100.;
	
	
	//horizontal
	for (float i=c; i>-1.0; i--)
	{
		float texL = flixel_texture2D(tex, uv+vec2(i/d, 0.0)).r;
		float texR = flixel_texture2D(tex, uv-vec2(i/d, 0.0)).r;
		hdr += floor(threshold+pow(max(texL,texR), 4.0))*(1.0-i/c);
	}
	
	//vertical
	for (float i=c/2.0; i>-1.0; i--)
	{
		float texU = flixel_texture2D(tex, uv+vec2(0.0, i/d)).r;
		float texD = flixel_texture2D(tex, uv-vec2(0.0, i/d)).r;
		hdr += floor(threshold+pow(max(texU,texD), 40.0))*(1.0-i/c) * 0.25;
	}
	
	hdr *= vec3(1.0,1.0,1.0); //tint
	vec3 baseTint = vec3(1.0,1.0,1.0);
	vec3 effectiveTint = baseTint * flareTint;
	if (all(equal(flareTint, vec3(0.0)))) {
		effectiveTint = baseTint;
	}
	hdr *= effectiveTint;
	return hdr*brightness;
}

//glow from: https://www.shadertoy.com/view/XslGDr (unused but useful)
vec3 samplef(vec2 tc, vec3 color)
{
	return pow(color, vec3(2.2, 2.2, 2.2));
}

vec3 highlights(vec3 pixel, float thres)
{
	float val = (pixel.x + pixel.y + pixel.z) / 3.0;
	return pixel * smoothstep(thres - 0.1, thres + 0.1, val);
}

vec3 hsample(vec3 color, vec2 tc)
{
	return highlights(samplef(tc, color), 0.6);
}

vec3 blur(vec3 col, vec2 tc, float offs)
{
	vec4 xoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0) / openfl_TextureSize.x;
	vec4 yoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0) / openfl_TextureSize.y;
	
	vec3 color = vec3(0.0, 0.0, 0.0);
	color += hsample(col, tc + vec2(xoffs.x, yoffs.x)) * 0.00366;
	color += hsample(col, tc + vec2(xoffs.y, yoffs.x)) * 0.01465;
	color += hsample(col, tc + vec2(	0.0, yoffs.x)) * 0.02564;
	color += hsample(col, tc + vec2(xoffs.z, yoffs.x)) * 0.01465;
	color += hsample(col, tc + vec2(xoffs.w, yoffs.x)) * 0.00366;
	
	color += hsample(col, tc + vec2(xoffs.x, yoffs.y)) * 0.01465;
	color += hsample(col, tc + vec2(xoffs.y, yoffs.y)) * 0.05861;
	color += hsample(col, tc + vec2(	0.0, yoffs.y)) * 0.09524;
	color += hsample(col, tc + vec2(xoffs.z, yoffs.y)) * 0.05861;
	color += hsample(col, tc + vec2(xoffs.w, yoffs.y)) * 0.01465;
	
	color += hsample(col, tc + vec2(xoffs.x, 0.0)) * 0.02564;
	color += hsample(col, tc + vec2(xoffs.y, 0.0)) * 0.09524;
	color += hsample(col, tc + vec2(	0.0, 0.0)) * 0.15018;
	color += hsample(col, tc + vec2(xoffs.z, 0.0)) * 0.09524;
	color += hsample(col, tc + vec2(xoffs.w, 0.0)) * 0.02564;
	
	color += hsample(col, tc + vec2(xoffs.x, yoffs.z)) * 0.01465;
	color += hsample(col, tc + vec2(xoffs.y, yoffs.z)) * 0.05861;
	color += hsample(col, tc + vec2(	0.0, yoffs.z)) * 0.09524;
	color += hsample(col, tc + vec2(xoffs.z, yoffs.z)) * 0.05861;
	color += hsample(col, tc + vec2(xoffs.w, yoffs.z)) * 0.01465;
	
	color += hsample(col, tc + vec2(xoffs.x, yoffs.w)) * 0.00366;
	color += hsample(col, tc + vec2(xoffs.y, yoffs.w)) * 0.01465;
	color += hsample(col, tc + vec2(	0.0, yoffs.w)) * 0.02564;
	color += hsample(col, tc + vec2(xoffs.z, yoffs.w)) * 0.01465;
	color += hsample(col, tc + vec2(xoffs.w, yoffs.w)) * 0.00366;

	return color;
}

vec3 glow(vec3 col, vec2 uv)
{
	vec3 color = blur(col, uv, 2.0);
	color += blur(col, uv, 3.0);
	color += blur(col, uv, 5.0);
	color += blur(col, uv, 7.0);
	color /= 4.0;
	
	color += samplef(uv, col);
	
	return color;
}

//margins from: https://www.shadertoy.com/view/wl2SDt
vec3 margins(vec3 color, vec2 uv, float marginSize) {
	if(uv.y < marginSize || uv.y > 1.0-marginSize) {
		return vec3(0.0);
	}
	else {
		return color;
	}
}

void main() {
	vec2 uv = openfl_TextureCoordv.xy;
	vec3 color = flixel_texture2D(bitmap, uv).xyz;
	
	
		// chromatic aberration (default 0.0 = disabled)
		float safeChroma = chromaAmount;
		if (safeChroma < 0.0) safeChroma = 0.0;
		if (safeChroma > 0.0) color = chromaticAbberation(bitmap, uv, safeChroma);

		// film grain (default 0.0 = no grain)
		float safeGrain = grainAmount;
		if (safeGrain < 0.0) safeGrain = 0.0;
		if (safeGrain > 0.0) {
			vec3 grainSample = filmGrain();
			color *= mix(vec3(1.0), grainSample, safeGrain);
		}

		// ACES Tonemapping with controllable mix (default 0.0 = no tonemap)
		float safeToneMix = toneMapMix;
		if (safeToneMix < 0.0) safeToneMix = 0.0;
		if (safeToneMix > 0.0) {
			vec3 preTone = color;
			vec3 aces = ACESFilm(preTone);
			color = mix(preTone, aces, safeToneMix);
		}

		// Apply color grading tint (default [1,1,1] = no grade)
		vec3 effectiveGrade = gradeColor;
		if (all(equal(gradeColor, vec3(0.0)))) {
			effectiveGrade = vec3(1.0);
		}
		if (!all(equal(effectiveGrade, vec3(1.0)))) {
			vec3 neutralTone = ACESFilm(vec3(1.0));
			vec3 safeNeutral = max(neutralTone, vec3(1e-6));
			vec3 gradeOffsetToneMap = effectiveGrade / safeNeutral;
			vec3 gradeOffsetNoTone = effectiveGrade;
			vec3 gradeOffset = mix(gradeOffsetNoTone, gradeOffsetToneMap, safeToneMix);
			color *= gradeOffset;
		}
		
		// glow
		float safeGlowStrength = glowStrength;
		if (safeGlowStrength < 0.0) safeGlowStrength = 0.0;
		if (safeGlowStrength > 0.0) {
			float safeGlowBase = glowBase;
			if (safeGlowBase < 0.0) safeGlowBase = 0.0;
			color = clamp(safeGlowBase + glow(color, uv) * safeGlowStrength, .0, 1.0);
		}

		// contrast
		float safeContrast = contrastAmount;
		if (safeContrast < 0.0) safeContrast = 0.0;
		if (safeContrast > 0.0) {
			vec3 safeCurve = contrastCurve;
			if (all(lessThanEqual(contrastCurve, vec3(0.0)))) {
				safeCurve = vec3(1.0, 1.0, 1.0); // default curve amounts
			}
			vec3 safeCorr = contrastCorrection;
			if (all(lessThanEqual(contrastCorrection, vec3(0.0)))) {
				safeCorr = vec3(1.0, 1.0, 1.0); // default correction factors
			}
			color = mix(color, contrast(color, safeCurve.x, safeCurve.y, safeCurve.z, safeCorr.x, safeCorr.y, safeCorr.z), safeContrast);
		}

		// flare: use packed vec4 `flareParams` (mix, threshold, intensity, stretch)
		// default all zeros = no flares
		float safeFlareMix = flareParams.x;
		if (safeFlareMix < 0.0) safeFlareMix = 0.0;
		if (safeFlareMix > 0.0) {
			float safeFlareThreshold = flareParams.y;
			if (safeFlareThreshold <= 0.0) safeFlareThreshold = 0.9;
			float safeFlareIntensity = flareParams.z;
			if (safeFlareIntensity <= 0.0) safeFlareIntensity = 200.0;
			float safeFlareStretch = flareParams.w;
			if (safeFlareStretch <= 0.0) safeFlareStretch = 0.04;

			float safeFlareBrightness = flareBrightness;

			vec3 flareContribution = flares(bitmap, uv, safeFlareThreshold, safeFlareIntensity, safeFlareStretch, safeFlareBrightness);
			color += flareContribution * safeFlareMix;
		}

		// margins (default 0.0 = no margins)
		float safeMargin = marginSize;
		if (safeMargin < 0.0) safeMargin = 0.0;
		if (safeMargin > 0.0) color = margins(color, uv, safeMargin);
	
	
	//output
	gl_FragColor = vec4(color, 1.0);
}
