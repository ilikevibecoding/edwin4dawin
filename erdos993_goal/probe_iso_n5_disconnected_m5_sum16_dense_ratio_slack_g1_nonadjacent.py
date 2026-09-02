#!/usr/bin/env python3
"""Probe pinned forest-ratio cones for dense sum16 using R=e(P)-q."""

import itertools
import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    P,
    choose,
    polynomial_hash,
    tensor_bernstein,
)


def build_lower():
    n, E, R = sp.symbols("n E R", nonnegative=True)
    s = n-E; q=E-R
    d3 = (
        choose(s,3)+choose(s,2)*E-(s-1)*q+s*choose(E,2)
        -q*(E-1)+choose(q,2)-(s-1)*R
    )
    assert sp.factor(d3-(choose(n,3)-E*(n-2)+choose(E,2)-choose(E,3)+choose(R,2)))==0
    d4=choose(s,4)+choose(s,3)*E-choose(s-1,2)*q
    d5=choose(s,5)+choose(s,4)*E-choose(s-1,3)*q
    p2,p3,p4,p5,p6=P[2:7]
    base=sp.Rational(1,2)*(
        2*n*p3+n*p4-13*n*p5-6*n*p6+2*p2**2+3*p2*p3
        -4*p2*p4-8*p2*p5+9*p3**2+6*p3*p4
    )
    lower=sp.expand(base-(n+8*p3)*d3/2+p2*d4+3*n*d5)
    return (n,E,R),lower


def cone_expression(mode):
    (n,E,R),lower=build_lower()
    a,b,alpha=sp.symbols("a b alpha",nonnegative=True)
    # n>=20 dense box: E=n(1-19a/20), 0<=R<=E-1.
    Ebox=n*(1-sp.Rational(19,20)*a)
    Rbox=b*(Ebox-1)
    budget=2*n-10+sp.Rational(19,5)*a
    count=5 if mode=="high" else 4
    y=sp.symbols(f"{mode}_y0:{count}",nonnegative=True)
    rho5=budget*y[0]; rho4=rho5+1+budget*y[1]; rho3=rho4+1+budget*y[2]
    if mode=="high":
        rho2=rho3+1+budget*y[3]; rho1=rho2+1+budget*y[4]
        cubes=(a,b)
    else:
        rho2=rho3+2-alpha+budget*y[3]; rho1=rho2+alpha
        cubes=(a,b,alpha)
    product=1; subs={}
    for rank,rho in zip(range(2,7),(rho1,rho2,rho3,rho4,rho5)):
        product*=rho
        subs[P[rank]]=n*product/(2**(rank-1)*sp.factorial(rank))
    expression=sp.expand(lower.subs({E:Ebox,R:Rbox,**subs}))
    return n,a,b,alpha,y,cubes,expression


def corner_probe():
    for mode in ("high","low"):
        n,a,b,alpha,y,cubes,expression=cone_expression(mode)
        failures=[]
        simplex_vertices=[]
        for i in range(len(y)):
            simplex_vertices.append({value:int(j==i) for j,value in enumerate(y)})
        for N in (20,21,40,100):
            for cube in itertools.product((0,1),repeat=len(cubes)):
                for vertex in simplex_vertices:
                    value=sp.factor(expression.subs({n:N,**dict(zip(cubes,cube)),**vertex}))
                    if value<0: failures.append((N,cube,tuple(vertex[z] for z in y),value))
        print(mode,"corner failures",len(failures),flush=True)
        for row in failures[:20]:print("NEG",row,flush=True)


def exact_probe(mode):
    n,a,b,alpha,y,cubes,expression=cone_expression(mode)
    t=sp.symbols("t",nonnegative=True)
    cube_rows=tensor_bernstein(expression,cubes)
    print(mode,"cube rows",len(cube_rows),flush=True)
    failures=[]; terms=0
    for row_index,row in enumerate(cube_rows):
        shifted=sp.Poly(sp.expand(row.subs(n,t+20)),t,*y)
        degree=max(sum(m[1:]) for m,_ in shifted.terms())
        S=sum(y)
        homogeneous=sp.Poly(sp.expand(sum(
            coefficient*t**monomial[0]
            *sp.prod(variable**power for variable,power in zip(y,monomial[1:]))
            *S**(degree-sum(monomial[1:]))
            for monomial,coefficient in shifted.terms()
        )),t,*y)
        terms+=len(homogeneous.terms())
        bad=[(m,c) for m,c in homogeneous.terms() if c<0]
        if bad:failures.append((row_index,len(bad),bad[:3],polynomial_hash(homogeneous)))
    print(mode,"homogeneous terms",terms,"failed rows",len(failures),flush=True)
    for failure in failures[:20]: print("FAIL",failure,flush=True)


if __name__=="__main__":
    corner_probe()
    exact_probe("high")
    exact_probe("low")
