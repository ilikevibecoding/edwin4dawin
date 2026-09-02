#!/usr/bin/env python3
"""Exact isolate-payment certificate with the rank-2 curvature cone.

For a forest core C normalize c3=i3(C)=1 and write

    X=c3/c4,  w=c2/c3,  y=c1/c2.

The proved rank-3 reserve and rank-2 factorial curvature give

    0 <= w <= 6X/(X+8),       0 <= y <= 2w/3.

Moreover c0 is bounded by both the core order N>=13 and the elementary
pair count i2<=binom(N,2):

    c0 <= wy/13,              c0 <= wy^2/(y+2).

The bounds exchange dominance at y=1/6.  This verifier partitions the
coefficient cone into four rational unit boxes and checks exact tensor
Bernstein coefficients for the isolate-payment forward differences.
"""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_monotonicity import (
    parameter_data,
    raw_forward_differences,
    remove_nonnegative_monomial_factor,
    verify_q_concavity,
)


def abstract_numerator(
    raw,
    coefficient_variables,
    box_variables,
    normalized_variables,
    bound,
):
    X, _, _, W, V, Z = box_variables
    D, r, q = normalized_variables
    terms = sp.Poly(raw, *coefficient_variables).terms()
    powers = []
    for monomial, _ in terms:
        a0, _, _, _, a4, a5, _, ak = monomial
        powers.append(
            (
                a4 + 2 * a5 + ak,
                a0 if bound == "pair" else 0,
            )
        )
    max_x = max(item[0] for item in powers)
    max_pair = max(item[1] for item in powers)
    pair_denominator = V + 2
    numerator = sp.S.Zero
    for (monomial, coefficient), (px, pair_power) in zip(
        terms, powers
    ):
        a0, a1, a2, _, _, a5, ah, ak = monomial
        term = coefficient
        if bound == "pair":
            term *= (W * V**2 * Z) ** a0
            term *= pair_denominator ** (max_pair - pair_power)
        elif bound == "order":
            term *= (sp.Rational(1, 13) * W * V * Z) ** a0
        else:
            raise ValueError(bound)
        term *= (W * V) ** a1
        term *= W**a2
        term *= (1 - D) ** a5
        term *= r**ah * q**ak
        term *= X ** (max_x - px)
        numerator += term
    return sp.expand(numerator)


def coefficient_regions(box_variables):
    X, _, _, W, V, _ = box_variables
    x0 = sp.Rational(8, 23)
    x_low = x0 * X
    x_high = x0 + (1 - x0) * X

    def w_max(x):
        return 6 * x / (x + 8)

    w_low_x = w_max(x_low) * W
    w_small = W / 4
    w_high = sp.Rational(1, 4) + (
        w_max(x_high) - sp.Rational(1, 4)
    ) * W
    return (
        (
            "pair_low_x",
            "pair",
            x_low,
            w_low_x,
            sp.Rational(2, 3) * w_low_x * V,
        ),
        (
            "pair_small_w",
            "pair",
            x_high,
            w_small,
            sp.Rational(2, 3) * w_small * V,
        ),
        (
            "pair_low_y",
            "pair",
            x_high,
            w_high,
            V / 6,
        ),
        (
            "order_high_y",
            "order",
            x_high,
            w_high,
            sp.Rational(1, 6)
            + (
                sp.Rational(2, 3) * w_high
                - sp.Rational(1, 6)
            )
            * V,
        ),
    )


def mapped_polynomial(
    common,
    box_variables,
    normalized_variables,
    q_region,
    coefficient_region,
):
    X, _, _, W, V, _ = box_variables
    D, r, q = normalized_variables
    q_name, r_value, d_value, q_value = q_region
    coefficient_name, _, x_value, w_value, y_value = coefficient_region
    endpoint = sp.expand(
        common.xreplace({D: d_value, r: r_value, q: q_value})
    )
    mapped = endpoint.xreplace(
        {X: x_value, W: w_value, V: y_value}
    )
    rational = sp.cancel(mapped)
    numerator, denominator = sp.fraction(rational)
    denominator_polynomial = sp.Poly(
        sp.expand(denominator), *box_variables
    )
    assert all(
        coefficient >= 0
        for _, coefficient in denominator_polynomial.terms()
    )
    assert denominator.subs(
        {variable: sp.Rational(1, 2) for variable in box_variables}
    ) > 0
    residual, monomial = remove_nonnegative_monomial_factor(
        sp.expand(numerator), box_variables
    )
    return (
        f"{q_name}/{coefficient_name}",
        residual,
        monomial,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=5)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--region")
    parser.add_argument("--coefficient-region")
    args = parser.parse_args()
    assert 1 <= args.min_difference <= args.max_difference <= 15

    differences, coefficient_variables = raw_forward_differences()
    verify_q_concavity(differences, coefficient_variables)
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    if args.region:
        q_regions = tuple(
            region for region in q_regions if region[0] == args.region
        )
        if not q_regions:
            raise ValueError(args.region)
    coefficient_boxes = coefficient_regions(box_variables)
    if args.coefficient_region:
        coefficient_boxes = tuple(
            region
            for region in coefficient_boxes
            if region[0] == args.coefficient_region
        )
        if not coefficient_boxes:
            raise ValueError(args.coefficient_region)

    for order in range(args.min_difference, args.max_difference + 1):
        raw = differences[order - 1]
        required_bounds = {region[1] for region in coefficient_boxes}
        common = {
            bound: abstract_numerator(
                raw,
                coefficient_variables,
                box_variables,
                normalized_variables,
                bound,
            )
            for bound in required_bounds
        }
        total = 0
        for q_region in q_regions:
            for coefficient_region in coefficient_boxes:
                label, polynomial, monomial = mapped_polynomial(
                    common[coefficient_region[1]],
                    box_variables,
                    normalized_variables,
                    q_region,
                    coefficient_region,
                )
                degrees, coefficients = tensor_bernstein_fast(
                    polynomial, box_variables
                )
                minimum, index = minimum_with_index(coefficients)
                print(
                    f"Delta^{order} {label}: degrees={degrees} "
                    f"coefficients={coefficients.size:,} "
                    f"minimum={minimum} index={index} "
                    f"monomial_factor={monomial}",
                    flush=True,
                )
                if minimum < 0:
                    raise AssertionError(
                        f"negative Bernstein coefficient in {label}"
                    )
                total += coefficients.size
        print(
            f"Delta^{order}: PASS coefficients={total:,}",
            flush=True,
        )
    print("rank-5 isolate curvature-cone certificate: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
