#pragma header

uniform float hue;
uniform float saturation;
uniform float brightness;
uniform float contrast;

// new thing added by me (bobbyDX)
uniform float hsvMode;     // 0 = FNF 0.6+ , 0.5 = FNF 0.5+ axis, 1 = HSV

const vec3 grayVals = vec3(.3098,.6078,.08235);

// --- HSV ---
vec3 rgb2hsv(vec3 c){
    float M=max(max(c.r,c.g),c.b), m=min(min(c.r,c.g),c.b), d=M-m;
    float h=(d<1e-6)?0.:(
        M==c.r?mod((c.g-c.b)/d,6.):
        M==c.g?(c.b-c.r)/d+2.:(c.r-c.g)/d+4.
    );
    return vec3((h<0.?h+6.:h)*60., M<=0.?0.:d/M, M);
}
vec3 hsv2rgb(vec3 h){
    float C=h.z*h.y, X=C*(1.-abs(mod(h.x/60.,2.)-1.)), m=h.z-C;
    vec3 r=(h.x<60.)?vec3(C,X,0):
           (h.x<120.)?vec3(X,C,0):
           (h.x<180.)?vec3(0,C,X):
           (h.x<240.)?vec3(0,X,C):
           (h.x<300.)?vec3(X,0,C):vec3(C,0,X);
    return r+vec3(m);
}
vec3 hueHSV(vec3 c,float d){ vec3 h=rgb2hsv(c); h.x=mod(h.x+d,360.); return hsv2rgb(h); }

// --- Axis ---
vec3 hueAxis(vec3 c,float d){
    float a=radians(d), cs=cos(a), sn=sin(a); vec3 k=normalize(vec3(1));
    return c*cs + cross(k,c)*sn + k*dot(k,c)*(1.-cs);
}

// --- Luminance ---
vec3 hueLum(vec3 c,float d){
    float a=radians(d),cs=cos(a),sn=sin(a);
    mat3 m1=mat3(.213,.213,.213, .715,.715,.715, .072,.072,.072);
    mat3 m2=mat3(.787,-.213,-.213, -.715,.285,-.715, -.072,-.072,.928);
    mat3 m3=mat3(-.213,.143,-.787, -.715,.14,.715, .928,-.283,.072);
    return (m1 + cs*m2 + sn*m3)*c;
}

// --- Sat / Con ---
vec3 sat(vec3 c,float s){
    s=(s>0.?s*3.:s)/100.+1.; vec3 g=vec3(dot(c,grayVals));
    return clamp(mix(g,c,s),0.,1.);
}
vec3 con(vec3 c,float x){
    x=x/100.+1.; if(x>1.)
        x=((.00852259*exp(4.76454*(x-1.))*1.01)-.0086078159)*10.+1.;
    return clamp((c-.25)*x+.25,0.,1.);
}

// --- Hue Mixer ---
vec3 mixHue(vec3 c,float d){
    float t=clamp(hsvMode,0.,1.);

    float dip=exp(-pow(t-.5,2.)/(2.*.18*.18));

    float w1=(1.-t)*(1.-dip);
    float w0=t*(1.-dip);
    float wA=dip;

    float s=w0+w1+wA+1e-6;
    w0/=s; w1/=s; wA/=s;

    return hueHSV(c,d)*w0 + hueAxis(c,d)*wA + hueLum(c,d)*w1;
}

// --- Pipeline ---
vec3 apply(vec3 c){
    c += brightness/255.;
    c = mixHue(c,hue);
    c = con(c,contrast);
    c = sat(c,saturation);
    return c;
}

void main(){
    vec4 t = flixel_texture2D(bitmap, openfl_TextureCoordv);
    float a=max(t.a,1e-5);
    vec3 c=apply(t.rgb/a);
    gl_FragColor=vec4(c*a,t.a);
}
