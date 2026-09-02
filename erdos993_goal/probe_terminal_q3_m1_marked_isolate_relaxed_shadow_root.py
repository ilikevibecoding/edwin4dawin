#!/usr/bin/env python3
"""Route-finding probe for the marked-isolated-root terminal m=1 lane.

This intentionally tests a relaxed sufficient lower: use the smaller-forest
q_j<=q_2 cap, the first two lower-shadow bounds, u=i_(j+1)>=0, the forest
low-row identities, and the crude r4 upper m*C(n-2,2).  A negative only kills
this relaxation, not the theorem.
"""

from __future__ import annotations

from fractions import Fraction
import json
from math import comb, floor, ceil

import sympy as sp


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def derive():
    j, n, a, p, m, z, r4, x, y, b, u, zj = sp.symbols(
        "j n a p m z r4 x y b u zj", positive=True
    )

    def P(r):
        return p + r*a + sp.binomial(r, 2)*n + sp.binomial(r, 3)

    def R(r):
        return r4 + r*z + sp.binomial(r, 2)*m

    def U(r):
        return u + r*b + sp.binomial(r, 2)*y + sp.binomial(r, 3)*x

    def delta(r):
        c = z + r*a
        e = zj + r*b
        M = (j + 1)*b*c - 3*a*e
        A = P(r)*c - a*R(r)
        Wcross = P(r)*b - a*U(r)
        return sp.expand(P(r)*(P(r) + a)*M - (j + 1)*A*Wcross)

    d1 = sp.expand(delta(3) - delta(2))
    substitutions = {
        zj: j*b*z/(2*a),
        u: 0,
        y: b*j/(n-j+1),
        x: b*j*(j-1)/((n-j+1)*(n-j+2)),
    }
    lower = sp.factor(sp.cancel(d1.subs(substitutions)/b))
    wedge = sp.symbols("wedge", nonnegative=True)
    lower = lower.subs({
        a: sp.binomial(n, 2)-m,
        p: sp.binomial(n, 3)-m*(n-2)+wedge,
        z: m*(n-2)-2*wedge,
        r4: m*sp.binomial(n-2, 2),
    })
    numerator, denominator = sp.together(lower).as_numer_denom()
    numerator = sp.expand_func(numerator).expand()
    denominator = sp.factor(denominator)
    assert sp.expand(denominator - 2*(j-n-2)*(j-n-1)) == 0, denominator
    polynomial = sp.Poly(numerator, wedge)
    assert polynomial.degree() == 2
    coefficients = [
        sp.lambdify((j, n, m), polynomial.coeff_monomial(wedge**degree), "math")
        for degree in (2, 1, 0)
    ]
    return coefficients, len(sp.Poly(numerator, j, n, m, wedge).terms())


def evaluate_quadratic(A: int, B: int, C0: int, value: int) -> int:
    return A*value*value + B*value + C0


def main() -> None:
    coefficients, terms = derive()
    checks = 0
    minimum = None
    negatives = []
    for n in range(3, 61):
        for j in range(3, n + 1):
            for m in range(0, n):
                a = C(n, 2)-m
                if a <= 0:
                    continue
                w_lo = max(0, 2*m-n)
                w_hi = C(m, 2)
                if w_lo > w_hi:
                    continue
                A, B, C0 = (int(function(j, n, m)) for function in coefficients)
                candidates = {w_lo, w_hi}
                if A > 0:
                    vertex = Fraction(-B, 2*A)
                    candidates.update({floor(vertex), ceil(vertex)})
                for wedge in sorted(value for value in candidates if w_lo <= value <= w_hi):
                    value = evaluate_quadratic(A, B, C0, wedge)
                    record = (value, n, j, m, wedge, A, B, C0)
                    minimum = record if minimum is None else min(minimum, record)
                    if value < 0 and len(negatives) < 20:
                        negatives.append(record)
                    checks += 1
    report = {
        "status": (
            "SEARCH_RELAXATION_NEGATIVES_FOUND" if negatives
            else "SEARCH_RELAXATION_NO_NEGATIVES_N60"
        ),
        "scope": "relaxed parameter probe only; not a theorem",
        "derived_numerator_terms": terms,
        "checks": checks,
        "minimum": [str(value) for value in minimum],
        "first_negatives": [[str(value) for value in row] for row in negatives],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
