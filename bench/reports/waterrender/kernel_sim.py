# 1D simulation of the r8 scatter kernel along the image vertical: a tower (share s_t, colour 1) over sky.
import numpy as np
H = 360
def pyramid(a, levels=7):
    out=[a.astype(float)]
    for i in range(1, levels):
        prev=out[-1]
        # gaussian 3-tap [0.25 .5 .25] then decimate by 2 (approx of the shader's 3x3 tent)
        p=np.pad(prev,1,mode='edge'); g=0.25*p[:-2]+0.5*p[1:-1]+0.25*p[2:]
        out.append(g[::2])
    return out
def sample(pyr, y, lod):
    # trilinear-ish: bilinear within level, blend between levels
    lod=max(0,min(lod,len(pyr)-1)); l0=int(np.floor(lod)); l1=min(l0+1,len(pyr)-1); f=lod-l0
    def lin(a, yy):
        n=len(a); t=yy/H*n-0.5; i0=int(np.floor(t)); fr=t-i0; i0c=min(max(i0,0),n-1); i1c=min(max(i0+1,0),n-1)
        return a[i0c]*(1-fr)+a[i1c]*fr
    return lin(pyr[l0],y)*(1-f)+lin(pyr[l1],y)*f
def run(share_t, tower=(150,210), unit=65.0, vy=0.35, tune=1.0):
    col=np.zeros(H); alpha=np.zeros(H); sh=np.zeros(H)
    col[tower[0]:tower[1]]=1; alpha[tower[0]:tower[1]]=1; sh[tower[0]:tower[1]]=share_t
    pc=pyramid(col); pa=pyramid(alpha); ps=pyramid(sh)
    top=len(pc)-1
    out=np.zeros(H)
    for y in range(H):
        topA=sample(pa,y,top)
        if topA<=0.0005: continue
        shareL=min(1.5*sample(ps,y,top)/topA,1.0)
        sigL=unit*shareL; stepT=max(0.25*sigL,1.0); nT=min(max(np.ceil(1.5*sigL/stepT),1),6)
        lodS=max(0,min(np.log2(stepT),top))
        c=0
        for i in range(-6,7):
            if abs(i)>nT: continue
            yi=y+i*stepT
            sa_a=sample(pa,yi,lodS); sa_r=sample(ps,yi,lodS)
            if sa_a<1e-4: continue
            sig=max(unit*sa_r/sa_a, max(0.6*stepT,0.5))
            yy=i*stepT/sig; w=0.3989*stepT/sig*np.exp(-0.5*yy*yy)
            lod=max(0,min(np.log2(max(sig*vy,0.5*stepT)),top))
            c+=sample(pc,yi,lod)*w
        out[y]=c
    return out
for s in [0.0, 0.05, 0.3, 0.8]:
    o=run(s)
    # report: total energy (should be ~60 texels worth = tower height), profile smoothness (max jump), extent
    nz=np.where(o>0.01)[0]
    jumps=np.abs(np.diff(o)).max()
    print(f"share {s}: energy {o.sum():.1f} (tower 60), extent {nz.min() if len(nz) else -1}-{nz.max() if len(nz) else -1}, peak {o.max():.3f}, max step {jumps:.3f}")
    if s==0.3:
        prof=' '.join(f"{v:.2f}" for v in o[100:260:6]); print("  profile y100..260 step 6:", prof)
