#!/usr/bin/env python3
"""Exact endpoint scout for the ratio-strengthened rank-five payment.

For alpha=1/5 the leaf induction for
Q5-alpha*i4*i5 requires

    Phi >= alpha*X*(1+X*r)*(1+X+X*r).

This diagnostic keeps the sealed concavity reduction and tests how small an
order-derived upper bound on X=i3/i4 is sufficient.
"""

import argparse

import sympy as sp

from verify_rank5_normalized_algebra_lemma import (
    D, D0, PHI, X, certify_bernstein, q, r, rm, z,
)


ALPHA = sp.Rational(1, 5)
TARGET = ALPHA * X * (1 + X * r) * (1 + X + X * r)
PSI = sp.expand(PHI - TARGET)


def endpoints():
    r_first = sp.Rational(1, 2) + z / 2
    r_between = sp.Rational(1, 2) + (rm - sp.Rational(1, 2)) * z
    r_last = rm + (1 - rm) * z
    substitutions = {
        "P1": {D: 1, q: sp.Rational(1, 2), r: r_first},
        "P2": {D: D0, q: sp.Rational(1, 2), r: r_between},
        "P3": {D: 2 * r_last - 1, q: sp.Rational(1, 2), r: r_last},
        "C2": {D: D0, q: r_last - D0 / 2, r: r_last},
    }
    for d_name, d_value in (("D0", D0), ("D1", sp.S.One)):
        for r_name, r_value in (("rhalf", sp.Rational(1, 2)), ("r1", sp.S.One)):
            substitutions[f"Q1_{d_name}_{r_name}"] = {D: d_value, q: 1, r: r_value}
    out = {}
    for name, sub in substitutions.items():
        value = sp.factor(PSI.subs(sub, simultaneous=True))
        numerator, denominator = sp.fraction(sp.cancel(value))
        assert denominator.is_positive is not False
        out[name] = sp.factor(numerator)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--caps", nargs="+", default=["1", "4/5", "3/4", "2/3", "1/2", "2/5", "1/3", "1/4"])
    parser.add_argument("--max-depth", type=int, default=28)
    args = parser.parse_args()

    assert sp.diff(PSI, q, 2) == -20 * X**2
    assert sp.diff(PSI.subs(q, sp.Rational(1, 2)), D, 2) == -20
    assert sp.factor(sp.diff(PSI.subs(q, r - D / 2), D, 2)) == -5 * (X + 2) ** 2
    assert sp.expand(
        sp.diff(PSI.subs(q, 1), r, 2)
        + sp.Rational(12, 5) * X**2 * (10 * (1 - D) + X)
    ) == 0

    polys = endpoints()
    for cap_text in args.caps:
        cap = sp.Rational(cap_text)
        print("CAP", cap, flush=True)
        passed = True
        for name, polynomial in polys.items():
            scaled = sp.factor(polynomial.subs(X, cap * X))
            try:
                result = certify_bernstein(scaled, max_depth=args.max_depth)
                print(" PASS", name, "min", result[1], "leaves", result[3], "depth", result[4], flush=True)
            except AssertionError as error:
                passed = False
                print(" FAIL", name, str(error), flush=True)
        print("RESULT", cap, "PASS" if passed else "FAIL", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
