#!/usr/bin/env python3
"""Finite exact-ish diagnostic of the strengthened global y=1 branch cover."""

from __future__ import annotations

import math
import numpy as np
import sympy as sy

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build as build_c
from derive_terminal_q3_m1_forest_j3_simple_f4_root import build as build_t


def C(n, k):
    return math.comb(n, k) if 0 <= k <= n else 0


def roots(coeffs):
    scale = max(map(abs, coeffs), default=0.0)
    if scale == 0:
        return []
    out = []
    for z in np.roots(coeffs):
        if abs(z.imag) <= 1e-7 * max(1, abs(z.real)):
            out.append(float(z.real))
    return out


def ev(cs, x):
    ans = 0.0
    for c in cs:
        ans = ans * x + c
    return ans


def main(limit=80, force_ratio=False):
    n0, _d0, _mn, _md, variables, _b = build_c()
    n1, _d1, variables1, _b1 = build_t()
    assert variables == variables1
    N, h, d, R, W, y = variables
    polys = (sy.Poly(-n0, W), sy.Poly(-(N - 3) * n1, W))
    funcs = tuple(tuple(sy.lambdify((N,h,d,R,y), p.coeff_monomial(W**q), "math")
                        for q in (3,2,1,0)) for p in polys)
    tests = neg = 0
    minimum = None
    witnesses = []
    for Nv in range(13, limit + 1):
        for hv in range(1, (Nv - 1)//2 + 1):
            budget = Nv - 2*hv
            for dv in range(1, budget + 1):
                S = Nv-dv
                if S < 2:
                    continue
                for Rv in range(budget-dv+1):
                    L = budget-dv-Rv
                    lo = C(dv,2)+Rv
                    hi = lo+C(Rv+1,2)+C(L+1,2)
                    if force_ratio:
                        eH=Nv-hv-dv-Rv
                        U3=C(S,3)-eH*(S-2)+C(eH,2)
                        B=(dv*C(S-1,2)-Rv*(S-2)+C(dv,2)*S
                           -(dv-1)*Rv+C(dv,3))
                        if U3+B <= 0:
                            print("NONPOS_DEN",Nv,hv,dv,Rv,U3,B,flush=True); return
                        yv=U3/(U3+B)
                    else:
                        yv=1.0
                    cs = tuple(tuple(float(f(Nv,hv,dv,Rv,yv)) for f in fs) for fs in funcs)
                    points = [lo,hi]
                    for branch in cs:
                        points += roots((3*branch[0],2*branch[1],branch[2]))
                    points += roots(tuple(x-z for x,z in zip(*cs)))
                    for wv in points:
                        if lo-1e-7 <= wv <= hi+1e-7:
                            vals=tuple(ev(branch,wv) for branch in cs)
                            rec=(max(vals),Nv,hv,dv,Rv,wv,yv,vals)
                            tests += 1
                            if minimum is None or rec < minimum:
                                minimum=rec
                            if rec[0] < -1e-3:
                                neg += 1
                                if len(witnesses)<10: witnesses.append(rec)
        print(Nv, tests, neg, minimum, flush=True)
    print("FINAL",tests,neg,minimum,witnesses,flush=True)


if __name__ == "__main__":
    main()
