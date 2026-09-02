#!/usr/bin/env python3
"""Smaller N,r parameterization of the general active-root sum16 cone."""

import itertools
import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import generic_newton_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def cone(sector):
    x,h,rows=generic_newton_rows();N,R,Q=sp.symbols("N R Q",nonnegative=True)
    r=R/2;a=N*r;e=N-a;q=a+Q*(e-a)
    sub={x[1]:N,x[2]:choose(N,2)-e,h[1]:e,h[2]:choose(e,2)-(e-q)}
    h3=choose(e,3)-(e-q)*(e-2)
    d4=choose(a,4)+e*choose(a,3)-q*choose(a-1,2)
    d5=choose(a,5)+e*choose(a,4)-q*choose(a-1,3)
    lowers=[sp.expand(row.subs(sub).subs({h[3]:h3,h[4]:x[4]-d4,h[5]:x[5]-d5})) for row in rows]
    w,alpha=sp.symbols("w alpha",nonnegative=True);rho1=sp.factor(4*(choose(N,2)-e)/N);rho5=2*(N-5)*w;excess=rho1-rho5-4
    if sector=="high":
        z=sp.symbols("high_z0:4",nonnegative=True);r4=rho5+1+excess*z[3];r3=r4+1+excess*z[2];r2=r3+1+excess*z[1];r1=r2+1+excess*z[0];cubes=(R,Q,w)
    else:
        z=sp.symbols("low_z0:3",nonnegative=True);r4=rho5+1+excess*z[2];r3=r4+1+excess*z[1];r2=r3+2-alpha+excess*z[0];r1=r2+alpha;cubes=(R,Q,w,alpha)
    product=1;xs={}
    for rank,rho in zip(range(2,7),(r1,r2,r3,r4,rho5)):
        product*=rho;xs[x[rank]]=N*product/(2**(rank-1)*sp.factorial(rank))
    return N,cubes,z,[row.subs(xs) for row in lowers]


def main():
    rng=np.random.default_rng(993)
    for sec in ('high','low'):
        N,c,z,rows=cone(sec)
        for ri,row in enumerate(rows):
            fails=[]
            for n in (13,20,40,100):
                for corner in itertools.product((0,1),repeat=len(c)):
                    for j in range(len(z)):
                        v=sp.factor(row.subs({N:n,**dict(zip(c,corner)),**{zz:int(i==j) for i,zz in enumerate(z)}}))
                        if v<0:fails.append((n,corner,j,v))
            ev=sp.lambdify((N,*c,*z),row,modules='numpy');best=None;S=30000
            for n in (13,20,40,100):
                cv=[rng.random(S) for _ in c];raw=rng.exponential(size=(len(z),S));zv=raw/raw.sum(axis=0);vals=np.asarray(ev(n,*cv,*zv),float)
                if vals.ndim==0: vals=np.full(S,float(vals))
                i=int(vals.argmin());p=(float(vals[i]),n,tuple(float(v[i]) for v in cv));best=p if best is None or p<best else best
            print(sec,ri,'corner_neg',len(fails),'best',best,flush=True)
            for f in fails[:5]:print('NEG',f,flush=True)

if __name__=='__main__':main()
