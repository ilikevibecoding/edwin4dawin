#!/usr/bin/env python3
"""Adaptive exact max cover using path and component h4 tangent floors."""

from __future__ import annotations

import argparse
import gc
from time import perf_counter

import probe_terminal_q3_m1_forest_j3_ratio_bands_independent_agent as band
import probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent as core


AXES=tuple(enumerate("xturw"))


def frac(text):
    a,b=map(int,text.split("/")); return a,b


def qstats(nets):
    return tuple(core.net_stats(values) for _shape,values in nets)


def covered(q):
    return any(row[0] == 0 for row in q)


def main(lo,hi,shift,max_nodes,max_depth,start_path,include_coupled):
    ln,ld=frac(lo); hn,hd=frac(hi)
    roots=[]
    if include_coupled:
        coupled=band.build(ln,ld,hn,hd,shift,"pair","path",True)[0]
        roots.append(band.one_unbounded_net(coupled))
    for mode in ("path","component"):
        poly=band.build(ln,ld,hn,hd,shift,"pair",mode,True)[1]
        roots.append(band.one_unbounded_net(poly))
    current=roots; amap={label:axis for axis,label in AXES}
    for offset in range(0,len(start_path),2):
        axis=amap[start_path[offset]]; side=int(start_path[offset+1])
        current=[(shape,core.subdivide(shape,values,axis)[side])
                 for shape,values in current]
    stack=[(start_path,len(start_path)//2,current)]; cert=[]; unresolved=[]
    processed=0; begin=perf_counter()
    while stack and processed<max_nodes:
        path,depth,nets=stack.pop(); processed+=1; q=qstats(nets)
        if covered(q):
            cert.append((path,next(index for index,row in enumerate(q) if row[0]==0),q)); continue
        if depth>=max_depth:
            unresolved.append((path,q)); continue
        best=None
        for axis,label in AXES:
            pairs=[core.subdivide(shape,values,axis) for shape,values in nets]
            children=[]; count=0; score=0
            for side in (0,1):
                child=[(nets[j][0],pairs[j][side]) for j in range(2)]
                cq=qstats(child); count+=covered(cq); score+=min(row[0] for row in cq)
                children.append((path+label+str(side),depth+1,child,cq))
            rank=(-count,score,axis)
            if best is None or rank<best[0]: best=(rank,children,label)
        rank,children,label=best
        children.sort(key=lambda item:min(row[0] for row in item[3]),reverse=True)
        for cpath,cdepth,child,_cq in children: stack.append((cpath,cdepth,child))
        if processed%5==0:
            print("PROGRESS",processed,"stack",len(stack),"cert",len(cert),
                  "unresolved",len(unresolved),"last",path,"split",label,"rank",rank,
                  "seconds",perf_counter()-begin,flush=True)
        gc.collect()
    print("FINAL",lo,hi,"shift",shift,"processed",processed,"stack",len(stack),
          "cert",len(cert),"unresolved",len(unresolved),"seconds",perf_counter()-begin,flush=True)
    print("CERT",[(p,b,q[0][0],q[1][0]) for p,b,q in cert],flush=True)
    print("UNRES",unresolved,flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("--lo",required=True); ap.add_argument("--hi",required=True)
    ap.add_argument("--shift",type=int,required=True); ap.add_argument("--max-nodes",type=int,default=200)
    ap.add_argument("--max-depth",type=int,default=16); ap.add_argument("--start-path",default="")
    ap.add_argument("--include-coupled",action="store_true")
    a=ap.parse_args(); main(a.lo,a.hi,a.shift,a.max_nodes,a.max_depth,a.start_path,a.include_coupled)
