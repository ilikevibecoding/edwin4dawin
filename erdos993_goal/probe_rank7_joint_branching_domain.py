#!/usr/bin/env python3
"""Numerical scouting for the joint (core,H,J) terminal-broom domain.

Not a proof.  It retains the exact core scale c3=C(n-2,3)+B2 and sets
h5=c5-a, h6=c6-b with 0<=a<=C(m,4) and b/a at a forest-ratio endpoint.
"""
from __future__ import annotations
import argparse
from functools import lru_cache
from math import comb
import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients
from verify_rank7_terminal_broom_middle_differences import D4_CEILING

def balanced_binomial(total,count,rank):
    """Piecewise-linear interpolation of min sum C(x_i,rank)."""
    def integer_value(s):
        u,v=divmod(max(s,0),count)
        return (count-v)*comb(u,rank)+v*comb(u+1,rank)
    low=int(np.floor(max(total,0.0)));frac=max(total,0.0)-low
    return (1-frac)*integer_value(low)+frac*integer_value(low+1)

def balanced_decreasing_residual(total,count,m):
    """Piecewise-linear min of sum C(m-x_i-3,4)."""
    def term(x): return comb(max(m-x-3,0),4)
    def integer_value(s):
        u,v=divmod(max(s,0),count)
        return (count-v)*term(u)+v*term(u+1)
    low=int(np.floor(max(total,0.0)));frac=max(total,0.0)-low
    return (1-frac)*integer_value(low)+frac*integer_value(low+1)

@lru_cache(None)
def degree_b3_table(n):
    """Exact minimum sum C(x,3) at each feasible B2, sum x=n-2."""
    table={}
    def visit(rem,cap,b2,b3):
        if rem==0:
            table[b2]=min(table.get(b2,10**18),b3);return
        for x in range(min(rem,cap),0,-1):
            visit(rem-x,x,b2+comb(x,2),b3+comb(x,3))
    visit(n-2,n-2,0,0)
    return table

@lru_cache(None)
def degree_c4_lower_table(n):
    """Exact c4 lower endpoint from E<=M(n-2-M), by degree partition."""
    statistic={}
    def visit(rem,cap,b2,b3,maximum):
        if rem==0:
            value=b3+maximum*(n-2-maximum)
            statistic[b2]=max(statistic.get(b2,-1),value);return
        for x in range(min(rem,cap),0,-1):
            visit(rem-x,x,b2+comb(x,2),b3+comb(x,3),max(maximum,x))
    visit(n-2,n-2,0,0,0)
    return {b2:comb(n-3,4)+(n-5)*b2+(n-3)-value
            for b2,value in statistic.items()}

def expression(rank):
    raw=newton_coefficients(exact_decomposition())[rank]
    args=sp.symbols("c3 c4 c5 c6 c7 a b", real=True)
    value=raw.subs({c[0]:1,c[1]:sp.Symbol("nn"),c[2]:sp.Symbol("c2"),c[3]:args[0],c[4]:args[1],c[5]:args[2],c[6]:args[3],c[7]:args[4],h[5]:args[2]-args[5],h[6]:args[3]-args[6]},simultaneous=True)
    return sp.lambdify((sp.Symbol("nn"),sp.Symbol("c2"),*args),value,"numpy")

def evaluate(fn,n,r,endpoint,v):
    B,X,U,V,Z,A=v;m=n-r-1
    bmin=max(4,comb(max(r-1,0),2));bmax=comb(max(r-1,0),2)+comb(max(n-r-1,0),2)
    B2=bmin+(bmax-bmin)*B;c3=comb(n-2,3)+B2;c2=comb(n-1,2);w=c2/c3
    xlo=8*w/(6-w);xhi=4*w/(3*(1-w));x=xlo+(xhi-xlo)*X
    c4=c3/x
    rounded_B2=round(B2)
    if abs(B2-rounded_B2)<1e-7:
        c4_floor=degree_c4_lower_table(n).get(rounded_B2)
        if c4_floor is None:return 1e100+1
        if c4+1e-8<c4_floor:return 1e100+(c4_floor-c4)
    # Quantitative rank-(4,5) path surplus, Theorem (15).
    kappa=(n**3-8*n*n-19*n+302)/6
    c5lo=((n-7)*(n-8)*c4+kappa*B2)/(5*(n-3))
    # Stronger joint c5/c4/degree-moment lower bound.  This branch is
    # available at the integer B2 levels relevant to actual trees.
    if abs(B2-rounded_B2)<1e-7:
        table=degree_b3_table(n)
        if rounded_B2 not in table:return 1e100+1
        gamma_floor=table[rounded_B2]
        ccoef=4*n*n-30*n+34
        joint_margin=(-2.5*(n-6)*(n-3)**2*B2
                      +10*(n-3)*gamma_floor
                      -ccoef*(comb(n-3,4)-c4))
        joint_c5lo=((n-7)*(n-8)*c4+joint_margin)/(5*(n-3))
        c5lo=max(c5lo,joint_c5lo)
    d4lo=(2+x)/10;c5hi=(1-d4lo)*c4*c4/c3
    if c5lo>c5hi:return 1e100+(c5lo-c5hi)
    c5=c5lo+(c5hi-c5lo)*U
    # V6 lower endpoint and Q5 upper endpoint.
    c6lo=(25*c5*c5-4*c4*c5)/(39*c4)
    y=c4/c5;d5lo=(2+y)/12;c6hi=(1-d5lo)*c5*c5/c4
    if c6lo>c6hi:return 1e100+(c6lo-c6hi)
    c6=c6lo+(c6hi-c6lo)*V
    # V7 lower endpoint and Q6 upper endpoint.
    c7lo=(72*c6*c6-9*c5*c6)/(105*c5)
    z=c5/c6;d6lo=(2+z)/14;c7hi=(1-d6lo)*c6*c6/c5
    if c7lo>c7hi:return 1e100+(c7lo-c7hi)
    c7=c7lo+(c7hi-c7lo)*Z
    acap=comb(max(m,0),4);a=A*acap
    # Joint branching/edge feasibility.  If e=e(J), then edge--bad-4-set
    # incidence gives e*C(m-2,2)<=3(C(m,4)-a).  Writing
    # x_u=deg_A(u)-1 for u in N(q), sum x_u=m-e, and convexity gives
    # B2(A)>=C(r-1,2)+sum C(x_u,2).  The continuous relaxation below is
    # necessary (the exact replay retains the balanced integer function).
    adef=acap-a
    edge_den=comb(max(m-2,0),2)
    e_upper=min(max(m-1,0),3*adef/edge_den) if edge_den else 0.0
    e_lower=max(0.0,adef/edge_den) if edge_den else 0.0
    split_mass=max(0.0,m-e_upper)
    balanced=max(0.0,split_mass*(split_mass-r)/(2*r))
    if B2+1e-8 < comb(max(r-1,0),2)+balanced:
        return 1e100+(comb(max(r-1,0),2)+balanced-B2)
    # Exact c4 moment identity plus the rooted B3+E lower bound.
    b3e_lower=(comb(max(r-1,0),3)
               +balanced_binomial(split_mass,r,3)
               +(r-1)*split_mass)
    rounded_B2=round(B2)
    if abs(B2-rounded_B2)<1e-7:
        table=degree_b3_table(n)
        if rounded_B2 not in table:return 1e100+1
        # Global degree-moment floor plus the forced q--neighbor E terms.
        b3e_lower=max(b3e_lower,table[rounded_B2]+(r-1)*split_mass)
    c4_structural_upper=(comb(n-3,4)+(n-5)*B2+(n-3)-b3e_lower)
    if c4>c4_structural_upper+1e-8:
        return 1e100+(c4-c4_structural_upper)
    lo=((m-7)*(m-8)/(5*(m-3))) if m>=18 else 0.0;hi=max(m-4,0)/5
    # Joint absolute defect double count: for a bad 5-set, between three
    # and five of its 4-subsets remain bad.
    c5j=comb(max(m,0),5)
    defect_lo=c5j-max(m-4,0)*adef/3
    defect_hi=c5j-max(m-4,0)*adef/5
    # H=A-q supplies only the ordinary extension ceiling here.  Do not
    # shift the proved forest rank-(4,5) ratio to h6/h5: that statement is
    # false (for example H=P9 disjoint union P9).
    h5=c5-a;upper_h=(n-6)/6
    lower=max(lo*a,defect_lo,c6-upper_h*h5,0.0)
    # Literal containment J induced in H=A-q also gives i5(J)<=i5(H).
    # Exact H decomposition: the single-neighbor classes contribute
    # sum_u i4(J-N_H(u)); path coefficient minimality gives the displayed
    # balanced residual lower bound.  We use the weakest allowed e here.
    split_mass_max=max(0.0,m-e_lower)
    single_neighbor=balanced_decreasing_residual(split_mass_max,r,m)
    upper=min(hi*a,defect_hi,c5-a-single_neighbor,c6)
    if lower>upper:return 1e100+(lower-upper)
    b=lower if endpoint==0 else upper
    return float(fn(n,c2,c3,c4,c5,c6,c7,a,b))

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--rank",type=int,default=0);ap.add_argument("--n",type=int,default=23);ap.add_argument("--roots",type=int,nargs="*");ap.add_argument("--fixed-b2",type=int);ap.add_argument("--maxiter",type=int,default=700);ap.add_argument("--popsize",type=int,default=18);a=ap.parse_args();fn=expression(a.rank)
    roots=a.roots or list(range(1,min(a.n-1,10)+1))
    for r in roots:
        bmin=max(4,comb(max(r-1,0),2));bmax=comb(max(a.n-r-1,0),2)+comb(max(r-1,0),2)
        if bmin>bmax:continue
        if a.fixed_b2 is not None and not bmin<=a.fixed_b2<=bmax:continue
        bbound=(0,1) if a.fixed_b2 is None else ((a.fixed_b2-bmin)/(bmax-bmin),)*2
        for endpoint in (0,1):
            res=differential_evolution(lambda v:evaluate(fn,a.n,r,endpoint,v),[bbound]+[(0,1)]*5,tol=1e-9,popsize=a.popsize,maxiter=a.maxiter,polish=True,seed=993+r+endpoint)
            print("rank",a.rank,"n",a.n,"r",r,"b_range",bmin,bmax,"endpoint",endpoint,"minimum",res.fun,"point",res.x,flush=True)
if __name__=="__main__":main()
