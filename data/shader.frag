#version 400

uniform float syncs[16];
out vec4 output;
vec2 iResolution = vec2(1280.0,720.0);

// PASTE FROM HERE
// ---------------
float beat,pattern,part,partBeat,yaw,pitch,d;
vec3 col,o,r,primaryColor,secondaryColor,tertiaryColor;
int partIndex;


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

// iq... I think
float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xy),p.z)) - vec2(h,r);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float voronoiPeople( vec3 point )
{
    ivec2 p = ivec2(floor( point.xz ));
    vec2  f = fract(point.xz );

    float res = 8.0;
    for( int i=0; i<4; i++ )
    {
        ivec2 b = ivec2(i%2, i/2);                
        vec2  r = vec2(b) - f + fract(sin(mat2(127.1,311.7,269.5,183.3)*vec2(p + b))*43758.);
        float d = sdCappedCylinder(vec3(r.x,r.y,point.y),0.05,0.7)-0.05;        

        if( d < res ) {
            res = d;
        }
    }

    return res;
}

vec3 screen(vec2 p) {  
    p.y -= 10.;
    return smoothstep(0.,1.,min(25.-abs(p.x),11.-abs(p.y)))
      * (float(int(p.x)&int(beat+0.5)%5+int(p.y)&(int(beat))%7)*secondaryColor*syncs[2]+syncs[3]*10.);
}

float hall(vec3 p) {    
    vec2 w = vec2( -sdBox(vec3(p.xy-vec2(0.,9.5),0.),vec3(2.,3.,15.)), abs(p.z+40.) - 15. );    
    return min(min(max(w.x,w.y),0.0) + length(max(w,0.0)),-sdCappedCylinder(p+vec3(0.,10.,15.),40.,40.));
}

float lightRigs(vec3 p) {
    float dist = sdTorus(p.yzx+vec3(0.,-20.,0.),vec2(15,1.0));
    p.x = mod(p.x,30.)-15.;    
    p.z -= 5.;
    p.z = max(mod(-p.z,10.),p.z)-5.;        
    dist = min(min(min(dist,sdBox(p-vec3(2.7,20.,0.),vec3(0,7.,0))),sdBox(p-vec3(-2.7,20.,0.),vec3(0,7.,0))),min(dist,sdTorus(p.yzx+vec3(-10.,0.,0.),vec2(3.8,0.2))));
    p.z = max(mod(p.z,10.),p.z)-5.;            
    return min(dist,sdBox(p.xyz+vec3(0,-20.,0.),vec3(20.,0.2,0.2)));
}

float stage(vec3 p) {    
    float dist = min(sdBox(p-vec3(0,0,23.),vec3(200.,2.,5.)),sdTorus(p.zyx-vec3(27.,2,0.),vec2(4,2)));
    p.x = mod(p.x,40.)-20.;            
    return min(min(dist,sdBox(p-vec3(0,0,20.),vec3(2.,15.,1.))),p.y<1.0?voronoiPeople(p):p.y-0.7);
}

float map(vec3 p) {     
    return min(min(min(hall(p),p.y),lightRigs(p)),stage(p));
}

// Calculates the distance from a ray (o + r*d) to a line segment between points a & b
// also returns the solution, in case

void light(vec3 pos,vec3 dir,vec3 color, float a,float b, float c,float x) {
    vec3 ba = r*d;
    vec3 uvw = inverse(mat3(ba,-dir,cross(ba,dir)))*(pos-o);
    uvw.x = uvw.x<0. ? 0. : uvw.x>1.0?1.0:uvw.x;    
    uvw.y = uvw.y<0. ? 0. : uvw.y;
    float beamwidth = 1.+uvw.y*x;                
    col += color*a*exp(-b*length(o+uvw.x*ba-pos-uvw.y*dir)/beamwidth)/beamwidth/beamwidth*fogMap((o+uvw.y*r)*c)/sqrt(1.-pow(dot(r,dir)/length(dir),2.));
}
// ----------------
// PASTE UNTIL HERE

void main()
{  
    // KEEP THIS
    vec2 uv = (2.*gl_FragCoord.xy-iResolution.xy)/iResolution.y;
    
    // PASTE FROM HERE
    // ---------------
    beat = syncs[0]/4.0;
    pattern = beat/4.0;
    part = pattern/2.0;
    partBeat = mod(beat,8.);
    partIndex = int(part);
    
    primaryColor = vec3(1.);
    if (part > 4. && part < 44.) {
        secondaryColor = vec3(3.,1.,0.);    
    }    

    // Normalized pixel coordinates (from 0 to 1)
    
    if (part > 43. && part < 43.5) {
        part = (part-43.)*16.+8.;
    }

    if (part > 43.5 && part < 44.) {
        part = (part-43.5)*32.+8.;
    }
    
    if (part < 8.) {
        o = vec3(0.,10.,beat-55.);
    } else if (part < 28. || (part > 34. && part < 40.)) {    
        float primaryHue = float(part/4.0);
        primaryColor = (vec3(cos(primaryHue),cos(primaryHue+2.0),cos(primaryHue+4.0))*.5+.5)*(part > 20. && part < 28. ? pow(1.-mod(syncs[0]/2.,1.),2.) : syncs[2]);
        part = mod(part,8.);
        if (part < 1.) {
            o = vec3(-25,15.,partBeat*4.-21.);  
            yaw = -1.1-partBeat*.05;
            pitch = .4;
        } else if (part < 2.) {
            o = vec3(15.,10.,partBeat*4.-24.);          
        } else if (part < 3.) {
            o = vec3(0.,4.,partBeat*4.-24.);
            pitch = -.7+partBeat*.05;        
        } else if (part < 3.5 || (part > 7. && part < 7.5)) {
            o = vec3(-25.,5.,-24.);
            pitch = -0.5;                
            yaw = -0.8+partBeat*.05;
        } else if (part < 4. || part > 7.) {
            o = vec3(0.,10.,15.-partBeat);
        } else if (part < 5.) {            
            o = vec3(0.,22.,partBeat*4.-24.);            
            pitch = 0.7;            
        } else if (part < 6.) {
            o = vec3(-18.+partBeat*4.,7.+partBeat,-22.); 
            yaw = partBeat/8.-0.25;
        } else {
            o = vec3(-10.,16.,partBeat*4.-20.);
            yaw = -1.5;
            pitch = 0.5-partBeat/32.;
        }
        if (pattern>32.) {
            o.x = -o.x;
            yaw = pattern>32.?-yaw:yaw;
        }        
        secondaryColor = primaryColor;
        tertiaryColor = primaryColor;
    } else if (part < 32.) {
        o = vec3(0.,11.,pattern-80.);                
        secondaryColor = tertiaryColor;
    } else if (part < 34.) {
        o = vec3(0.,10.,pattern-80.);
        pitch = -1.4;
        secondaryColor = tertiaryColor;
    } else if (part < 44.) {        
        o = vec3(0.,10.,327.-beat);
        secondaryColor = vec3(1.0,0.,0.);        
    } else {
        o = vec3(-25,15.,pattern-97.);  
        yaw = -1.2;
        pitch = .4;
    }
    
    yaw += fogMap(o/2.)*0.02-0.01;
    
    r = normalize(vec3(uv,1.));
    
    r.yz = mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch)) * r.yz;    
    r.xz = mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw)) * r.xz;           
    
    vec3 p;    
    
    for (int i = 0;i < 199;i++) {        
        p = o + r * d;
        float b = map(p); 
        if (b < 0.01 || d > 70.0) {                
            break;
        }                      
        d += b * (p.y < 2.?0.1:1.);                
    }          
                
    for (float d2=d;d2>0.;d2-=0.5) {              
        p -= 0.5*r;               
        col += ((vec3(0.007)+smoothstep(0.,1.,40.*clamp((pattern-64.)/16.0,0.,1.)-abs(p.x-p.y+29.))*pow(p.y/15.,4.)*vec3(0.4,0.36,0.3) - col) * fogMap(p)+ screen(p.xy)*exp(p.z-25.)) * 0.03 * min(d2,0.5);        
    }
        
    if (syncs[4] > 0.0) {
        // lasers
        for (int i = 0;i < 150;i++) {    
            float angle = float(i/30-2)/1.9;              
            light(vec3(sin(angle),cos(angle),0)*15.+vec3(0,0,19.0),vec3(sin(float(i)+beat*1000.),0.1,-2.),vec3(0.2,1.,0.1),.5,50.,3.,0.);
        }        
    }       
                
    // round lightrigs hanging from the ceiling
    for (int i = 0;i < 40;i++) {             
        float rig = float((int((pattern>16.&&pattern<40.?beat:3.)))%4-2);
        vec3 dir = vec3(cos((float(i)+0.5)*6.28/20.),sin((float(i)+0.5)*6.28/20.),0.);
        vec3 pos = dir * 4. + vec3(0.,10.,rig*10.);                                   
        dir.z = 2.-4.*mod(rig,2.);
        dir.xy += dir.yx * vec2(-1.,1.) * syncs[7]*10. + (partIndex >= 20 && partIndex < 28 ? sin(vec2(float(i),float(i+9)) + beat) : vec2(0.));
        pos.x += 15.-float(i/20)*30.;                                    
        light(pos,dir,secondaryColor,60.,80.,1.,3.);
    }    

    for (int i =-20;i < 21;i++) { 
        // front lights
        float angle = float(i)*.07;  
        light(
            vec3(sin(angle),cos(angle),0)*15.+vec3(0,0,19.0),
            vec3(sin(angle),cos(angle),0)+vec3(0.,0.5,-2.),
            primaryColor * (syncs[5]+(part > 28. && part < 32.?1.+sin(part-angle):0.)),
            60.,80.,1.,20.);
        
        // ceiling lights         
        light(
            vec3(float(i),20.,-15. + float((int(pattern)+i/4)%3)*10.),
            vec3(float(i)*.1,-3.0,
            sin(beat+float(i*(partIndex >= 20 && partIndex < 28 ? 10 : 1))*.2)*1.0),
            tertiaryColor,
            150.,80.,1.,10.);
    }   
       

    // ----------------
    // PASTE UNTIL HERE
    // Output to screen     
    output = vec4(sqrt(col * 5.),1.0) * smoothstep(0.,1.0,min(pattern,(94.-pattern))/8.);
}