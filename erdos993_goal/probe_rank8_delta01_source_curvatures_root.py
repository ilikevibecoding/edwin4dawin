#!/usr/bin/env python3
"""Source-coordinate builder for the reduced rank-eight Delta0/Delta1 boxes.

The completed structural reductions leave four cases for each rank: the two
Q7 endpoints of c8 crossed with the lower-cross and upper-capacity root
paths.  Unlike Delta2/Delta3, the rank-six defect coordinate K remains live
on 1<=K<=7.  This module exposes the exact rational source expression for a
single case; it makes no sign claim by itself.
"""

from __future__ import annotations

import argparse

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def build(delta: int, c8_endpoint: str, piece: str):
    if delta not in (0, 1):
        raise ValueError(delta)
    if c8_endpoint not in ("zero", "q7"):
        raise ValueError(c8_endpoint)

    n, w, x = sp.symbols("n w x", positive=True)
    U, K, V, Z = sp.symbols("U K V Z", nonnegative=True)
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    d4_low = (2 + x) / 10
    d4 = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c5 = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(c4 / c5)
    a = n - 7
    q_low = sp.factor((30 / x5 - 18 - 3 * K) / (7 * a))
    q = sp.factor(q_low + 15 * V / (7 * a))
    c6 = sp.factor(c5 * (7 * a * q + 3 * K) / 36)
    c7 = sp.factor(a * q * c6 / 6)
    if c8_endpoint == "zero":
        c8 = sp.S.Zero
    else:
        c8 = sp.factor(c7 * (14 * c7 - c6) / (16 * c6))

    if piece == "lcross":
        S = 1 - q + q * Z
        h7 = c7 * Z
    elif piece == "ucap":
        S = 7 * q * Z / 6
        h7 = a * S * c6 / 7
    else:
        raise ValueError(piece)
    h6 = sp.factor(S * c6)

    raw = newton_coefficients(residual())[delta]
    value = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:9], h[6], h[7]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, c8, h6, h7),
                )
            ),
            simultaneous=True,
        )
    )
    return value, (n, w, x, U, K, V, Z)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delta", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c8", choices=("zero", "q7"), required=True)
    parser.add_argument("--piece", choices=("lcross", "ucap"), required=True)
    args = parser.parse_args()
    value, variables = build(args.delta, args.c8, args.piece)
    numerator, denominator = sp.fraction(value)
    numerator_poly = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    denominator_poly = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    print("source_terms", len(numerator_poly.terms()), len(denominator_poly.terms()))
    print("source_degrees", numerator_poly.degree_list(), denominator_poly.degree_list())
    print("denominator", sp.factor(denominator))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
