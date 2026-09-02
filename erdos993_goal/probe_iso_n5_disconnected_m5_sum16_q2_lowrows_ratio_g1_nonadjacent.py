#!/usr/bin/env python3
"""Probe X-ratio/H-edge bounds for q=2 Newton rows 0,1,2."""

import itertools
import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import generic_newton_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def lower_rows(mode):
    x,h,rows=generic_newton_rows();e=sp.symbols("e",nonnegative=True)
    N=e+(2 if mode=="distinct" else 1)
    sub={x[1]:N,x[2]:choose(N,2)-e,h[1]:e,h[2]:choose(e,2)-(e-2)}
    h3_lower=choose(e,3)-(e-2)*choose(e-2,1)
    result=[]
    for index in range(3):
        expression=sp.expand(rows[index].subs(sub))
        # The coefficient is symbolic in e and x3.  Positivity is checked on
        # the actual large-order domain by the theorem wrapper; this probe is
        # deliberately allowed to expose a relaxation failure first.
        # H is an induced vertex-deletion subforest of P0, so h_k<=x_k.
        # This is the first actual P0/H coupling retained by the probe.
        expression=expression.subs({h[3]:h3_lower,h[4]:x[4],h[5]:x[5]})
        result.append(sp.expand(expression))
    return e,N,x,result


def cone(mode,sector):
    e,N,x,rows=lower_rows(mode);w,alpha=sp.symbols("w alpha",nonnegative=True)
    rho1=sp.factor(4*(choose(N,2)-e)/N)
    rho5=2*(N-5)*w;excess=rho1-rho5-4
    if sector=="high":
        z=sp.symbols(f"{mode}_high_z0:4",nonnegative=True)
        r4=rho5+1+excess*z[3];r3=r4+1+excess*z[2];r2=r3+1+excess*z[1];r1=r2+1+excess*z[0];cubes=(w,)
    else:
        z=sp.symbols(f"{mode}_low_z0:3",nonnegative=True)
        r4=rho5+1+excess*z[2];r3=r4+1+excess*z[1];r2=r3+2-alpha+excess*z[0];r1=r2+alpha;cubes=(w,alpha)
    product=1;sub={}
    for rank,rho in zip(range(2,7),(r1,r2,r3,r4,rho5)):
        product*=rho;sub[x[rank]]=N*product/(2**(rank-1)*sp.factorial(rank))
    return e,z,cubes,[row.subs(sub) for row in rows]


def probe(mode,sector):
    e,z,cubes,rows=cone(mode,sector);rng=np.random.default_rng(993+len(mode)+len(sector))
    for index,row in enumerate(rows):
        failures=[]
        for E in (13,20,40,100):
            for corner in itertools.product((0,1),repeat=len(cubes)):
                for chosen in range(len(z)):
                    value=sp.factor(row.subs({e:E,**dict(zip(cubes,corner)),**{v:int(i==chosen) for i,v in enumerate(z)}}))
                    if value<0:failures.append((E,corner,chosen,value))
        evaluator=sp.lambdify((e,*cubes,*z),row,modules="numpy");best=None;samples=200000
        for E in (13,20,40,100):
            cv=[rng.random(samples) for _ in cubes];raw=rng.exponential(size=(len(z),samples));zv=raw/raw.sum(axis=0);values=np.asarray(evaluator(E,*cv,*zv),dtype=float);i=int(np.argmin(values));point=(float(values[i]),E,tuple(float(v[i]) for v in cv),tuple(float(v[i]) for v in zv));best=point if best is None or point<best else best
        print(mode,sector,index,"corner_neg",len(failures),"best",best,flush=True)
        for failure in failures[:10]:print("NEG",failure,flush=True)


if __name__=="__main__":
    for mode in ("distinct","shared"):
        for sector in ("high","low"):probe(mode,sector)
