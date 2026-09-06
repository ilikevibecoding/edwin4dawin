#!/usr/bin/env python3
"""Offline replica of water.ts WATER_FRAG_COMPOSE + post.ts grade for one pixel, to find the brown term.
Sun path pixel: camera at height h looking toward the sun azimuth with view depression 'dep' (deg)."""
import math, sys
import numpy as np

KEYS = [  # el, sun, sunI, zen, hor, haze, sunHaze
 (-18,(0.5,0.6,0.85),0.09,(0.0012,0.002,0.005),(0.004,0.0055,0.012),(0.003,0.004,0.008),(0.004,0.0045,0.007)),
 (-8,(0.5,0.6,0.85),0.10,(0.003,0.006,0.016),(0.02,0.022,0.045),(0.014,0.016,0.03),(0.05,0.025,0.025)),
 (-2,(0.9,0.35,0.15),0.06,(0.015,0.035,0.10),(0.40,0.20,0.19),(0.22,0.15,0.19),(0.6,0.15,0.04)),
 (4,(1.0,0.42,0.16),0.25,(0.03,0.09,0.28),(0.52,0.21,0.15),(0.58,0.30,0.19),(0.62,0.11,0.025)),
 (14,(1.0,0.74,0.46),0.62,(0.03,0.11,0.34),(0.50,0.43,0.40),(0.55,0.50,0.50),(1.0,0.66,0.36)),
 (30,(1.0,0.94,0.84),0.938,(0.006,0.125,0.36),(0.11,0.30,0.45),(0.40,0.55,0.66),(1.0,0.92,0.80)),
 (90,(1.0,0.97,0.93),1.0,(0.005,0.125,0.36),(0.10,0.30,0.45),(0.39,0.55,0.67),(0.98,0.93,0.84)),
]
def smoothstep(a,b,x):
    t=min(max((x-a)/(b-a),0),1); return t*t*(3-2*t)
def mixkey(el):
    a,b=KEYS[0],KEYS[-1]
    for i in range(len(KEYS)-1):
        if KEYS[i][0]<=el<=KEYS[i+1][0]: a,b=KEYS[i],KEYS[i+1]; break
    t=smoothstep(a[0],b[0],min(max(el,a[0]),b[0]))
    l=lambda p,q: np.array(p)*(1-t)+np.array(q)*t
    return dict(sun=l(a[1],b[1]), sunI=a[2]*(1-t)+b[2]*t, zen=l(a[3],b[3]), hor=l(a[4],b[4]), haze=l(a[5],b[5]), sunHaze=l(a[6],b[6]))

def sun_dir(hour):
    lat=math.radians(25.8); dec=math.radians(10); ha=math.radians((hour-12)*15)
    sinEl=math.sin(lat)*math.sin(dec)+math.cos(lat)*math.cos(dec)*math.cos(ha); el=math.asin(sinEl)
    cosAz=(math.sin(dec)-math.sin(el)*math.sin(lat))/(math.cos(el)*math.cos(lat)); az=math.acos(max(-1,min(1,cosAz)))
    if ha>0: az=2*math.pi-az
    return np.array([math.cos(el)*math.sin(az), math.sin(el), -math.cos(el)*math.cos(az)]), math.degrees(el)

def sky_radiance(d, k, sunDir):
    y=max(-1,min(1,d[1])); up=max(y,0); sunUp=sunDir[1]
    kLow=3.5+(7.0-3.5)*smoothstep(0.05,0.35,sunUp); lowMix=(1-up)**kLow
    cosSun=float(np.dot(d,sunDir)); lowSun=(1-smoothstep(0.05,0.3,sunUp))*smoothstep(-0.1,0.0,sunUp)
    hl=math.hypot(d[0],d[2]); sxz=np.array([sunDir[0],sunDir[2]]); sxz=sxz/np.linalg.norm(sxz)
    az=(d[0]*sxz[0]+d[2]*sxz[1])/hl if hl>1e-4 else 0
    horAway=k['hor']*np.array([0.72,0.80,1.45]); hor=k['hor']*(1-lowSun*(0.5-0.5*az))+horAway*(lowSun*(0.5-0.5*az))
    col=k['zen']*(1-lowMix)+hor*lowMix
    hband=(1-up)**14; hazeWhite=np.maximum(k['haze']*(0.88)+k['sunHaze']*0.12, hor*1.05)
    m=hband*0.75*smoothstep(-0.05,0.12,sunUp); col=col*(1-m)+hazeWhite*m
    horizonMix=(1-up)**14; mie=max(cosSun,0)**8*(0.08+0.5*horizonMix); col=col+k['sunHaze']*mie*smoothstep(-0.1,0.15,sunUp)
    cs=max(cosSun,0); col=col+k['sunHaze']*(cs**45*0.4+cs**400*0.9)*lowSun
    band=math.exp(-abs(y)*9)*cs**2; col=col+k['sunHaze']*band*0.35*(1-smoothstep(0.15,0.5,sunUp))*smoothstep(-0.12,0.05,sunUp)
    below=smoothstep(0.0,-0.35,y); col=col*(1-below)+k['haze']*0.8*below
    return col

def probe(d,k,sunDir,ground):
    col=sky_radiance(d,k,sunDir); up=max(d[1],0)
    fill=k['haze']*0.75+ground*0.25; m=0.65*(1-up)**0.3; col=col*(1-m)+fill*m
    col=col*(1-smoothstep(0.02,-0.06,d[1]))+ground*smoothstep(0.02,-0.06,d[1])
    return col

def aces(x):
    a,b,c,d,e=2.51,0.03,2.43,0.59,0.14
    return np.clip((x*(a*x+b))/(x*(c*x+d)+e),0,1)
def post(c):
    c=c*0.92
    gain=np.array([1.03,1.0,0.97]); lift=np.array([0.0,0.002,0.004])
    c=c*gain+lift*(1-np.array([smoothstep(0,0.6,v) for v in c]))
    l=np.dot(c,[0.2126,0.7152,0.0722]); c=l+(c-l)*1.16
    cc=np.minimum(c,1); c=c*(1-0.18)+(c*c*(3-2*cc))*0.18
    c=aces(c); return np.round(255*np.power(np.maximum(c,0),1/2.2)).astype(int)

def slopePdf(sh,va,st,mss):
    along=np.dot(sh,va); across=np.dot(sh,[-va[1],va[0]])
    return math.exp(-(along*along/(mss*st)+across*across*st/mss))/(math.pi*mss)
def slopePdfPeaked(sh,va,st,mss): return 0.75*slopePdf(sh,va,st,mss*0.7)+0.25*slopePdf(sh,va,st,mss*1.9)
def smithB(cosT,alpha):
    tanT=math.sqrt(max(1-cosT*cosT,0))/max(cosT,1e-4); a=1/max(alpha*tanT,1e-4)
    return 1.0 if a>=1.6 else (3.535*a+2.181*a*a)/(1+2.276*a+2.577*a*a)
def glitter(N,V,L,mss):
    NdotL=np.dot(N,L); NdotV=np.dot(N,V)
    if NdotL<=0.002 or NdotV<=0.002: return 0
    H=L+V; H=H/np.linalg.norm(H); NdotH=max(np.dot(N,H),1e-3)
    sh=-np.array([H[0],H[2]])/max(H[1],0.05)+np.array([N[0],N[2]])/max(N[1],0.05)
    va=np.array([V[0],V[2]]); vl=np.linalg.norm(va); va=va/vl if vl>1e-4 else np.array([1,0])
    st=1+0.3*(1-min(max(V[1],0),1))
    P=slopePdfPeaked(sh,va,st,mss); D=P/NdotH**4; alpha=math.sqrt(mss)
    G=smithB(NdotV,alpha)*smithB(NdotL,alpha); LdotH=min(max(np.dot(L,H),0),1); F=0.02+0.98*(1-LdotH)**5
    return min(D*F*G/(4*NdotV),6.0)

def pixel(hour, dep_deg, mss, body=np.array([0.02,0.05,0.08]), az_off_deg=0.0, gl_scale=0.25, whiten=True, verbose=True):
    sunDir,el=sun_dir(hour); k=mixkey(el)
    E=k['sun']*k['sunI']*6.0  # directionalLights[0].color (clear weather)
    skyIrr=k['zen']*0.7+k['hor']*0.3
    ground=(k['sun']*(k['sunI']*6*max(sunDir[1],0)/math.pi)+skyIrr)*np.array([0.26,0.24,0.20])
    # view: toward the sun azimuth (+az_off), depressed by dep
    sxz=np.array([sunDir[0],sunDir[2]]); sxz/=np.linalg.norm(sxz)
    c,s=math.cos(math.radians(az_off_deg)),math.sin(math.radians(az_off_deg)); axz=np.array([c*sxz[0]-s*sxz[1], s*sxz[0]+c*sxz[1]])
    dep=math.radians(dep_deg); viewdir=np.array([axz[0]*math.cos(dep), -math.sin(dep), axz[1]*math.cos(dep)])
    V=-viewdir; N=np.array([0,1.0,0])
    Rdir=viewdir.copy(); Rdir[1]=-Rdir[1]  # reflect(-V,N) about flat normal
    rSky=min(max(mss**0.25,0.05),1)
    Rdir[1]=max(Rdir[1],0.02+0.08*rSky); Rdir/=np.linalg.norm(Rdir)
    sky=probe(Rdir,k,sunDir,ground)  # approximates the PMREM lookup at the mean direction
    dome=sky_radiance(Rdir,k,sunDir)
    if whiten:
        w=0.65*(1-min(max(Rdir[1],0),1))**0.3; lum=np.dot(sky,[0.2126,0.7152,0.0722])
        sky=np.maximum(lum*(1-0.18*w)+(sky-lum)*(1+2.2*w),0)
    cosV=max(np.dot(N,V),0); Fg=max(1-1.6*rSky*rSky,0.45); F=0.02+(Fg-0.02)*(1-cosV)**5
    g=glitter(N,V,sunDir,mss)
    gcol=E*gl_scale*g
    # body irradiance: E/pi * NdotL + sky irradiance (approx) ; body reflectance 'body'
    Ebody=E*max(sunDir[1],0)/math.pi+skyIrr*0.9
    bodyc=body*Ebody
    col=bodyc*(1-F)+sky*F+gcol
    if verbose:
        print(f"h={hour} el={el:.1f} dep={dep_deg} mss={mss} | E={np.round(E,2)} F={F:.3f} sky(probe,whitened)={np.round(sky,3)} dome={np.round(dome,3)} body={np.round(bodyc,3)} glitterBRDF={g:.3f} gcol={np.round(gcol,3)}")
        print(f"   -> linear {np.round(col,3)}  sRGB {post(col)}   [no glitter: {post(bodyc*(1-F)+sky*F)}  glitter x4: {post(bodyc*(1-F)+sky*F+gcol*4)}]")
    return col

if __name__=='__main__':
    print("=== toward the sun, 250 m, various depressions (mss 0.02 = 3.5 m/s Cox-Munk unresolved) ===")
    for h in (10,14,16.5,17.5):
        for dep in (3,8,15,30,50):
            pixel(h,dep,0.02)
    print("=== 17:30, 10 deg off the sun azimuth ===")
    for dep in (3,8,15,30):
        pixel(17.5,dep,0.02,az_off_deg=10)
    print("=== 17:30 no whitening hack ===")
    for dep in (3,8,15,30):
        pixel(17.5,dep,0.02,whiten=False)
