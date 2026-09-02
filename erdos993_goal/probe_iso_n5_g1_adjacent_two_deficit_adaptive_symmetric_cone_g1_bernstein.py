#!/usr/bin/env python3
"""Exact symmetric-cone probe for the adjacent two-deficit g1 relaxation.

This diagnostic handles the incident-edge vertex (eX,eY)=(0,0), where the
lower expression is symmetric in the two positive deletion deficits p,q.
It first rewrites the expression in the elementary symmetric coordinates
p+q and p*q.  The balance coordinate therefore has only the true symmetric
degree, avoiding the much larger ordered stick-breaking tensor.

This is a probe until every exact Bernstein coefficient is checked and the
front-end inequalities are frozen separately.
"""

from __future__ import annotations

import argparse
import json

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


def generic_symmetric_lower():
    n, p, q = sp.symbols("n p q")
    a2, a3, a4, a5, a6 = sp.symbols("a2 a3 a4 a5 a6")
    a = (sp.Integer(1), n, a2, a3, a4, a5, a6)

    def row(d):
        m = n-d
        x2 = d*n-d*(d+1)/2
        # Raw generalized path floor.  For every integer m>=1 it is <=i3(F).
        x3 = a3-(m-2)*(m-3)*(m-4)/6
        c4 = n*(n-1)*(n-2)*(n-3)/24
        c5 = n*(n-1)*(n-2)*(n-3)*(n-4)/120
        d4 = m*(m-1)*(m-2)*(m-3)/24
        d5 = m*(m-1)*(m-2)*(m-3)*(m-4)/120
        x4 = sp.cancel(a4*(a4-d4)/c4)
        x5 = sp.cancel(a5*(a5-d5)/c5)
        return (sp.Integer(0), d, x2, x3, x4, x5)

    x, y = row(p), row(q)
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

    def k_form(left, right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    target = sp.cancel(face-t_form(x)-t_form(y)+k_form(x,y))
    numerator, denominator = sp.fraction(target)
    symmetric, remainder, mapping = sp.symmetrize(
        sp.expand(numerator), [p, q], formal=True
    )
    assert remainder == 0
    s1, s2 = mapping[0][0], mapping[1][0]
    return (n, (a2,a3,a4,a5,a6), s1, s2,
            symmetric, sp.factor(denominator))


def build(sector: str):
    N = sp.Symbol("N", nonnegative=True)
    edge_share, deletion_share, balance = sp.symbols(
        "edge_share deletion_share balance", nonnegative=True
    )
    if sector == "high":
        r0, r1, r2, r3 = sp.symbols("r0 r1 r2 r3", nonnegative=True)
        bounded = (edge_share, deletion_share, balance, r0, r1, r2, r3)
    else:
        delta1, r0, r1, r2 = sp.symbols(
            "delta1 r0 r1 r2", nonnegative=True
        )
        bounded = (edge_share, deletion_share, balance, delta1, r0, r1, r2)

    n = N+13
    e = (n-2)*edge_share
    component_count = n-e
    deleted_total = 2+(component_count-2)*deletion_share
    deleted_product = (
        deleted_total-1+(deleted_total-2)**2*balance/4
    )

    # Work with Rj=n*rho_j.  This keeps the full substitution polynomial and
    # avoids a costly multivariate rational cancellation.
    rho1_scaled = sp.expand(2*n*(n-1)-4*e)
    budget = sp.expand(rho1_scaled-4*n)
    if sector == "high":
        rho5 = budget*r0
        d4 = budget*(1-r0)*r1
        d3 = budget*(1-r0)*(1-r1)*r2
        d2 = budget*(1-r0)*(1-r1)*(1-r2)*r3
        rho4 = rho5+n+d4
        rho3 = rho4+n+d3
        rho2 = rho3+n+d2
    else:
        rho5 = budget*r0
        d4 = budget*(1-r0)*r1
        d3 = budget*(1-r0)*(1-r1)*r2
        d2 = budget*(1-r0)*(1-r1)*(1-r2)
        rho4 = rho5+n+d4
        rho3 = rho4+n+d3
        rho2 = rho3+2*n-n*delta1+d2

    ratio_a = [
        sp.Integer(1), n,
        rho1_scaled/4,
        rho1_scaled*rho2/(24*n),
        rho1_scaled*rho2*rho3/(192*n**2),
        rho1_scaled*rho2*rho3*rho4/(1920*n**3),
        rho1_scaled*rho2*rho3*rho4*rho5/(23040*n**4),
    ]

    gn, ga, s1, s2, generic_numerator, generic_denominator = generic_symmetric_lower()
    print("STAGE generic", flush=True)
    substituted = generic_numerator.subs({
        gn: n,
        s1: deleted_total,
        s2: deleted_product,
        **dict(zip(ga, ratio_a[2:7])),
    })
    # The generic numerator has coefficient-degree at most two.  Multiplying
    # by n^8 clears every scaled-ratio denominator; the omitted generic
    # denominator is strictly positive for n>=13.
    print("STAGE substituted", flush=True)
    numerator = sp.expand(n**8*substituted)
    print("STAGE expanded", flush=True)
    denominator = generic_denominator.subs(gn,n)*n**8
    variables = (*bounded, N)
    polynomial = sp.Poly(numerator, *variables)
    print("STAGE poly", flush=True)
    return variables, polynomial, {
        "sector": sector,
        "geometry": {
            "n": str(n), "edges": str(e),
            "p_plus_q": str(deleted_total), "p_times_q": str(deleted_product),
        },
        "generic_denominator": str(generic_denominator),
        "final_denominator": str(sp.factor(denominator)),
        "power_terms": len(polynomial.terms()),
        "power_degrees": [polynomial.degree(v) for v in variables],
    }


def to_flint(variables, polynomial):
    context = fmpq_mpoly_ctx.get([str(variable) for variable in variables], "degrevlex")
    data = {}
    for monomial, coefficient in polynomial.terms():
        numerator, denominator = map(int, sp.fraction(coefficient))
        data[tuple(map(int, monomial))] = fmpq(numerator, denominator)
    return context.from_dict(data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high","low"), required=True)
    parser.add_argument("--stats-only", action="store_true")
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    variables, polynomial, construction = build(args.sector)
    if args.stats_only:
        coefficients = polynomial.coeffs()
        print(json.dumps({
            "construction": construction,
            "power_signs": {
                "negative": sum(c < 0 for c in coefficients),
                "zero": sum(c == 0 for c in coefficients),
                "positive": sum(c > 0 for c in coefficients),
                "minimum": str(min(coefficients)),
            },
        }, indent=2, sort_keys=True))
        return
    flint_poly = to_flint(variables, polynomial)
    degrees, coefficients, terms = tensor_bernstein_from_flint_matrix(
        flint_poly, 7, chunk_columns=args.chunk_columns
    )
    assert terms == construction["power_terms"]
    print(json.dumps({
        "construction": construction,
        "bernstein_degrees": list(map(int,degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": sum(value < 0 for value in coefficients.flat),
        "zero": sum(value == 0 for value in coefficients.flat),
        "minimum": str(min(coefficients.flat)),
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
