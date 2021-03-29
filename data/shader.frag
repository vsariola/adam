#version 330

uniform float syncs[8];
out vec4 outcolor;
vec2 iResolution = vec2(@XRES@,@YRES@);

// PASTE FROM HERE
// ---------------
float beat,pattern,part,partBeat,xx,yy,d;
vec3 col,o,r,primaryColor,secondaryColor,tertiaryColor;
int partIndex,i,j;

int logo[] = int[10](0,-1,0x7C0000,0x380040F0,0xFF01F7FD,-1,0,0xD31F0320,-1,0x10001F);

// fogMap is the "density" of fog at point p
// contains some some inline 3D noise function from iq (?)
float fogMap(vec3 p2) {
    vec3 p = p2/3,ip=floor(p),s=vec3(7,157,113);
    p-=ip;     
    vec4 h=vec4(0,s.yz,s.y+s.z)+dot(ip,s);
    p=p*p*(3-2*p); 
    h=mix(fract(sin(h)*99),fract(sin(h+s.x)*99),p.x);
    h.xy=mix(h.xz,h.yw,p.y);
    return mix(h.x,h.y,p.z)*15/(p2.y+15);
}

// SDF functions from iq's tutorials
float sdBox( vec3 p, vec3 b ) {
  p = abs(p) - b;
  return length(max(p,0)) + min(max(p.x,max(p.y,p.z)),0);
}

float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xy),p.z)) - vec2(h,r);
  return min(max(d.x,d.y),0) + length(max(d,0));
}

float sdTorus( vec3 p, vec2 t )
{  
  return length(vec2(length(p.yx)-t.x,p.z))-t.y;
}

// Returns the color at a 2D point of the screen in the front stage
vec3 screen(vec2 p) {  
    p.y -= 10;
    i = int(length(p*2));   
    int a = 1 << int(atan(p.y,p.x)*5.09);
    p.x = abs(p.x);
    return smoothstep(0,2,min(25-p.x,11-abs(p.y)))
      * ((part < 40 ? int(p.x)&int(beat+.5)%5+int(p.y)&(int(beat))%7 : // the rectangular modulo pattern
          part < 41 ? sdCappedCylinder(vec3(0,p.x-p.y*.8,p.y+.5),0,0)<4 ? 3 : 0 : // heart
          i < 10 ? (logo[i]&a)!=0 ? 3 : 0 :                
          0
         )*secondaryColor*syncs[1]+syncs[3]*10);
}

// Calculates the distance from a ray (o + r*d) to a line segment between points a & b
// also returns the solution, in case

void light(vec3 pos,vec3 dir,vec3 color, float a,float b, float c,float x) {
    vec3 ba = r*d;
    vec3 uvw = inverse(mat3(ba,-dir,cross(ba,dir)))*(pos-o);  
    uvw.y = max(uvw.y,0);
    yy = 1+uvw.y*x;                
    col += color*a*exp(-b*length(o+clamp(uvw.x,0,1)*ba-pos-uvw.y*dir)/yy)/yy/yy/yy*fogMap((o+uvw.y*r)*c)/sqrt(1-pow(dot(r,dir)/length(dir),2));
}
// ----------------
// PASTE UNTIL HERE

void main()
{  
    // KEEP THIS    
    r = normalize(vec3((2*gl_FragCoord.xy-iResolution)/iResolution.y,1));
    
    // PASTE FROM HERE
    // ---------------
    beat = syncs[0]/4;
    pattern = beat/4;
    part = pattern/2;
    partBeat = mod(beat,8);
    partIndex = int(part);
    
    primaryColor = vec3(1);
    
    // These lines quickly cycle through different parts in sync with the kick,
    // during the final few moments of the intro.
    if (part > 4 && part < 44) {
        secondaryColor = vec3(3,.6,.75);    
        if (part > 43) {
            part = (part-42.5)*16;
            if (part > 16) {
                part += part-24;
            }
        }
    }

    // Camera yy, xx, position and light colors chosen based
    // on which part it is.
    // xx = yaw
    // yy = pitch
    if (part < 8) {
        o = vec3(0,10,beat-55);
    } else if (part < 28 || (part > 34 && part < 40)) {    
        primaryColor = part < 20 ? vec3(.3,1,3)*syncs[1] : part < 28 ? vec3(3,.1,.2)*pow(1-mod(syncs[0]/2,1),2) : vec3(3,2,1)*syncs[1];  
        part = mod(part,8);
        if (part < 1) {
            o = vec3(-25,15,partBeat*4-21);  
            xx = -1.1-partBeat*.05;
            yy = .4;
        } else if (part < 2) {
            o = vec3(15,10,partBeat*4-24);          
        } else if (part < 3) {
            o = vec3(0,4,partBeat*4-24);
            yy = -.7+partBeat*.05;        
        } else if (part < 3.5 || (part > 7 && part < 7.5)) {
            o = vec3(-25,5,-24);
            yy = -.5;                
            xx = -.8+partBeat*.08;
        } else if (part < 4 || part > 7) {
            o = vec3(0,10,15-partBeat);
        } else if (part < 5) {            
            o = vec3(0,22,partBeat*4-24);            
            yy = .7;            
        } else if (part < 6) {
            o = vec3(-18+partBeat*4,7+partBeat,-22); 
            xx = partBeat/8-.2;
            yy = partBeat/16-.3;
        } else {
            o = vec3(-10,16,partBeat*4-20);
            xx = -1.5;
            yy = .5-partBeat/32;
        }
        if (pattern>32) {
            o.x = -o.x;
            xx = -xx;
        }        
        secondaryColor = primaryColor;
        tertiaryColor = primaryColor;
    } else if (part < 32) {
        o = vec3(0,11,pattern-80);                
        secondaryColor = tertiaryColor;
    } else if (part < 34) {
        o = vec3(0,10,pattern-80);
        yy = -1.4;
        secondaryColor = tertiaryColor;
    } else if (part < 44) {        
        o = vec3(0,10,327-beat);
        secondaryColor *= syncs[1];        
    } else {
        o = vec3(-25,15,pattern-97);  
        xx = -1.2;
        yy = .4;
    }

    // Rotate camera: Euler yy and xx
    r.yz *= mat2(cos(yy),-sin(yy),sin(yy),cos(yy));    
    r.xz *= mat2(cos(xx),-sin(xx),sin(xx),cos(xx));           
    
    vec3 p,p2;    
    
    // Raymarch forward, here:
    // yy = signed distance
    for (i = 0;i < 199;i++) {        
        p2 = p = o + r * d;
        vec2 w = vec2( -sdBox(vec3(p.xy-vec2(0,9.5),0),vec3(2,3,15)), abs(p.z+40) - 15);    
        yy = min(
                min(
                    min(
                        min(
                            min(
                                min(max(w.x,w.y),0) + length(max(w,0)),
                                -sdCappedCylinder(p+vec3(0,10,15),40,40)
                            ),
                            p.y
                        ),
                        sdBox(p-vec3(0,0,23),vec3(200,2,5))
                    ),
                    sdTorus(p-vec3(0,0,20),vec2(15,1))
                ),
                max(
                    sdCappedCylinder(p.xzy-vec3(0,24,2),4,2)+.2*sin(p.y),
                    -sdCappedCylinder(p.xzy-vec3(0,24,4),3.8,2)
                )            
            );          
        p2.x = mod(p2.x,30)-15;    
        p2.z -= 5;
        p2.z = max(mod(-p2.z,10),p2.z)-5;        
        yy = min(min(min(yy,sdBox(p2-vec3(2.7,33,0),vec3(.02,20,.02))),sdBox(p2-vec3(-2.7,33,0),vec3(.02,20,.02))),min(yy,sdTorus(p2-vec3(0,10,0),vec2(3.8,.2))));
        p2.z = mod(p2.z,10)-5;            
        yy = min(yy,sdBox(p2-vec3(0,20,0),vec3(20,.2,.2)));
        if (p.y < 1) {
            // Computes a SDF where in each 2D rectangular cell is a capped cylinder
            // standing at a random point. The distance is computed to the four nearest
            // cells            
            for(j=0; j<4; j++ )
            {
                vec2 z = vec2(j%2, j/2), f = fract(p.xz );                        
                yy = min(yy,sdCappedCylinder(vec3(z - f + sin(sin(mat2(12,31,23,19)*(floor( p.xz ) + z))*99+syncs[1])*.5+.5,p.y),.05,.7)-.05);        
            }    
        } else {
            yy = min(yy,p.y-.7);
        }                
        p.x = mod(p.x,40)-20;            
        yy = min(yy,sdBox(p-vec3(0,0,20),vec3(2,15,1)));
        if (yy < .01 || d > 70) {                
            break;
        }                      
        d += yy * (p.y < 2?.1:1.);               
    }          

    // Reuse yy and xx variables, here:
    // yy = distance along ray
    // xx = step size
    // March backwards at fixed steps to add fog and screen glow
    for (yy=d;yy>0;yy-=xx) {   
        xx = .5-exp((p.z-25)*.3)*.4; // make the step size a little smaller near the screen
        p = o + r * yy;              
        col += ((vec3(.007)+smoothstep(0,1,40*clamp((pattern-64)/16,0,1)-abs(p.x-p.y+29))*pow(p.y/15,4)*vec3(.4,.36,.3) - col) * fogMap(p)+ screen(p.xy)*exp(p.z-25)) * .03 * min(yy,xx);        
    }       

    // Lasers
    if (syncs[4] > 0)        
        for (i = 0;i < 150;i++) {    
            xx = (i/30-2)/1.9;              
            light(vec3(sin(xx),cos(xx),0)*15+vec3(0,0,19),vec3(sin(i+beat*1000),.1,-2),vec3(.2,1,.1)*syncs[4],.5,50,3,0);
        }           
                
    for (i = -20;i < 21;i++) {             
        // round lightrigs hanging from the ceiling
        // xx = rig number, cycling with the beat
        xx = int((partIndex>7&&partIndex<40?beat:3.))%4-2;
        vec3 dir = vec3(cos((i+.5)*.314),sin((i+.5)*.314),0);
        vec3 pos = dir * 4 + vec3(15-((i+20)/20)*30,10,xx*10);                                   
        dir.z = 2-4*mod(xx,2);
        dir.xy += dir.yx * vec2(-1,1) * syncs[7]*15 + (partIndex >= 20 && partIndex < 28 ? sin(vec2(i,i+9) + beat) : vec2(0));                                   
        light(pos,dir,secondaryColor,50,40,1,3);

        // front lights
        // xx = angle of the light (just reusing variables)
        xx = i*.07;  
        light(
            vec3(sin(xx),cos(xx),0)*15+vec3(0,0,19),
            vec3(sin(xx),cos(xx),0)+vec3(0,.5,-2),
            primaryColor * (syncs[5]+(part > 28 && part < 32?1+sin(part-xx):0.))+syncs[2],
            40,30,1,3);
        
        // ceiling lights         
        light(
            vec3(i,20,-15 + (int(pattern)+i/4)%3*10),
            vec3(i*.1,-3,
            sin(beat+i*(partIndex >= 20 && partIndex < 28 ? 10 : 1)*.2)),
            tertiaryColor,
            150,30,1,4);
    }   
       

    // ----------------
    // PASTE UNTIL HERE
    // Output to screen     
    outcolor = vec4(sqrt(col * 5),1) * smoothstep(0,1,min(pattern,(94-pattern))/8);
}