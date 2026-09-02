#!/usr/bin/env python3
"""Continuous (n,k) Bernstein compression probe for pure-cubic B2=5."""
from __future__ import annotations
import argparse
import sympy as sp
from explore_rank4_three_halves_grouped import tensor_bernstein_fast,split_bernstein_midpoint
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients

T,K,U,V,Z,A=sp.symbols("T K U V Z A",nonnegative=True);VARS=(T,K,U,V,Z,A)
RAW=newton_coefficients(exact_decomposition())
def C(x,j):return sp.prod(x-i for i in range(j))/sp.factorial(j)
def balanced(total,count):u,v=divmod(total,count);return [u+1]*v+[u]*(count-v)
def numerator(expr):
    num,den=sp.fraction(sp.together(expr));mid={x:sp.Rational(1,2) for x in VARS}
    if den.subs(mid)<0:num,den=-num,-den
    _,dt=tensor_bernstein_fast(sp.expand(den),VARS)
    if min(dt.flat)<=0:raise ValueError("denominator box not positive")
    return sp.expand(num)
def build(r,t,rank,side,index):
    # Reciprocal compactification: T=0 gives n=38 and T=1 gives n=23.
    # This keeps the nested binomial/rank ratios at substantially lower
    # polynomial degree than the affine n=23+15T map.
    n=sp.Rational(874,1)/(23+15*T);k=-7+11*K;m=n-r-1;e=m-t;B2=5
    c2=C(n-1,2);c3=C(n-2,3)+B2;c4=C(n-3,4)+5*n-32+k
    kap=(n**3-8*n**2-19*n+302)/6
    c5lo=((n-7)*(n-8)*c4+kap*B2)/(5*(n-3));x=c3/c4
    c5hi=(1-(2+x)/10)*c4**2/c3;c5=c5lo+(c5hi-c5lo)*U
    g6lo=(25*c5-4*c4)/(39*c4);g6hi=(10*c5-c4)/(12*c4);g6=g6lo+(g6hi-g6lo)*V;c6=c5*g6
    g7lo=g6*(72*g6-9)/105;g7hi=g6*(12*g6-1)/14;g7=g7lo+(g7hi-g7lo)*Z;c7=c5*g7
    C4=C(m,4);scale=C(m-2,2);alo=C4-e*scale;ahi=C4-e*scale/3;a=alo+(ahi-alo)*A;E4=C4-a
    xs=balanced(t,r);single=sum(C(m-x-3,4) for x in xs)
    lower=[(m-7)*(m-8)*a/(5*(m-3)),C(m,5)-(m-4)*E4/3,c6-(n-6)*(c5-a)/6,sp.Integer(0)]
    upper=[(m-4)*a/5,c5-a,c5-a-single,c6]
    def uniq(vs):
        out=[]
        for z in vs:
            if not any(sp.simplify(z-w)==0 for w in out):out.append(z)
        return out
    lower=uniq(lower);upper=uniq(upper)
    if side=="lower":b=lower[index];cons=[b-z for j,z in enumerate(lower) if j!=index]+[z-b for z in upper]
    else:b=upper[index];cons=[z-b for j,z in enumerate(upper) if j!=index]+[b-z for z in lower]
    raw=RAW[rank]
    obj=raw.subs({c[0]:1,c[1]:n,c[2]:c2,c[3]:c3,c[4]:c4,c[5]:c5,c[6]:c6,c[7]:c7,h[5]:c5-a,h[6]:c6-b},simultaneous=True)
    return numerator(obj),[numerator(z) for z in cons if sp.simplify(z)!=0],len(lower),len(upper)
def certify(obj,cons,depthmax):
    _,ot=tensor_bernstein_fast(obj,VARS);cts=[tensor_bernstein_fast(z,VARS)[1] for z in cons]
    stack=[(ot,cts,(0,)*6)];nodes=0
    while stack:
        o,cs,d=stack.pop();nodes+=1
        if any(max(z.flat)<0 for z in cs):continue
        if min(o.flat)>=0:continue
        if sum(d)>=depthmax:return False,nodes,min(o.flat),d
        axis=min(range(6),key=lambda i:d[i]);ol,orr=split_bernstein_midpoint(o,axis);lc=[];rc=[]
        for z in cs:l,r=split_bernstein_midpoint(z,axis);lc.append(l);rc.append(r)
        nd=list(d);nd[axis]+=1;nd=tuple(nd);stack.extend([(orr,rc,nd),(ol,lc,nd)])
    return True,nodes,None,None
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--r",type=int,default=1);ap.add_argument("--t",type=int,default=1);ap.add_argument("--rank",type=int,default=0)
    ap.add_argument("--side",choices=["lower","upper"],default="lower");ap.add_argument("--index",type=int,default=1);ap.add_argument("--depth",type=int,default=60);a=ap.parse_args()
    obj,cons,nl,nu=build(a.r,a.t,a.rank,a.side,a.index);print("built",nl,nu,flush=True);print(certify(obj,cons,a.depth),flush=True)
if __name__=="__main__":main()
