#!/usr/bin/env python3
"""Probe the exact componentwise cone for the endpoint two-star merge gap.

For two nontrivial u-side stars of leaf degrees a,b, concentration replaces
F_a F_b by F_{a+b} F_0.  In the no-other-nontrivial-star environment the
residual difference is a*b*Q/12.  This script checks Q after the exact
componentwise order/edge/deletion substitutions for the remaining rooted
forest pair, using only the safe ceiling x3 <= C(N,3).
"""
from __future__ import annotations

import sympy as sp
import itertools

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import (
    at, block, n4_deleted,
)
from prove_iso_n5_g1_singleton_endpoint_u_one_star_adjacent_all_order_g1_nonadjacent import (
    add, conv, isolate, shift,
)
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


def merge_quotient():
    a,b,k,s,n,m,x2,x3,h2=sp.symbols("a b k s n m x2 x3 h2", nonnegative=True)
    Q=(
        4*a**3+7*a**2*b+28*a**2*k+28*a**2*s+28*a**2*n-7*a**2
        +7*a*b**2+51*a*b*k+51*a*b*s+51*a*b*n+12*a*b
        +54*a*m+54*a*k**2+108*a*k*s+108*a*k*n+39*a*k
        +54*a*s**2+108*a*s*n-9*a*s+54*a*n**2-9*a*n-77*a
        +4*b**3+28*b**2*k+28*b**2*s+28*b**2*n-7*b**2
        +54*b*m+54*b*k**2+108*b*k*s+108*b*k*n+39*b*k
        +54*b*s**2+108*b*s*n-9*b*s+54*b*n**2-9*b*n-77*b
        +84*m*k+120*m*s+120*m*n-36*h2
        +30*k**3+90*k**2*s+90*k**2*n+54*k**2
        +90*k*s**2+180*k*s*n+12*k*s+84*k*n**2+18*k*n+12*k*x2-161*k
        +30*s**3+90*s**2*n-54*s**2+84*s*n**2-102*s*n+12*s*x2-185*s
        +84*n*x2-209*n-96*x2-72*x3-298
    )
    return (a,b,k,s,n,m,x2,x3,h2),sp.expand(Q)


def componentwise_lower_bound(Nshift=2):
    vars,Q=merge_quotient();a,b,k,s,n,m,x2,x3,h2=vars
    da,db,t,A,B,R=sp.symbols("da db t A B R", nonnegative=True)
    N=t+Nshift
    active=N*A/2
    inactive_components=B*N*(1-A)
    components=active+inactive_components
    edges=N-components
    deleted_edges=active+R*N*(1-A)*(1-B)
    remaining=N-active
    sub={
        a:1+da,
        b:1+db,
        n:N,
        m:remaining,
        x2:choose(N,2)-edges,
        x3:choose(N,3),
        h2:choose(remaining,2)-(edges-deleted_edges),
    }
    expr=sp.factor(Q.subs(sub))
    num,den=sp.fraction(sp.together(expr))
    poly=sp.Poly(num,t,A,B,R,da,db,k,s)
    degrees,bern=tensor_bernstein_sparse(poly,3)
    total=sum(len(row) for row in bern)
    minimum=min(value for row in bern for value in row.values())
    negatives=[]
    for cube_index,row in enumerate(bern):
        for powers,value in row.items():
            if value<0:
                negatives.append((cube_index,powers,value))
    return {
        "Nshift":Nshift,
        "denominator":den,
        "power_terms":len(poly.terms()),
        "cube_degrees":degrees,
        "cube_rows":len(bern),
        "homogeneous_terms":total,
        "minimum":minimum,
        "negative_count":len(negatives),
        "negative_preview":negatives[:20],
        "expr":expr,
    }


def general_environment_merge():
    """Return the merge gap with an arbitrary remaining pair R,R0."""
    a,b,s=sp.symbols("a b selected_isolates_s", nonnegative=True)
    x=(sp.Integer(1),*sp.symbols("x1:8"))
    h=(sp.Integer(1),*sp.symbols("h1:8"))
    r=(sp.Integer(1),*sp.symbols("r1:8"))
    c=(sp.Integer(1),*sp.symbols("c1:8"))
    one=(1,0,0,0,0,0,0,0)
    xx=(0,1,0,0,0,0,0,0)
    La=isolate(one,a);Lb=isolate(one,b);Lab=isolate(one,a+b)
    G=conv(add(La,xx),add(Lb,xx))
    Gc=conv(add(Lab,xx),add(one,xx))
    X=conv(r,G);Xc=conv(r,Gc);X0=conv(c,Lab)
    P=isolate(x,s);Y=add(P,shift(h))
    def F(Z):
        U=conv(Z,Y);W=conv(Z,P);C=conv(X0,P)
        return sp.expand(n4_deleted(U,W)+block(C,W)+block(U,C))
    gap=sp.expand(F(X)-F(Xc))
    za=sp.factor(gap.subs(a,0));zb=sp.factor(gap.subs(b,0))
    assert za==0 and zb==0
    quo,rem=sp.div(gap,a*b,a,b)
    assert sp.expand(rem)==0
    quo=sp.factor(quo)
    assert sp.expand(gap-a*b*quo)==0
    return (a,b,s,x,h,r,c),quo


def inspect_general_environment():
    variables,quo=general_environment_merge()
    a,b,s,x,h,r,c=variables
    print("GENERAL_MERGE_OPS",sp.count_ops(quo),"TERMS",len(sp.Poly(sp.expand(quo),a,b,s,*x[1:6],*h[1:5],*r[1:6],*c[1:5]).terms()),flush=True)
    used=[str(v) for v in (*x[1:],*h[1:],*r[1:],*c[1:]) if quo.has(v)]
    print("GENERAL_USED",used,flush=True)
    # Separate the no-other-star face R=(1+x)^k,R0=1 to verify Q/12.
    k=sp.symbols("k",nonnegative=True)
    rleaf=tuple(sp.expand_func(sp.binomial(k,j)) for j in range(8))
    face=sp.factor(quo.subs({r[j]:rleaf[j] for j in range(1,8)}).subs({c[j]:0 for j in range(1,8)}))
    print("GENERAL_FACE_OPS",sp.count_ops(face),flush=True)
    return variables,quo


def general_environment_lower_bound(Nshift=2):
    variables,quo=general_environment_merge();a,b,s,x,h,r,c=variables
    da,db,t,A,B,Q,k,j,d=sp.symbols("da db t A B Q k j d",nonnegative=True)
    N=t+Nshift
    # The remaining u-side environment is k isolated leaves and j nontrivial
    # centred stars with total leaf count j+d.
    D=j+d
    R1=k+D+j
    active=N*A/2
    inactive_components=B*N*(1-A)
    components=active+inactive_components
    edges=N-components
    deleted_edges=active+Q*N*(1-A)*(1-B)
    H1=N-active
    sub={
        a:1+da,b:1+db,
        # For a star forest, r3=C(R1,3)-D(R1-2)+sum_i C(d_i,2).
        # Convexity and d_i>=1 give sum_i C(d_i,2)<=C(D-j+1,2).
        r[1]:R1,r[2]:choose(R1,2)-D,
        r[3]:choose(R1,3)-D*(R1-2)+choose(D-j+1,2),
        c[1]:D,c[2]:choose(D,2),
        x[1]:N,x[2]:choose(N,2)-edges,x[3]:choose(N,3),
        h[1]:H1,h[2]:choose(H1,2)-(edges-deleted_edges),
    }
    expr=sp.factor(quo.subs(sub))
    num,den=sp.fraction(sp.together(expr))
    poly=sp.Poly(num,t,A,B,Q,da,db,k,j,d,s)
    degrees,bern=tensor_bernstein_sparse(poly,3)
    total=sum(len(row) for row in bern)
    minimum=min(v for row in bern for v in row.values())
    negatives=[(ci,p,v) for ci,row in enumerate(bern) for p,v in row.items() if v<0]
    return {
        "Nshift":Nshift,"denominator":den,"power_terms":len(poly.terms()),
        "cube_degrees":degrees,"cube_rows":len(bern),"terms":total,
        "minimum":minimum,"negative_count":len(negatives),
        "negative_preview":negatives[:30],"expr":expr,
    }


def general_environment_small_core(N):
    assert N in (0,1)
    variables,quo=general_environment_merge();a,b,s,x,h,r,c=variables
    da,db,k,j,d=sp.symbols("da db k j d",nonnegative=True)
    D=j+d;R1=k+D+j
    sub={a:1+da,b:1+db,
         r[1]:R1,r[2]:choose(R1,2)-D,
         r[3]:choose(R1,3)-D*(R1-2)+choose(D-j+1,2),
         c[1]:D,c[2]:choose(D,2),
         x[1]:N,x[2]:0,x[3]:0,h[1]:N,h[2]:0}
    expr=sp.factor(quo.subs(sub));num,den=sp.fraction(sp.together(expr))
    poly=sp.Poly(num,da,db,k,j,d,s)
    negatives=[(p,v) for p,v in poly.terms() if v<0]
    return {"N":N,"denominator":den,"terms":len(poly.terms()),
            "minimum":min(v for _,v in poly.terms()),"negative_count":len(negatives),
            "negative_preview":negatives[:30],"expr":expr}


def general_environment_small_nonempty_core(N,branch):
    base=general_environment_small_core(N)["expr"]
    # Recover the symbols by name from the expanded expression.
    symbols={str(v):v for v in base.free_symbols}
    k=symbols["k"];j=symbols["j"]
    if branch=="leaf":expr=sp.expand(base.subs(k,k+1))
    elif branch=="star":expr=sp.expand(base.subs(j,j+1))
    else:raise AssertionError(branch)
    ordered=sorted(expr.free_symbols,key=str)
    poly=sp.Poly(expr,*ordered)
    neg=[(p,v) for p,v in poly.terms() if v<0]
    return {"N":N,"branch":branch,"variables":[str(v) for v in ordered],
            "terms":len(poly.terms()),"minimum":min(v for _,v in poly.terms()),
            "negative_count":len(neg),"negative_preview":neg[:30],"expr":expr}


def _int_conv(u,v,limit=7):
    return tuple(sum((u[i] if i<len(u) else 0)*(v[j] if j<len(v) else 0)
                     for i in range(k+1) for j in (k-i,)
                     if i<len(u) and j<len(v)) for k in range(limit+1))


def _star_row(d):
    return tuple((sp.binomial(d,k) if k<=d else 0)+(1 if k==1 else 0)
                 for k in range(8))


def scan_merge_signs():
    variables,quo=general_environment_merge();a,b,s,x,h,r,c=variables
    ev=sp.lambdify((a,b,s,*x[1:4],*h[1:3],*r[1:4],*c[1:3]),quo,modules="math")
    out={}
    for N in (0,1):
        counts={"negative":0,"zero":0,"positive":0};examples={}
        for sel in range(4):
          for aa in range(1,6):
           for bb in range(1,6):
            for length in range(4):
             for degs in itertools.product(range(5),repeat=length):
              rr=(1,0,0,0,0,0,0,0)
              D=sum(degs)
              for dd in degs:rr=_int_conv(rr,_star_row(dd))
              cc=tuple(int(sp.binomial(D,k)) for k in range(8))
              value=sp.Rational(ev(aa,bb,sel,N,0,0,N,0,*rr[1:4],*cc[1:3]))
              key="negative" if value<0 else "positive" if value>0 else "zero"
              counts[key]+=1;examples.setdefault(key,(sel,aa,bb,degs,value))
        out[N]={"counts":counts,"examples":examples}
    return out


def main():
    for shift in (0,1,2,3,13):
        r=componentwise_lower_bound(shift)
        print({k:v for k,v in r.items() if k!="expr"},flush=True)
    inspect_general_environment()
    for shift in (0,1,2,3,13):
        r=general_environment_lower_bound(shift)
        print("GENERAL_BOUND",{k:v for k,v in r.items() if k!="expr"},flush=True)
    for N in (0,1):
        r=general_environment_small_core(N)
        print("GENERAL_SMALL",{k:v for k,v in r.items() if k!="expr"},flush=True)


if __name__=="__main__":
    main()
