#!/usr/bin/env python3
"""Greedy exact Bernstein max-cover probe on the middle v intervals."""

from __future__ import annotations

import argparse
import gc
from time import perf_counter

from flint import fmpq

import probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent as core


AXES=tuple(enumerate("euvrw"))


def stats(nets):
    return tuple(core.net_stats(values) for _shape,values in nets)


def iscovered(q): return any(x[0]==0 for x in q)


def parse_q(value):
    if value is None:
        return None
    if "/" in value:
        numerator,denominator=map(int,value.split("/"))
        return fmpq(numerator,denominator)
    return fmpq(int(value))


def main(which="upper",max_nodes=200,max_depth=14,start_path="",lower=None,upper=None):
    if lower is not None or upper is not None:
        if lower is None or upper is None:
            raise ValueError("both --lower and --upper are required")
        a,b=parse_q(lower),parse_q(upper)
    else:
        a,b=((fmpq(1,4),fmpq(3,8)) if which=="upper"
             else (fmpq(1,6),fmpq(1,4)))
    roots=[]
    for poly in core.build()[:2]:
        transformed=poly.compose(core.E,core.u,a+(b-a)*core.v,core.r,core.w)
        roots.append(core.bernstein_net(transformed))
    current=roots
    for offset in range(0,len(start_path),2):
        label=start_path[offset]; side=int(start_path[offset+1]); axis={b:a for a,b in AXES}[label]
        current=[(shape,core.subdivide(shape,values,axis)[side]) for shape,values in current]
    stack=[(start_path,len(start_path)//2,current)]; cert=[]; unresolved=[]; processed=0; start=perf_counter()
    while stack and processed<max_nodes:
        path,depth,nets=stack.pop(); processed+=1; q=stats(nets)
        if iscovered(q): cert.append((path,0 if q[0][0]==0 else 1,q)); continue
        if depth>=max_depth: unresolved.append((path,q)); continue
        best=None
        for axis,label in AXES:
            pairs=[core.subdivide(shape,values,axis) for shape,values in nets]
            kids=[]; covered_count=0; score=0
            for side in (0,1):
                child=[(nets[j][0],pairs[j][side]) for j in range(2)]
                cq=stats(child); covered_count+=iscovered(cq); score+=min(x[0] for x in cq)
                kids.append((path+label+str(side),depth+1,child,cq))
            rank=(-covered_count,score,axis)
            if best is None or rank<best[0]: best=(rank,kids,label)
        rank,kids,label=best
        kids.sort(key=lambda item:min(x[0] for x in item[3]),reverse=True)
        for cpath,cdepth,child,_cq in kids: stack.append((cpath,cdepth,child))
        if processed%5==0:
            print("PROGRESS",which,processed,"stack",len(stack),"cert",len(cert),
                  "unresolved",len(unresolved),"last",path,"split",label,"rank",rank,
                  "sec",perf_counter()-start,flush=True)
        gc.collect()
    print("FINAL",which,"processed",processed,"stack",len(stack),"cert",len(cert),
          "unresolved",len(unresolved),"sec",perf_counter()-start,flush=True)
    print("CERT",[(p,b,q[0][0],q[1][0]) for p,b,q in cert],flush=True)
    print("UNRES",unresolved[:20],flush=True)


if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("--which",choices=("upper","lower"),default="upper")
    ap.add_argument("--max-nodes",type=int,default=200); ap.add_argument("--max-depth",type=int,default=14)
    ap.add_argument("--start-path",default="")
    ap.add_argument("--lower"); ap.add_argument("--upper")
    a=ap.parse_args(); main(a.which,a.max_nodes,a.max_depth,a.start_path,a.lower,a.upper)
