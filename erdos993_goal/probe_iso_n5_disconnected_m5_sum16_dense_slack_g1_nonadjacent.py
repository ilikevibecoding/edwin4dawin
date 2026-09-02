#!/usr/bin/env python3
"""Probe a dense sum16 lower bound using R=e(P)-q=e(H)."""

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_sparse_active_root_g1_nonadjacent import (
    bernstein_coefficients,
)


def tensor_bernstein(expression, variables):
    rows = [sp.expand(expression)]
    for variable in variables:
        rows = [coefficient for row in rows for coefficient in bernstein_coefficients(row, variable)]
    return rows


def main():
    n, E, R, t, a, b = sp.symbols("n E R t a b", nonnegative=True)
    s = n - E
    q = E - R
    p2 = choose(n, 2) - E
    p3_lo = choose(n, 3) - E * (n - 2)
    p4_lo = choose(n, 4) - E * choose(n - 2, 2)
    p3_hi = choose(n, 3) - E * (n - 2) + choose(E, 2)
    p4_hi, p5_hi, p6_hi = (choose(n, rank) for rank in (4, 5, 6))
    base = sp.Rational(1, 2) * (
        2*n*p3_lo+n*p4_lo-13*n*p5_hi-6*n*p6_hi
        +2*p2**2+3*p2*p3_lo-4*p2*p4_hi-8*p2*p5_hi
        +9*p3_lo**2+6*p3_lo*p4_lo
    )
    d3_hi = (
        choose(s, 3) + choose(s, 2)*E - (s-1)*q
        + s*choose(E, 2) - q*(E-1) + choose(q, 2) - (s-1)*R
    )
    assert sp.factor(d3_hi - (
        p3_hi - choose(E, 3) + choose(R, 2)
    )) == 0
    d4_lo = choose(s, 4) + choose(s, 3)*E - choose(s-1, 2)*q
    d5_lo = choose(s, 5) + choose(s, 4)*E - choose(s-1, 3)*q
    lower = sp.factor(
        base - (n+8*p3_hi)*d3_hi/2 + p2*d4_lo + 3*n*d5_lo
    )
    print("lower", sp.factor(lower), flush=True)

    # Exact dense-interior box: n>=13, n/20<=E<=n-1, 1<=R<=E-1.
    E_box = n/sp.Integer(20) + a*(n-1-n/sp.Integer(20))
    R_box = 1 + b*(E_box-2)
    shifted = sp.expand(lower.subs({E:E_box, R:R_box, n:t+13}))
    rows = tensor_bernstein(shifted, (a,b))
    negatives=[]
    for i,row in enumerate(rows):
        poly=sp.Poly(row,t)
        for power,coefficient in enumerate(reversed(poly.all_coeffs())):
            if coefficient<0:
                negatives.append((i,power,coefficient,sp.factor(row)))
    print("rows",len(rows),"negatives",len(negatives),flush=True)
    for row in negatives[:20]: print("NEG",row,flush=True)


if __name__ == "__main__":
    main()
