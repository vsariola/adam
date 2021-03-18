#version 400

uniform float syncs[16];
out vec4 output;
vec2 iResolution = vec2(1280.0,720.0);

// PASTE FROM HERE
// ---------------
float beat,pattern,part,partBeat,yaw,pitch;
vec3 col;

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
    if (abs(p.x)>25. || abs(p.y)>11.) {
        return vec3(0.,0.,0.0);
    }        
    return vec3(float(int(p.x)&int(beat+0.5)%5)+float(int(p.y)&(int(beat))%7),0,0)*syncs[2]+syncs[3]*10.;
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
    float f = p.y;    
    
    return min(min(min(hall(p),f),lightRigs(p)),stage(p));
}

// Calculates the distance from a ray (o + r*d) to a line segment between points a & b
// also returns the solution, in case

vec4 distRayToSegment(vec3 a,vec3 ba,vec3 o,vec3 r) {
    vec3 uvw = inverse(mat3(ba,-r,cross(ba,r)))*(o-a);
    uvw.x = uvw.x<0. ? 0. : uvw.x>1.0?1.0:uvw.x;    
    uvw.y = uvw.y<0. ? 0. : uvw.y;
    return vec4(uvw,length(a+uvw.x*ba-o-uvw.y*r)); // returns also the solution
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

    // Normalized pixel coordinates (from 0 to 1)
    
    vec3 o = vec3(sin(beat*0.2)-15.0,cos(beat*0.2)*5.+10.,cos(beat*0.2)*10.-10.);

    if (part > 43. && part < 43.5) {
        part = (part-43.)*16.+8.;
    }

    if (part > 43.5 && part < 44.) {
        part = (part-43.5)*32.+8.;
    }

    if (part < 8.) {
        o = vec3(0.,10.,beat-55.);
    } else if (part < 28. || (part > 34. && part < 40.)) {        
        part = mod(part,8.);
        if (part < 1.) {
            o = vec3(-25,15.,partBeat*4.-21.);  
            yaw = -1.2;
            pitch = .4;
        } else if (part < 2.) {
            o = vec3(15.,10.,partBeat*4.-24.);          
        } else if (part < 3.) {
            o = vec3(0.,1.,partBeat*4.-24.);
            pitch = -1.;        
        } else if (part < 3.5 || (part > 7. && part < 7.5)) {
            o = vec3(-25.,5.,-24.);
            pitch = -0.5;                
            yaw = -0.6;
        } else if (part < 4. || part > 7.) {
            o = vec3(0.,10.,15.-partBeat);
        } else if (part < 5.) {            
            o = vec3(0.,24.,partBeat*4.-24.);            
            pitch = 0.7;            
        } else if (part < 6.) {
            o = vec3(-18.+partBeat*4.,11.,-22.); 
            yaw = partBeat/8.-0.25;
        } else {
            o = vec3(-10.,16.,partBeat*4.-20.);
            yaw = -1.4;
            pitch = 0.5-partBeat/32.;
        }
        if (pattern>32.) {
            o.x = -o.x;
            yaw = pattern>32.?-yaw:yaw;
        }
    } else if (part < 32.) {
        o = vec3(0.,11.,-24.);                
    } else if (part < 34.) {
        o = vec3(0.,10.,pattern-80.);
        pitch = -1.4;
    } else if (part < 44.) {
        o = vec3(0.,10.,pattern-75.);
    } else {
        o = vec3(-25,15.,pattern-97.);  
        yaw = -1.2;
        pitch = .4;
    }
    
    yaw += fogMap(o/2.)*0.02-0.01;
    
    vec3 r = normalize(vec3(uv,1.));
    
    r.yz = mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch)) * r.yz;    
    r.xz = mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw)) * r.xz;           
    
    float d = 0.;
    vec3 p;    
    
    for (int i = 0;i < 190;i++) {    
        if (d > 70.0) {
            break;
        }
        p = o + r * d;
        float b = map(p); 
        if (b < 0.01) {                
            break;
        }                      
        d += b * (p.y < 2.?0.1:1.);                
    }          
                
    for (float d2=d;d2>0.;d2-=0.5) {              
        p -= 0.5*r;               
        col += ((vec3(0.01)+(abs(p.x-p.y+29.)<40.*clamp((pattern-64.)/16.0,0.,1.)?pow(p.y/15.,4.):0.)*vec3(0.4,0.36,0.3) - col) * fogMap(p)+ screen(p.xy)*exp(p.z-25.)) * 0.03 * min(d2,0.5);        
    }
        
    if (syncs[4] > 0.0) {
        for (int j =-2;j < 3;j++) {   
            float angle = float(j)/1.9;  
            for (int i = 0;i < 30;i++) {          
                vec3 dir = vec3(sin(float(i-15)+beat*1000.),0.1,-2.);
                vec3 pos = vec3(sin(angle),cos(angle),0);  
                vec4 ld = distRayToSegment(o,r*d,pos*15.+vec3(0,0,19.0),dir);
                float b = .5*exp(-50.*ld.w)*fogMap((o+ld.y*r)*3.)/sqrt(1.-pow(dot(r,dir)/length(dir),2.));
                col += vec3(0.2,1.,0.1)*b;
            }
        }
    }
            
            
    for (int k = 0;k < 2;k++) {
        for (int i = 0;i < 20;i++) {             
            float rig = float((int((pattern>16.?beat:3.)))%4-2);
            vec3 dir = vec3(cos((float(i)+0.5)*6.28/20.),sin((float(i)+0.5)*6.28/20.),0.);
            vec3 pos = dir * 4. + vec3(0.,10.,rig*10.);                                   
            dir.z = 2.-4.*mod(rig,2.);
            dir.xy += dir.yx * vec2(-1.,1.) * (syncs[6]-0.5)*10.;
            pos.x += 15.-float(k)*30.;                        
            vec4 ld = distRayToSegment(o,r*d,pos,dir);        
            float beamwidth = 1.+ld.y*3.;
            float b = 60.*exp(-80./beamwidth*ld.w)/beamwidth/beamwidth/sqrt(1.-pow(dot(r,dir)/length(dir),2.))*fogMap(o+ld.y*r);
            col += vec3(1.,1.,0.6)*b*(pattern<8.||pattern>88.?0.:pattern<16.?1.:syncs[2]);
        }
    }
    
    if (pattern >24.&&pattern<88.) {
        for (int i = -20;i < 20;i++) {
            vec3 dir = vec3(cos((float(i)+0.5)*6.28/20.),cos((float(i)+0.5)*6.28/20.)/2.+1.,-1.);
            vec3 pos = vec3(float(i),2.5,19.);            
            dir.z += sin(beat)*1.0;                    
            vec4 ld = distRayToSegment(o,r*d,pos,dir);        
            float beamwidth = 1.0+ld.y*5.;
            float b = 60.*exp(-80./beamwidth*ld.w)/beamwidth/beamwidth/sqrt(1.-pow(dot(r,dir)/length(dir),2.))*fogMap(o+ld.y*r);
            col += vec3(1.,0.4,0.6)*b*pow(cos(float(i)/10.+beat),2.);
        }
    }
   
    if (pattern > 32.&&pattern<88.) {
        for (int i = -20;i < 20;i++) {
            vec3 dir = vec3(0.,-1.0,.0);
            vec3 pos = vec3(float(i),20.,15.);            
            dir.xy += sin(beat)*1.0;                    
            vec4 ld = distRayToSegment(o,r*d,pos,dir);        
            float beamwidth = 1.0+ld.y*5.;
            float b = 60.*exp(-80./beamwidth*ld.w)/beamwidth/beamwidth/sqrt(1.-pow(dot(r,dir)/length(dir),2.))*fogMap(o+ld.y*r);
            col += vec3(1.,0.4,0.6)*b*pow(cos(float(i)/10.+beat),2.);
        }
    }

    // ----------------
    // PASTE UNTIL HERE
    // Output to screen     
    output = vec4(sqrt(col * 5.),1.0) * smoothstep(0.,1.0,min(pattern,(94.-pattern))/8.);
}