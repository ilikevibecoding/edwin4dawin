#!/usr/bin/env python3
"""Exact fixed-(n,m) Bernstein probe for Delta^0..Delta^2 without rooted C7.

This is a proof-construction probe.  It encloses d=h6/c6 through the exact
root-deleted forest J=A-N[q]: if a=i4(J), b=i5(J), s=1-a/c5, z=c5/c6, then

  d = 1-z (b/a)(1-s),

with 0 <= 5b/a <= m-4 by extension counting, and with the sharp lower
rank-(4,5) forest bound when m>=18.
"""

from __future__ import annotations

import argparse
from math import comb

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import normalized_low
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def mapped(rank: int, n: int, m: int, q_end: int, s_end: int, d_end: int):
    expression, (x, y, z, q, s, d) = normalized_low(rank)
    X, Y, U, V, Z = sp.symbols("X Y U V Z", nonnegative=True)
    nn = sp.Integer(n)
    if rank == 0:
        t_n = (nn - 7) * (nn - 8) / (nn - 3)
        mu = (t_n - 3 + 2 / t_n) / 6
        z_lo, z_hi = sp.Rational(6, n - 5), 1 / mu
        z_val = sp.factor(z_lo + (z_hi - z_lo) * Z)
        x_val = y_val = sp.Integer(1)
        coeff_box = (Z,)
    elif rank == 1:
        t_n = (nn - 7) * (nn - 8) / (nn - 3)
        y_lo, y_hi = sp.Rational(5, n - 4), 5 / t_n
        y_val = sp.factor(y_lo + (y_hi - y_lo) * Y)
        d5_lo, d5_hi = (2 + y_val) / 12, sp.Rational(1, 6) + y_val / 2
        d5 = sp.factor(d5_lo + (d5_hi - d5_lo) * V)
        z_val = sp.factor(y_val / (1 - d5))
        x_val = sp.Integer(1)
        coeff_box = (Y, V)
    else:
        x_lo = sp.Rational(4, n - 3)
        x_hi = sp.Rational(4 * (n - 2), (n - 5) * (n - 6))
        x_val = sp.factor(x_lo + (x_hi - x_lo) * X)
        d4_lo = (2 + x_val) / 10
        d4 = sp.factor(d4_lo + (D4_CEILING - d4_lo) * U)
        y_val = sp.factor(x_val / (1 - d4))
        d5_lo, d5_hi = (2 + y_val) / 12, sp.Rational(1, 6) + y_val / 2
        d5 = sp.factor(d5_lo + (d5_hi - d5_lo) * V)
        z_val = sp.factor(y_val / (1 - d5))
        coeff_box = (X, U, V)

    q_val = (sp.Rational(1, 7) + z_val / 2) if q_end else ((2 + z_val) / 14)
    s_lo = 1 - sp.Rational(comb(m, 4), comb(n - 4, 5))
    s_val = sp.Integer(1) if s_end else s_lo
    ratio_hi = sp.Rational(max(m - 4, 0), 5)
    if m >= 18:
        ratio_lo = sp.Rational((m - 7) * (m - 8), 5 * (m - 3))
    else:
        ratio_lo = sp.Integer(0)
    # A second exact description is d=s*z*(h6/h5).  Forest V6 plus the sharp
    # forest rank-(4,5) ratio on H=A-q (order n-1) gives the following lower
    # endpoint for n>=20; it is much stronger than decoupling J from H.
    rho_h = sp.Rational((n - 8) * (n - 9), 5 * (n - 4))
    ratio_h_low = (25 * rho_h - 4) / 39
    d_lo = s_val * z_val * ratio_h_low
    d_hi = 1 - z_val * ratio_lo * (1 - s_val)
    d_val = d_hi if d_end else d_lo

    box = (*coeff_box,)
    values = (x_val, y_val, z_val, q_val, s_val, d_val)
    source = sp.Poly(expression, x, y, z, q, s, d, domain=sp.QQ)
    maxima = source.degree_list()
    maps = []
    midpoint = {v: sp.Rational(1, 2) for v in box}
    for value in values:
        num, den = sp.fraction(sp.cancel(value))
        if den.subs(midpoint) < 0:
            num, den = -num, -den
        assert den.subs(midpoint) > 0
        maps.append((sp.Poly(sp.expand(num), *box, domain=sp.QQ), sp.Poly(sp.expand(den), *box, domain=sp.QQ)))
    powers = [[num**p * den**(mx-p) for p in range(mx+1)] for mx, (num, den) in zip(maxima, maps)]
    cleared = sp.Poly(0, *box, domain=sp.QQ)
    for monomial, coefficient in source.terms():
        term = sp.Poly(coefficient, *box, domain=sp.QQ)
        for axis, power in enumerate(monomial):
            term *= powers[axis][power]
        cleared += term
    denominator = sp.Poly(1, *box, domain=sp.QQ)
    for mx, (_, den) in zip(maxima, maps):
        denominator *= den**mx
    return cleared.as_expr(), denominator.as_expr(), box, (s_lo, d_lo, d_hi)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rank", type=int, choices=(0, 1, 2), required=True)
    ap.add_argument("--n", type=int, required=True)
    ap.add_argument("--m", type=int, required=True)
    args = ap.parse_args()
    failures = []
    for q in (0, 1):
        for s in (0, 1):
            for d in (0, 1):
                num, den, box, domain = mapped(args.rank, args.n, args.m, q, s, d)
                dd, dc = tensor_bernstein_fast(den, box)
                if all(value == 0 for value in dd):
                    dmin, di = sp.sympify(dc.flat[0].item()), tuple(0 for _ in dd)
                else:
                    dmin, di = minimum_with_index(dc)
                assert dmin > 0, (q, s, d, dd, dmin, di)
                deg, co = tensor_bernstein_fast(num, box)
                minimum, index = minimum_with_index(co)
                if isinstance(minimum, sp.ImmutableDenseNDimArray):
                    minimum = sp.sympify(co[index].item())
                print("branch", q, s, d, "degrees", deg, "size", co.size, "min", minimum, "index", index, flush=True)
                if minimum < 0:
                    failures.append((q, s, d, str(minimum), index))
    if failures:
        print("FAIL", args.rank, args.n, args.m, failures)
        return 1
    print("PASS", args.rank, args.n, args.m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
