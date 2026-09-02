#!/usr/bin/env python3
"""Explore exact Bernstein boxes for the conservative-cap max certificate."""

from __future__ import annotations

from time import perf_counter

from probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent import (
    bernstein_net, build, net_stats, subdivide,
)


AXES={"e":0,"u":1,"v":2,"r":3,"w":4}


def main():
    polys=build()[:2]
    roots=[bernstein_net(poly) for poly in polys]
    cache={"":roots}

    def node(path):
        if path in cache: return cache[path]
        parent=path[:-2]; axis=AXES[path[-2]]; side=int(path[-1])
        pn=node(parent)
        out=[]
        for shape,values in pn:
            out.append((shape,subdivide(shape,values,axis)[side]))
        cache[path]=out
        return out

    def stats(path):
        return tuple(net_stats(values) for _shape,values in node(path))

    targets=("", "v1", "v0", "v0v1", "v0v0v1", "v0v0v0e0", "v0v0v0e1")
    for path in targets:
        started=perf_counter(); print("NODE",path or "ROOT",stats(path),
                                     "seconds",perf_counter()-started,flush=True)
        if any(x[0]==0 for x in stats(path)): continue
        for label,axis in AXES.items():
            left=stats(path+label+"0"); right=stats(path+label+"1")
            score=(sum(min(a[0],b[0]) for a,b in (left,right)),
                   -sum(any(q[0]==0 for q in side) for side in (left,right)))
            print(" CAND",label,"L",left,"R",right,"score",score,flush=True)


if __name__=="__main__": main()
