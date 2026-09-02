#!/usr/bin/env python3
"""Exact ratio-cone probe for the adjacent two-deficit relaxation.

For positive componentwise-disjoint deletion sizes p,q, write c=p+q+s for
the component count and e=n-c for the edge count.  If X=A-B, then

  Q(p)-e <= x2 <= Q(p),  Q(p)=pn-p(p+1)/2,
  x3 <= min(a3,p*C(n-1,2)).

For n>=13 the exact S deficit form is decreasing in x3 and increasing in
x4,x5, so it suffices to set x4=x5=0, choose either displayed x3 upper
branch, and check the four x2/y2 rectangle corners.  This diagnostic maps
the p,q,s,e simplex by stick-breaking coordinates and applies exact tensor
Bernstein conversion together with the pinned high/low forest-ratio cones.
A passing branch is still only one ingredient of the eventual theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_RATIO_CONE_ROOT"


def build(args):
    N = sp.Symbol("N", nonnegative=True)
    u, v, w = sp.symbols("u v w", nonnegative=True)
    if args.sector == "high":
        r0, r1, r2, r3 = sp.symbols("r0 r1 r2 r3", nonnegative=True)
        bounded = (u,v,w,r0,r1,r2,r3)
    else:
        delta1, r0, r1, r2 = sp.symbols("delta1 r0 r1 r2", nonnegative=True)
        bounded = (u,v,w,delta1,r0,r1,r2)

    n = N+13
    total = n-2
    p = 1+total*u
    q = 1+total*(1-u)*v
    slack = total*(1-u)*(1-v)*w
    edges = total*(1-u)*(1-v)*(1-w)
    assert sp.expand(p+q+slack+edges-n) == 0

    R1 = sp.expand(2*n*(n-1)-4*edges)
    budget = sp.expand(R1-4*n)
    if args.sector == "high":
        R5 = budget*r0
        D4 = budget*(1-r0)*r1
        D3 = budget*(1-r0)*(1-r1)*r2
        D2 = budget*(1-r0)*(1-r1)*(1-r2)*r3
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+n+D2
        assert sp.expand(R1-R2-n-budget*(1-r0)*(1-r1)*(1-r2)*(1-r3)) == 0
    else:
        R5 = budget*r0
        D4 = budget*(1-r0)*r1
        D3 = budget*(1-r0)*(1-r1)*r2
        D2 = budget*(1-r0)*(1-r1)*(1-r2)
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+2*n-n*delta1+D2
        assert sp.expand(R1-R2-n*delta1) == 0

    a = [
        sp.Integer(1), n, R1/4,
        R1*R2/(24*n),
        R1*R2*R3/(192*n**2),
        R1*R2*R3*R4/(1920*n**3),
        R1*R2*R3*R4*R5/(23040*n**4),
    ]

    def q2(d):
        return sp.expand(d*n-d*(d+1)/2)

    def xrow(d, endpoint, third):
        x2 = q2(d)-(edges if endpoint == "low" else 0)
        if third == "a3":
            x3 = a[3]
        elif third == "union":
            x3 = d*(n-1)*(n-2)/2
        else:
            # Valid on the branch n-d>=5.  The complementary deleted forest
            # has at least the path coefficient C(n-d-2,3).
            x3 = a[3]-(n-d-2)*(n-d-3)*(n-d-4)/6
        if args.lower == "zero":
            x4 = x5 = sp.Integer(0)
        else:
            c4 = n*(n-1)*(n-2)*(n-3)/24
            c5 = n*(n-1)*(n-2)*(n-3)*(n-4)/120
            deleted4 = (n-d)*(n-d-1)*(n-d-2)*(n-d-3)/24
            deleted5 = (n-d)*(n-d-1)*(n-d-2)*(n-d-3)*(n-d-4)/120
            x4 = sp.cancel(a[4]*(a[4]-deleted4)/c4)
            x5 = sp.cancel(a[5]*(a[5]-deleted5)/c5)
        return (sp.Integer(0),d,x2,x3,x4,x5)

    x = xrow(p,args.x2,args.x3)
    y = xrow(q,args.y2,args.y3)

    face = (
        4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+21*a[3]**2+6*a[3]*a[4]
    )

    def t_form(z):
        return (
            (2*a[2]-a[3]-10*a[4]-6*a[5])*z[1]
            +2*(a[1]+5*a[2]+4*a[3]-a[4])*z[2]
            +(-a[1]+8*a[2]+8*a[3])*z[3]
            -2*(5*a[1]+a[2])*z[4]-6*a[1]*z[5]
        )

    def k_form(left,right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    scaled = sp.cancel(46080*n**4*(face-t_form(x)-t_form(y)+k_form(x,y)))
    numerator, denominator = sp.fraction(scaled)
    assert denominator == 1
    variables = (*bounded,N)
    polynomial = sp.Poly(sp.expand(numerator),*variables)
    return variables, polynomial, {
        "stick_breaking": {
            "p": str(p), "q": str(q), "slack": str(slack),
            "edges": str(edges), "n": str(n),
        },
        "power_terms": len(polynomial.terms()),
        "power_degrees": [polynomial.degree(variable) for variable in variables],
    }


def to_flint(variables, polynomial):
    context = fmpq_mpoly_ctx.get([str(variable) for variable in variables], "degrevlex")
    data = {}
    for monomial, coefficient in polynomial.terms():
        numerator, denominator = map(int, sp.fraction(coefficient))
        data[tuple(map(int,monomial))] = fmpq(numerator,denominator)
    return context.from_dict(data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high","low"), required=True)
    parser.add_argument("--x2", choices=("low","high"), required=True)
    parser.add_argument("--y2", choices=("low","high"), required=True)
    parser.add_argument("--x3", choices=("a3","union","path"), required=True)
    parser.add_argument("--y3", choices=("a3","union","path"), required=True)
    parser.add_argument("--lower", choices=("zero","adaptive"), default="zero")
    parser.add_argument("--stats-only", action="store_true")
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    variables, sympy_poly, construction = build(args)
    if args.stats_only:
        signs = {
            "negative": sum(1 for value in sympy_poly.coeffs() if value < 0),
            "zero": sum(1 for value in sympy_poly.coeffs() if value == 0),
            "positive": sum(1 for value in sympy_poly.coeffs() if value > 0),
            "minimum": str(min(sympy_poly.coeffs())),
        }
        print(json.dumps({"branch": vars(args), "construction": construction,
                          "power_signs": signs}, indent=2, sort_keys=True))
        return
    polynomial = to_flint(variables,sympy_poly)
    degrees, coefficients, terms = tensor_bernstein_from_flint_matrix(
        polynomial,7,chunk_columns=args.chunk_columns
    )
    assert terms == construction["power_terms"]
    negative = sum(1 for value in coefficients.flat if value < 0)
    zero = sum(1 for value in coefficients.flat if value == 0)
    minimum = min(coefficients.flat)
    report = {
        "marker": MARKER,
        "branch": vars(args),
        "construction": construction,
        "bernstein_degrees": list(map(int,degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": negative, "zero": zero, "minimum": str(minimum),
        "scope": "one exact relaxation cone branch only; no theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    stem = f"{args.sector}_{args.x2}{args.y2}_{args.x3}_{args.y3}"
    output = HERE/f"iso_n5_g1_adjacent_two_deficit_ratio_cone_{stem}_root_20260830.json"
    raw = json.dumps(report,indent=2,sort_keys=True)+"\n"
    output.write_text(raw,encoding="utf-8")
    print(json.dumps({
        "branch": report["branch"], "power_terms": construction["power_terms"],
        "bernstein_degrees": report["bernstein_degrees"],
        "bernstein_coefficients": report["bernstein_coefficients"],
        "negative": negative, "zero": zero, "minimum": str(minimum),
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
