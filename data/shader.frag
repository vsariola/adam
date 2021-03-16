#version 400

uniform float syncs[5];
out vec4 output;


vec2 iResolution = vec2(1280.0,720.0);

float iTime;


float debug = 0.0;

vec2 random2f( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}


float noise3d(vec3 p)
{
	vec3 ip=floor(p);
    p-=ip; 
    vec3 s=vec3(7,157,113);
    vec4 h=vec4(0.,s.yz,s.y+s.z)+dot(ip,s);
    p=p*p*(3.-2.*p); 
    h=mix(fract(sin(h)*43758.5),fract(sin(h+s.x)*43758.5),p.x);
    h.xy=mix(h.xz,h.yw,p.y);
    return mix(h.x,h.y,p.z); 
}



float fogMap(vec3 p) {
    return noise3d(p/3.)*15./(p.y+15.);
}

float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}

float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xy),p.z)) - vec2(h,r);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

vec2 voronoiPeople( vec3 point )
{
    ivec2 p = ivec2(floor( point.xz ));
    vec2  f = fract(point.xz );

    vec2 res = vec2( 8.0 );
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ )
    {
        ivec2 b = ivec2(i, j);
        vec2  r = vec2(b) - f + random2f(vec2(p + b));
        float d = sdCappedCylinder(vec3(r.x,r.y,point.y),0.15,0.5);        

        if( d < res.x )
        {
            res.y = res.x;
            res.x = d;
        }
        else if( d < res.y )
        {
            res.y = d;
        }
    }

    return sqrt( res );
}

float sdCylinder( vec3 p, vec3 c )
{
  return length(p.xy-c.xy)-c.z;
}

float sdRepTorus( vec3 p, vec2 t )
{
  p.z = mod(p.z,30.)-15.;
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

vec4 sdMin(vec4 a, vec4 b) {
    if (a.w < b.w) {
        return a;
    } else {
        return b;
    }
}

vec4 sdMax(vec4 a, vec4 b) {
    if (a.w > b.w) {
        return a;
    } else {
        return b;
    }
}


vec3 screen(vec2 p) {  
    p.y -= 10.;
    if (abs(p.x)>25. || abs(p.y)>11.) {
        return vec3(0.1,debug,0.0);
    }        
    return vec3(float(int(p.x)&int(iTime+0.5)%5)+float(int(p.y)&(int(iTime))%7),0,0);
}

vec4 hall(vec3 p) {      
    return vec4(screen(p.xy),-sdCappedCylinder(p+vec3(0.,10.,0.),40.,25.));
}

vec4 lightRigs(vec3 p) {
    float dist = sdTorus(p.yzx+vec3(0.,-20.,0.),vec2(15,1.0));
    p.x = mod(p.x,30.)-15.;    
    dist = min(dist,sdTorus(p.yzx+vec3(-10.,-10.,0.),vec2(4.8,0.2)));
    dist = min(dist, sdTorus(p.yzx+vec3(-10.,-5.,0.),vec2(4.8,0.2)));
    dist = min(dist, sdTorus(p.yzx+vec3(-10.,-0.,0.),vec2(4.8,0.2)));
    
    return vec4(0.,0.,debug,dist);
}

vec4 stage(vec3 p) {
    float dist = sdBox(p-vec3(0,0,23.),vec3(200.,2.,5.));
    dist = min(dist,sdTorus(p.zyx-vec3(27.,2,0.),vec2(4,2)));
    p.x = mod(p.x,48.)-24.;    
    dist = min(dist,sdBox(p-vec3(0,0,20.),vec3(2.,20.,1.)));   
    if (p.y < 1.4) {
        dist = min(dist, voronoiPeople(p).x);
    }
    return vec4(0.,debug,debug,dist);
}


vec4 map(vec3 p) {    
    vec4 f = vec4(debug,0.,0.,p.y);    
    
    return sdMin(sdMin(sdMin(hall(p),f),lightRigs(p)),stage(p));
}

// Calculates the distance from a ray (o + r*d) to a line segment between points a & b

vec4 distRayToSegment(vec3 a,vec3 b,vec3 o,vec3 r) {
    vec3 ba = b - a;
    vec3 uvw = inverse(mat3(ba,-r,cross(ba,r)))*(o-a);
    //uvw.x = uvw.x<0.?0.:uvw.x;    
    uvw.x = uvw.x<0.?0.:uvw.x>1.0?1.0:uvw.x;    
    uvw.y = uvw.y<0.?0.:uvw.y;
    return vec4(uvw,length(a+uvw.x*ba-o-uvw.y*r)); // returns also the solution
}

void main()
{

    iTime = syncs[0]/4.0;

     vec3 projector = vec3(-5.,15.,5.);

    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (2.*gl_FragCoord.xy-iResolution.xy)/iResolution.y;
    
    vec3 o = vec3(sin(iTime*0.2),cos(iTime*0.2)+10.,cos(iTime*0.2)*10.);
    
    vec3 r = normalize(vec3(uv,1.));
    float angle = 0.2;
    mat2 rot = mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
    //r.xy = rot * r.xy;
    angle = cos(iTime*0.6125) * 0.2;
    rot = mat2(cos(angle),sin(angle),-sin(angle),cos(angle));    
    r.xz = rot * r.xz;
    
    
    float d = 0.;
    vec3 col = vec3(0.);
    vec3 p;
    
    for (int i = 0;i < 199;i++) {    
        if (d > 70.0) {
            break;
        }
        p = o + r * d;
        vec4 b = map(p); 
        if (b.w < 0.1) {
            //vec3 n = normal(p,b.w*10.);
            //col += b.xyz * (.5 + n.y * .5) / d;
            col += b.xyz * .5 / d;
            break;
        }                      
        
        /*float glow = b.z * exp(-b.w);       */
        b.w*=p.y < 1.2?0.1:1.;
        //b.w = min(b.w * 0.3,1.0/(glow+3e-6));
       /* if (abs(p.x) < 20.0 && abs(p.y-15.) < 10.0) {
            col += glow*b.w*5e-3;
        }*/
        d += b.w;                
    }   
    
    float step= 0.5;
    for (float d2=d;d2>0.;d2-=step) {              
        col += (vec3(0.05,0.05,0.05) + screen(p.xy)*exp(p.z-25.) - col) * fogMap(p) * 0.01 * min(step,1.);
        p = o+d2*r;
        step = p.z > 14.5?0.3:2.0;
    }
     
    
    for (int j =-2;j < 3;j++) {   
        for (int i = 0;i < 30;i++) {
            float angle = float(j)/2.;
            vec3 pos = vec3(sin(angle),cos(angle),0);
            pos *= 15.0;
            pos += vec3(0,0,19.0);
            vec4 ld = distRayToSegment(o,o+r*d,pos,vec3(sin(float(i-15)+iTime*1000.),sin(iTime+float(j))+1.,-1.));
            float b = .2*exp(-50.*ld.w)*fogMap(o+ld.y*r);
            col += vec3(0.5,1.,0.6)*b;
        }
    }
            
    for (int k = 0;k < 2;k++) {
        for (int j = 0;j < 1;j++) {   
            for (int i = 0;i < 20;i++) {
                vec3 dir = vec3(cos((float(i)+0.5)*6.28/20.),sin((float(i)+0.5)*6.28/20.),0.);
                vec3 pos = dir * 5. + vec3(0.,10.,float((j+int(iTime*3.))%3)*5.);            
                dir.z += sin(iTime)*1.0;            
                pos.x += 15.-float(k)*30.;            
                vec4 ld = distRayToSegment(o,o+r*d,pos,dir);        
                float beamwidth = 10.+ld.y;
                float b = 20.*exp(-80./beamwidth*ld.w)/beamwidth/beamwidth;
                col += vec3(1.,1.,0.6)*b*(1.-fract(iTime*3.));
            }
        }
    }
    
    for (int i = -20;i < 20;i++) {
        vec3 dir = vec3(cos((float(i)+0.5)*6.28/20.),cos((float(i)+0.5)*6.28/20.)+1.,-2.);
        vec3 pos = vec3(float(i),2.5,19.);            
        dir.z += sin(iTime)*1.0;                    
        vec4 ld = distRayToSegment(o,o+r*d,pos,dir);        
        float beamwidth = 10.+ld.y;
        float b = 20.*exp(-80./beamwidth*ld.w)/beamwidth/beamwidth;
        col += vec3(1.,0.4,0.6)*b*abs(cos(float(i)/10.+iTime));
    }
   
             
    // Output to screen
    output = vec4(pow(col * 5.,vec3(0.45)),1.0);
}