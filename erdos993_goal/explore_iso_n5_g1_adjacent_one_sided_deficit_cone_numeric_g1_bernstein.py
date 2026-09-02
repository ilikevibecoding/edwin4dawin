#!/usr/bin/env python3
"""Numeric probe of a correlated one-sided adjacent deficit cone.

The cone keeps x1=d exactly and uses
0<=x_k<=min(a_k,d*binom(n-1,k-1)).  It maximizes the exact linear correction
T(A,X) over this box and minimizes S(A,A,A)-T.  This is a diagnostic only.
"""

from __future__ import annotations

import json
import math

from scipy.optimize import differential_evolution


def choose(value, rank):
    out = 1.0
    for offset in range(rank):
        out *= value-offset
    return out/math.factorial(rank)


def evaluate(point, sector, details=False):
    z, sd, r0, r1, r2, r3, P = point
    p = P/(1-P)
    n = 13+p
    edges = (n-1)*z
    components = n-edges
    d = components*sd
    rho1 = 2*(n-1)-4*edges/n
    budget = rho1-4
    if sector == "high":
        rho5 = budget*r0
        D4 = budget*(1-r0)*r1
        D3 = budget*(1-r0)*(1-r1)*r2
        D2 = budget*(1-r0)*(1-r1)*(1-r2)*r3
        D1 = budget*(1-r0)*(1-r1)*(1-r2)*(1-r3)
        rho4=rho5+1+D4; rho3=rho4+1+D3; rho2=rho3+1+D2
        assert abs(rho2+1+D1-rho1)<1e-6*max(1,rho1)
    else:
        bounded=r0
        rho5=budget*r1
        D4=budget*(1-r1)*r2
        D3=budget*(1-r1)*(1-r2)*r3
        D2=budget*(1-r1)*(1-r2)*(1-r3)
        rho4=rho5+1+D4; rho3=rho4+1+D3
        rho2=rho3+2-bounded+D2
        assert abs(rho2+bounded-rho1)<1e-6*max(1,rho1)
    rho=(rho1,rho2,rho3,rho4,rho5)
    q=[1.0,2*n]
    for value in rho: q.append(q[-1]*value)
    a=[q[k]/(2**k*math.factorial(k)) for k in range(7)]
    face=(
        4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+21*a[3]**2+6*a[3]*a[4]
    )
    coefficients=[
        None,
        2*a[2]-a[3]-10*a[4]-6*a[5],
        2*(a[1]+5*a[2]+4*a[3]-a[4]),
        -a[1]+8*a[2]+8*a[3],
        -2*(5*a[1]+a[2]),
        -6*a[1],
    ]
    x_upper=[None,d]
    for rank in range(2,6):
        x_upper.append(a[rank])
    correction=coefficients[1]*d
    chosen=[None,d]
    for rank in range(2,6):
        value=x_upper[rank] if coefficients[rank]>0 else 0.0
        correction += coefficients[rank]*value
        chosen.append(value)
    lower=face-correction
    normalized=lower/n**6
    if details:
        return {
            "variables":list(map(float,point)),"sector":sector,"n":n,"edges":edges,
            "components":components,"d":d,"rho":list(rho),"a":a,
            "S_AAA":face,"T_upper":correction,"S_lower":lower,
            "S_lower_over_n6":normalized,"T_coefficients":coefficients[1:],
            "x_upper":x_upper[1:],"x_chosen":chosen[1:],
        }
    return normalized


def main():
    bounds=[(0,1),(0,1),(0,1),(0,1),(0,1),(0,1),(0,0.995)]
    rows={}
    for sector in ("high","low"):
        function=lambda point,sector=sector:evaluate(point,sector)
        result=differential_evolution(function,bounds,seed=993,popsize=20,maxiter=300,
                                      polish=True,tol=1e-10,updating="immediate")
        rows[sector]={"success":bool(result.success),"message":str(result.message),
                      "iterations":int(result.nit),"evaluations":int(result.nfev),
                      "minimum":evaluate(result.x,sector,True)}
    print(json.dumps({"sectors":rows,"scope":"Numeric relaxation only."},indent=2,sort_keys=True))


if __name__ == "__main__":
    main()
