#!/usr/bin/env python3
"""Exact Bernstein probe for a fixed pure-cubic B2=5 b-endpoint branch."""
from __future__ import annotations
import argparse
from math import comb
import sympy as sp
from explore_rank4_three_halves_grouped import minimum_with_index,tensor_bernstein_fast
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients


def mapped(rank:int,n:int,r:int,k:int,side:str,candidate:int):
    U,V,Z,A=sp.symbols("U V Z A",nonnegative=True);box=(U,V,Z,A);nn=sp.Integer(n);rr=sp.Integer(r);m=n-r-1
    c2=sp.Integer(comb(n-1,2));c3=sp.Integer(comb(n-2,3)+5);c4=sp.Integer(comb(n-3,4)+5*n-32+k)
    kappa=sp.Rational(n**3-8*n*n-19*n+302,6)
    c5lo=sp.factor(((nn-7)*(nn-8)*c4+5*kappa)/(5*(nn-3)))
    x=c3/c4;d4lo=(2+x)/10;c5hi=sp.factor((1-d4lo)*c4*c4/c3);c5=sp.factor(c5lo+(c5hi-c5lo)*U)
    c6lo=sp.factor((25*c5*c5-4*c4*c5)/(39*c4));d5lo=(2+c4/c5)/12;c6hi=sp.factor((1-d5lo)*c5*c5/c4);c6=sp.factor(c6lo+(c6hi-c6lo)*V)
    c7lo=sp.factor((72*c6*c6-9*c5*c6)/(105*c5));d6lo=(2+c5/c6)/14;c7hi=sp.factor((1-d6lo)*c6*c6/c5);c7=sp.factor(c7lo+(c7hi-c7lo)*Z)
    acap=sp.Integer(comb(m,4));a=A*acap;adef=acap-a;c5j=sp.Integer(comb(m,5));rho=sp.Rational((m-7)*(m-8),5*(m-3)) if m>=18 else sp.Integer(0);hi=sp.Rational(max(m-4,0),5);hcap=sp.Rational(n-6,6)
    lower=(rho*a,c5j-sp.Rational(m-4,3)*adef,c6-hcap*(c5-a),sp.Integer(0))
    upper=(hi*a,c5j-sp.Rational(m-4,5)*adef,c5-a,c6)
    candidates=lower if side=="lower" else upper
    b=candidates[candidate] if candidate<4 else sum(candidates)/4
    raw=newton_coefficients(exact_decomposition())[rank]
    value=raw.subs({c[0]:1,c[1]:nn,c[2]:c2,c[3]:c3,c[4]:c4,c[5]:c5,c[6]:c6,c[7]:c7,h[5]:c5-a,h[6]:c6-b},simultaneous=True)
    num,den=sp.fraction(sp.cancel(value));mid={x:sp.Rational(1,2) for x in box}
    if den.subs(mid)<0:num,den=-num,-den
    assert den.subs(mid)>0
    return sp.expand(num),sp.expand(den),box


def main()->None:
    ap=argparse.ArgumentParser();ap.add_argument("--rank",type=int,required=True);ap.add_argument("--n",type=int,required=True);ap.add_argument("--r",type=int,required=True);ap.add_argument("--k",type=int,required=True);ap.add_argument("--side",choices=("lower","upper"),required=True);ap.add_argument("--candidate",type=int,choices=range(5),required=True);a=ap.parse_args()
    num,den,box=mapped(a.rank,a.n,a.r,a.k,a.side,a.candidate)
    dd,dc=tensor_bernstein_fast(den,box);dmin,di=minimum_with_index(dc);assert dmin>0,(dd,dmin,di)
    nd,nc=tensor_bernstein_fast(num,box);nmin,ni=minimum_with_index(nc)
    print("branch",a.rank,a.n,a.r,a.k,a.side,a.candidate,"degrees",nd,"size",nc.size,"min",nmin,"index",ni,flush=True)
    if nmin<0:raise SystemExit(1)
    print("PASS_EXACT_PURE_CUBIC_ENDPOINT_BRANCH",flush=True)


if __name__=="__main__":main()
