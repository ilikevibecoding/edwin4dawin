#!/usr/bin/env python3
"""Exact adaptive Bernstein probe for the pure-cubic B2=5 endpoint cone.

Initially a proof-construction probe.  A PASS is exact for the requested
cell/branch; a FAIL is only an unresolved Bernstein box unless it contains
an explicit negative feasible point.
"""
from __future__ import annotations
import argparse
from functools import lru_cache
from math import comb
import sympy as sp
from explore_rank4_three_halves_grouped import tensor_bernstein_fast,split_bernstein_midpoint
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients

U,V,Z,A=sp.symbols("U V Z A",nonnegative=True)
VARS=(U,V,Z,A)
RAW=newton_coefficients(exact_decomposition())
BVAR=sp.symbols("BVAR",real=True)

def normalized_numerator(expr):
    num,den=sp.fraction(sp.together(expr))
    mid={x:sp.Rational(1,2) for x in VARS}
    if den.subs(mid)<0:num,den=-num,-den
    _,dt=tensor_bernstein_fast(den,VARS)
    if min(dt.flat)<=0:raise ValueError("denominator not Bernstein-positive")
    return sp.expand(num)

def balanced_values(total,count):
    u,v=divmod(total,count)
    return [u+1]*v+[u]*(count-v)

@lru_cache(None)
def base_cell(n,p,q,r,rank,edge_e):
    m=n-r-1;B2=5;c2=sp.Integer(comb(n-1,2));c3=sp.Integer(comb(n-2,3)+B2)
    c4=sp.Integer(comb(n-3,4)+5*n-32+p-q)
    k=sp.Rational(n**3-8*n*n-19*n+302,6)
    c5lo=((n-7)*(n-8)*c4+k*B2)/(5*(n-3));x=c3/c4
    c5hi=(1-(2+x)/10)*c4*c4/c3;c5=c5lo+(c5hi-c5lo)*U
    # Ratio factorization removes artificial c5 denominators before any
    # expansion.  These formulas are algebraically identical to the V6/Q5
    # and V7/Q6 endpoints used previously.
    g6lo=(25*c5-4*c4)/(39*c4);g6hi=(10*c5-c4)/(12*c4)
    g6=g6lo+(g6hi-g6lo)*V;c6=c5*g6
    g7lo=g6*(72*g6-9)/105;g7hi=g6*(12*g6-1)/14
    g7=g7lo+(g7hi-g7lo)*Z;c7=c5*g7
    C4=sp.Integer(comb(m,4));edge_scale=sp.Integer(comb(m-2,2))
    # Map A directly to the exact fixed-e incidence interval
    # e*C(m-2,2)/3 <= E4 <= e*C(m-2,2).
    e4lo=max(sp.Integer(0),sp.Rational(edge_e,3)*edge_scale)
    e4hi=min(C4,sp.Integer(edge_e)*edge_scale)
    alo=C4-e4hi;ahi=C4-e4lo
    a=alo+(ahi-alo)*A;E4=C4-a
    lower=[]
    if m>=18:lower.append(sp.Rational((m-7)*(m-8),5*(m-3))*a)
    lower.extend([comb(m,5)-sp.Rational(m-4,3)*E4,
                  c6-sp.Rational(n-6,6)*(c5-a)])
    neighbor_mass=m-edge_e
    xs=balanced_values(neighbor_mass,r) if 0<=neighbor_mass<=2*r else []
    single=sum(comb(max(m-x-3,0),4) for x in xs) if xs else 0
    # a>0 throughout the fixed-e incidence interval, so the zero lower
    # candidate is strictly dominated by rho_J*a.  Also the refined
    # single-neighbor upper candidate dominates the literal c5-a bound.
    upper=[sp.Rational(m-4,5)*a,c5-a-single,c6]
    def unique(values):
        out=[]
        for value in values:
            if not any(sp.simplify(value-old)==0 for old in out):out.append(value)
        return out
    lower=unique(lower);upper=unique(upper)
    # Fixed-e feasibility: edge--bad-four incidence, cubic neighbor cap,
    # and the exact local contribution to B2.
    feasibility=[]
    if not xs:
        feasibility.append(sp.Integer(-1))
    else:
        feasibility.append(sp.Integer(B2-comb(r-1,2)-sum(comb(x,2) for x in xs)))
    raw=RAW[rank]
    objective=raw.subs({c[0]:1,c[1]:n,c[2]:c2,c[3]:c3,c[4]:c4,c[5]:c5,c[6]:c6,c[7]:c7,
        h[5]:c5-a,h[6]:c6-BVAR},simultaneous=True)
    return objective,tuple(lower),tuple(upper),tuple(feasibility)

@lru_cache(None)
def cell(n,p,q,r,rank,side,index,edge_e):
    template,lower,upper,feasibility=base_cell(n,p,q,r,rank,edge_e)
    if side=="lower":
        b=lower[index];constraints=[b-x for j,x in enumerate(lower) if j!=index]+[x-b for x in upper]
    else:
        b=upper[index];constraints=[x-b for j,x in enumerate(upper) if j!=index]+[b-x for x in lower]
    objective=template.subs(BVAR,b)
    constraints.extend(feasibility)
    return normalized_numerator(objective),[normalized_numerator(x) for x in constraints if sp.simplify(x)!=0],len(lower),len(upper)

def constraint_tensors(constraints):
    return [tensor_bernstein_fast(x,VARS)[1] for x in constraints]

def certify(objective,constraints,max_depth,precomputed_constraints=None):
    _,ot=tensor_bernstein_fast(objective,VARS)
    cts=precomputed_constraints if precomputed_constraints is not None else constraint_tensors(constraints)
    initial_bounds=tuple((sp.Rational(0),sp.Rational(1)) for _ in range(4))
    stack=[(ot,cts,(0,0,0,0),initial_bounds)];nodes=passed=discarded=0;worst=None
    while stack:
        obj,cons,depth,bounds=stack.pop();nodes+=1
        if any(max(t.flat)<0 for t in cons):discarded+=1;continue
        mn=min(obj.flat)
        if mn>=0:passed+=1;continue
        if sum(depth)>=max_depth:
            worst=(mn,depth,bounds);break
        axis=min(range(4),key=lambda i:depth[i])
        ol,orr=split_bernstein_midpoint(obj,axis);left=[];right=[]
        for t in cons:
            l,r=split_bernstein_midpoint(t,axis);left.append(l);right.append(r)
        nd=list(depth);nd[axis]+=1;nd=tuple(nd)
        lo,hi=bounds[axis];mid=(lo+hi)/2
        lb=list(bounds);rb=list(bounds);lb[axis]=(lo,mid);rb[axis]=(mid,hi)
        stack.append((orr,right,nd,tuple(rb)));stack.append((ol,left,nd,tuple(lb)))
    return {"status":"PASS" if worst is None else "UNRESOLVED","nodes":nodes,
        "passed":passed,"discarded":discarded,"worst":str(worst)}

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--n",type=int,default=23);ap.add_argument("--p",type=int,default=0)
    ap.add_argument("--q",type=int,default=7);ap.add_argument("--r",type=int,default=1);ap.add_argument("--rank",type=int,default=0)
    ap.add_argument("--side",choices=["lower","upper"]);ap.add_argument("--index",type=int);ap.add_argument("--depth",type=int,default=48);args=ap.parse_args()
    # J is a forest on m=n-r-1 vertices, hence 0<=e(J)<=m-1.
    for edge_e in range(args.n-args.r-1):
        neighbor_mass=args.n-args.r-1-edge_e
        if not 0<=neighbor_mass<=2*args.r:continue
        xs=balanced_values(neighbor_mass,args.r)
        if comb(args.r-1,2)+sum(comb(x,2) for x in xs)>5:continue
        _,_,nl,nu=cell(args.n,args.p,args.q,args.r,args.rank,"lower",0,edge_e)
        jobs=[]
        if args.side:jobs=[(args.side,args.index if args.index is not None else 0)]
        else:jobs=[("lower",i) for i in range(nl)]+[("upper",i) for i in range(nu)]
        for side,index in jobs:
            objective,constraints,_,_=cell(args.n,args.p,args.q,args.r,args.rank,side,index,edge_e)
            result=certify(objective,constraints,args.depth)
            print(args.n,args.p,args.q,args.r,args.rank,"e",edge_e,side,index,result,flush=True)
if __name__=="__main__":main()
