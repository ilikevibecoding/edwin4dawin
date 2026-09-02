#!/usr/bin/env python3
"""Greedy exact-Bernstein max cover probe on the two integer tail cones."""

from __future__ import annotations

import argparse
import gc
from time import perf_counter

from probe_terminal_q3_m1_forest_j3_two_cones_flint_independent_agent import (
    build, nstats, partial_bernstein, subdivide,
)


AXES=((2,"u"),(3,"r"),(4,"w"))


def covered(nets):
    stats=tuple(nstats(values) for shape,values in nets)
    return any(q[0]==0 for q in stats),stats


def main(cone="D", max_nodes=200, max_depth=14):
    shifts=(0,13) if cone.upper()=="D" else (13,0)
    roots=[partial_bernstein(p) for p in build(*shifts)]
    stack=[("",0,roots)]
    certificates=[]; unresolved=[]; processed=0
    started=perf_counter()
    while stack and processed<max_nodes:
        path,depth,nets=stack.pop(); processed+=1
        ok,stats=covered(nets)
        if ok:
            certificates.append((path,0 if stats[0][0]==0 else 1,stats))
            continue
        if depth>=max_depth:
            unresolved.append((path,depth,stats)); continue
        best=None
        for axis,label in AXES:
            pairs=[subdivide(shape,values,axis) for shape,values in nets]
            kids=[]; immediate=0; score=0
            for side in (0,1):
                child=[(nets[j][0],pairs[j][side]) for j in range(2)]
                cok,cstats=covered(child)
                immediate+=cok
                score+=min(q[0] for q in cstats)
                kids.append((path+label+str(side),depth+1,child,cstats))
            rank=(-immediate,score,axis)
            if best is None or rank<best[0]: best=(rank,kids,label)
            else: del kids
        rank,kids,label=best
        # Depth first: process the apparently easier child first.
        kids.sort(key=lambda item:min(q[0] for q in item[3]),reverse=True)
        for cpath,cdepth,child,_stats in kids: stack.append((cpath,cdepth,child))
        if processed%10==0:
            print("PROGRESS",cone,processed,"stack",len(stack),"cert",len(certificates),
                  "unresolved",len(unresolved),"last",path,"split",label,"rank",rank,
                  "seconds",perf_counter()-started,flush=True)
        gc.collect()
    print("FINAL",cone,"processed",processed,"stack",len(stack),"cert",len(certificates),
          "unresolved",len(unresolved),"seconds",perf_counter()-started,flush=True)
    print("CERTS",[(p,b,s[0][0],s[1][0]) for p,b,s in certificates[:30]],flush=True)
    print("UNRESOLVED",unresolved[:20],flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("--cone",default="D")
    parser.add_argument("--max-nodes",type=int,default=200)
    parser.add_argument("--max-depth",type=int,default=14)
    args=parser.parse_args(); main(args.cone,args.max_nodes,args.max_depth)
