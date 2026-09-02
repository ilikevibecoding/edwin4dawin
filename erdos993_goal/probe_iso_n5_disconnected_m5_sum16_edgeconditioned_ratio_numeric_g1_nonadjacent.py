#!/usr/bin/env python3
"""Random interior search in the edge-conditioned sum16 ratio relaxation."""

import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_edgeconditioned_ratio_v2_g1_nonadjacent import cone_expression


def scan(mode, seed=993, samples=400000):
    n,z,cubes,expression=cone_expression(mode)
    evaluator=sp.lambdify((n,*cubes,*z),expression,modules="numpy")
    rng=np.random.default_rng(seed+(mode=="low"))
    best=None
    for N in (13,20,40,100,1000):
        cube_values=[rng.random(samples) for _ in cubes]
        zraw=rng.exponential(size=(len(z),samples))
        zvalues=zraw/zraw.sum(axis=0)
        values=np.asarray(evaluator(N,*cube_values,*zvalues),dtype=float)
        index=int(np.argmin(values));value=float(values[index])
        point=(N,tuple(float(row[index]) for row in cube_values),tuple(float(row[index]) for row in zvalues),value)
        if best is None or value<best[-1]:best=point
        print(mode,point,flush=True)
    print(mode,"BEST",best,flush=True)


if __name__=="__main__":
    scan("high")
    scan("low")
