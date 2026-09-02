#!/usr/bin/env python3
"""Exact Bernstein probe for Delta^3 through Delta^6 of rank-7 broom residual.

This uses the nested coefficient-defect cone already certified for forests:
Q4/Q5/Q6 lower defect endpoints, two-extension upper endpoints at ranks
five through seven, the rank-(3,4,5) defect ceiling, and half-retention of
the root-deleted ranks five and six.  It is initially a proof-construction
probe; a successful run is upgraded to the theorem replay package.
"""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


CORE_ORDER = 39
D4_CEILING = sp.Rational(1559, 3575)


def coefficient_map():
    T, W, A, U, V, Z, S, D = sp.symbols(
        "T W A U V Z S D", nonnegative=True
    )
    box = (T, W, A, U, V, Z, S, D)
    order = sp.Rational(CORE_ORDER, 1) / T

    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w = sp.factor(w_low + (w_high - w_low) * W)

    x_low = 8 * w / (6 - w)
    x_high = 4 * w / (3 * (1 - w))
    x = sp.factor(x_low + (x_high - x_low) * A)

    d4_low = (2 + x) / 10
    d4 = sp.factor(d4_low + (D4_CEILING - d4_low) * U)

    c0 = sp.factor(2 * w / ((order - 1) * (order - 2)))
    c1 = sp.factor(order * c0)
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    c5 = sp.factor((1 - d4) / x**2)

    x5 = sp.factor(c4 / c5)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    d5 = sp.factor(d5_low + (d5_high - d5_low) * V)
    c6 = sp.factor((1 - d5) * c5**2 / c4)

    x6 = sp.factor(c5 / c6)
    d6_low = (2 + x6) / 14
    d6_high = sp.Rational(1, 7) + x6 / 2
    d6 = sp.factor(d6_low + (d6_high - d6_low) * Z)
    c7 = sp.factor((1 - d6) * c6**2 / c5)

    root_s = (1 + S) / 2
    root_d = (1 + D) / 2
    mapped = (
        c0,
        c1,
        c2,
        c3,
        c4,
        c5,
        c6,
        c7,
        root_s * c5,
        root_d * c6,
    )
    return box, mapped


def mapped_numerator(rank: int):
    raw = newton_coefficients(exact_decomposition())[rank]
    box, mapped = coefficient_map()
    variables = (*c[:8], h[5], h[6])
    rational = sp.together(
        raw.subs(dict(zip(variables, mapped)), simultaneous=True)
    )
    numerator, denominator = sp.fraction(rational)
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.subs(midpoint) > 0
    return sp.expand(numerator), sp.expand(denominator), box


def abstract_numerator(rank: int):
    order, w, x, u, v, z, root_s, root_d = sp.symbols(
        "n w x u v z s d", positive=True
    )
    variables = (order, w, x, u, v, z, root_s, root_d)
    c0 = 2 * w / ((order - 1) * (order - 2))
    c1 = order * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    c5 = (1 - u) / x**2
    c6 = (1 - v) * c5**2 / c4
    c7 = (1 - z) * c6**2 / c5
    mapped = (c0, c1, c2, c3, c4, c5, c6, c7, root_s * c5, root_d * c6)
    raw = newton_coefficients(exact_decomposition())[rank]
    rational = sp.factor(
        raw.subs(
            dict(zip((*c[:8], h[5], h[6]), mapped)),
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(sp.together(rational))
    return sp.expand(numerator), sp.factor(denominator), variables


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=range(3, 7), required=True)
    args = parser.parse_args()
    numerator, denominator, box = abstract_numerator(args.rank)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    print("rank", args.rank)
    print("numerator_terms", len(npoly.terms()), "degrees", npoly.degree_list())
    print("denominator_terms", len(dpoly.terms()), "degrees", dpoly.degree_list())
    print("abstract_denominator", denominator)
    for variable in box[3:]:
        second = sp.factor(sp.diff(numerator, variable, 2))
        poly = sp.Poly(sp.expand(second), *box, domain=sp.QQ)
        signs = {sp.sign(coeff) for _, coeff in poly.terms()}
        print(
            "second",
            variable,
            "terms",
            len(poly.terms()),
            "degrees",
            poly.degree_list(),
            "coefficient_signs",
            signs,
            "factor",
            second if len(poly.terms()) <= 12 else "-",
        )
    # The abstract domain is not a unit box; this mode reports the exact
    # polynomial structure used to choose endpoint/concavity reductions.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
