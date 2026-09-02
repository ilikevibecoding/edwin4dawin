#!/usr/bin/env python3
"""Reconnaissance for all eight high Psi sums under componentwise deletion."""

import itertools
import numpy as np
import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import P,H,at,choose,interval_cells,unique_expressions


def generic_rows(index):
    t=sp.symbols('t');x=sp.symbols('x0:8');h=sp.symbols('h0:7');p=tuple(sp.expand(sum(sp.binomial(t,j)*at(x,k-j) for j in range(k+1))) for k in range(8));expr=unique_expressions(interval_cells(P,H))[index];twice=sp.expand(sp.expand_func((2*expr).subs({P[k]:p[k] for k in range(8)}).subs({H[k]:h[k] for k in range(7)}).subs({x[0]:1,h[0]:1})));degree=sp.degree(twice,t);rows=[sp.expand(sum((-1)**(r-j)*sp.binomial(r,j)*twice.subs(t,j) for j in range(r+1))) for r in range(degree+1)];return x,h,rows


def cone(index,sector):
    x,h,rows=generic_rows(index);N,A,B,Q=sp.symbols('N A B Q',nonnegative=True);a=N*A/2;b=B*N*(1-A);c=a+b;e=N-a;q=a+Q*N*(1-A)*(1-B);edges=N-c
    sub={x[1]:N,x[2]:choose(N,2)-edges,h[1]:e,h[2]:choose(e,2)-(edges-q)};h3lo=choose(e,3)-(edges-q)*(e-2);h3hi=choose(e,3);d4=choose(a,4)+e*choose(a,3)-q*choose(a-1,2);d5=choose(a,5)+e*choose(a,4)-q*choose(a-1,3)
    endpoint={8:{h[3]:h3lo},9:{h[3]:h3hi},10:{h[3]:h3hi},11:{h[3]:h3lo,h[4]:x[4]-d4},12:{h[3]:h3hi,h[4]:choose(e,4)},13:{h[3]:h3lo,h[4]:x[4]-d4,h[5]:x[5]-d5},14:{h[3]:h3lo,h[4]:x[4]-d4},15:{h[3]:h3lo,h[4]:x[4]-d4,h[5]:x[5]-d5}}[index]
    lowers=[sp.expand(row.subs(sub).subs(endpoint)) for row in rows];w,alpha=sp.symbols('w alpha',nonnegative=True);rho1=sp.factor(4*(choose(N,2)-edges)/N);maxrank=max(3,index-9) if False else None
    # Every target here uses x through rank index-dependent; use the full rank-5 cone and ignore unused tail ratios.
    rho5=2*(N-5)*w;excess=rho1-rho5-4
    if sector=='high':z=sp.symbols(f's{index}_high_z0:4',nonnegative=True);r4=rho5+1+excess*z[3];r3=r4+1+excess*z[2];r2=r3+1+excess*z[1];r1=r2+1+excess*z[0];cubes=(A,B,Q,w)
    else:z=sp.symbols(f's{index}_low_z0:3',nonnegative=True);r4=rho5+1+excess*z[2];r3=r4+1+excess*z[1];r2=r3+2-alpha+excess*z[0];r1=r2+alpha;cubes=(A,B,Q,w,alpha)
    prod=1;xs={}
    for rank,rho in zip(range(2,7),(r1,r2,r3,r4,rho5)):prod*=rho;xs[x[rank]]=N*prod/(2**(rank-1)*sp.factorial(rank))
    return N,cubes,z,[row.subs(xs) for row in lowers]


def main():
    rng=np.random.default_rng(993)
    for index in range(8,16):
      for sec in ('high','low'):
        N,c,z,rows=cone(index,sec)
        for ri,row in enumerate(rows):
          fails=[]
          for n in (13,40):
            for corner in itertools.product((0,1),repeat=len(c)):
              for j in range(len(z)):
                value=sp.factor(row.subs({N:n,**dict(zip(c,corner)),**{zz:int(i==j) for i,zz in enumerate(z)}}))
                if value<0:fails.append((n,corner,j,value))
          ev=sp.lambdify((N,*c,*z),row,modules='numpy');S=3000;cv=[rng.random(S) for _ in c];raw=rng.exponential(size=(len(z),S));zv=raw/raw.sum(axis=0);vals=np.asarray(ev(13,*cv,*zv),float);best=float(vals if vals.ndim==0 else vals.min());print('sum',index+1,sec,ri,'neg',len(fails),'best',best,flush=True)
          if fails:print('NEG',fails[:3],flush=True)

if __name__=='__main__':main()
