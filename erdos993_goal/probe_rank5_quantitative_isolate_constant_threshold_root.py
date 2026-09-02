#!/usr/bin/env python3
"""Extract the exact quantitative-constant obstruction at the first isolate corner."""

from __future__ import annotations

import math

import sympy as sp

from verify_rank5_isolate_payment_monotonicity import parameter_data
from verify_rank5_leaf_induction_reduction import rooted_payment
from verify_rank5_quantitative_isolate_payment_root import (
    abstract_numerator,
    coefficient_regions,
    mapped_polynomial,
)


def first_difference(constant: sp.Expr):
    c0, c1, c2, c3, c4, c5, h, k = sp.symbols(
        "c0 c1 c2 c3 c4 c5 h k", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def coefficient(rank: int, smoothing: int):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def margin(smoothing: int):
        d, e, f = (coefficient(rank, smoothing) for rank in (3, 4, 5))
        return sp.expand(
            rooted_payment(e + h, f + k, d, e, f)
            - constant * d * e**3
        )

    return sp.expand(margin(1) - margin(0)), (c0, c1, c2, c3, c4, c5, h, k)


def main() -> None:
    constant = sp.symbols("lambda", nonnegative=True)
    raw, coefficient_variables = first_difference(constant)
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    q_region = next(row for row in q_regions if row[0] == "q_half_low_r")
    coefficient_region = next(
        row for row in coefficient_regions(box_variables)
        if row[0] == "pair_low_x"
    )
    common = abstract_numerator(
        raw, coefficient_variables, box_variables, normalized_variables, "pair"
    )
    label, polynomial, monomial = mapped_polynomial(
        common, box_variables, normalized_variables, q_region, coefficient_region
    )
    X, T, A, W, V, Z = box_variables
    boundary_slice = sp.factor(
        polynomial.subs({T: 0, A: 1, W: 1, V: 0, Z: 0})
    )
    corner = sp.factor(polynomial.subs({X: 1, T: 0, A: 1, W: 1, V: 0, Z: 0}))
    zero = sp.solve(sp.Eq(corner, 0), constant)
    print("LABEL", label)
    print("REMOVED_MONOMIAL", monomial)
    print("BOUNDARY_SLICE", boundary_slice)
    unit_slice = sp.factor(boundary_slice.subs(constant, 1))
    print("UNIT_BOUNDARY_SLICE", unit_slice)
    print(
        "UNIT_BOUNDARY_CRITICAL_ROOTS",
        [
            root
            for root in sp.nroots(sp.diff(unit_slice, X), maxsteps=200)
            if abs(sp.im(root)) < sp.Rational(1, 10) ** 20
            and 0 <= sp.re(root) <= 1
        ],
    )
    print("CORNER", corner)
    print("ZERO", zero)
    for candidate in (sp.Rational(7, 5), sp.Rational(1, 1), sp.Rational(1, 2),
                      sp.Rational(1, 10), sp.Rational(1, 100)):
        print("VALUE", candidate, sp.factor(corner.subs(constant, candidate)))


if __name__ == "__main__":
    main()
