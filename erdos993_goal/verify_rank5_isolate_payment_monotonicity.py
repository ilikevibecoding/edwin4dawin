#!/usr/bin/env python3
"""Exact certificate that isolated-vertex smoothing raises the payment.

Let C be a forest polynomial with coefficients c_0,...,c_5, and let
H be a related polynomial supplying h=i_3(H), k=i_4(H).  Put

    D_s=(1+x)^s C,
    a_s=i_4(D_s)+h,
    b_s=i_5(D_s)+k,

and let M_s be the rank-5 rooted payment built from
(a_s,b_s,i_3(D_s),i_4(D_s),i_5(D_s)).

Under the exact low-rank inequalities used by the terminal single-stem
case, this script certifies

    Delta^j M_0 >= 0  (1 <= j <= 15).

Hence M_s >= M_0 for every integer s>=0.  The proof reduces each
forward difference to four unit-box polynomials and checks all tensor
Bernstein coefficients exactly.
"""

from __future__ import annotations

import argparse
import math
from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_leaf_induction_reduction import rooted_payment


def raw_forward_differences():
    c0, c1, c2, c3, c4, c5, h, k = sp.symbols(
        "c0 c1 c2 c3 c4 c5 h k", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def smoothed_coefficient(rank: int, smoothing: int):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def payment(smoothing: int):
        d, e, f = (
            smoothed_coefficient(rank, smoothing)
            for rank in (3, 4, 5)
        )
        return rooted_payment(e + h, f + k, d, e, f)

    values = [payment(smoothing) for smoothing in range(17)]
    differences = []
    for _ in range(1, 16):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        differences.append(values[0])
    sixteenth = sp.expand(values[1] - values[0])
    assert sixteenth == 0
    return differences, (c0, c1, c2, c3, c4, c5, h, k)


def verify_q_concavity(differences, coefficient_variables) -> None:
    c0, c1, c2, c3, _, _, _, _ = coefficient_variables
    smoothing = sp.symbols("smoothing", integer=True, nonnegative=True)
    d_s = (
        c3
        + smoothing * c2
        + smoothing * (smoothing - 1) * c1 / 2
        + smoothing * (smoothing - 1) * (smoothing - 2) * c0 / 6
    )
    square_values = [
        sp.expand(d_s.subs(smoothing, value) ** 2)
        for value in range(16)
    ]
    for order, difference in enumerate(differences, start=1):
        square_values = [
            sp.expand(square_values[index + 1] - square_values[index])
            for index in range(len(square_values) - 1)
        ]
        square_difference = sp.Poly(
            square_values[0], c0, c1, c2, c3
        )
        assert all(
            coefficient >= 0
            for _, coefficient in square_difference.terms()
        )
        q_second = sp.factor(sp.diff(difference, coefficient_variables[7], 2))
        expected = -100 * square_values[0]
        assert sp.expand(q_second - expected) == 0


def parameter_data(core_order: int = 13):
    assert core_order >= 1
    X, T, A, W, V, Z = sp.symbols(
        "X T A W V Z", nonnegative=True
    )
    D = sp.symbols("D", real=True)
    r, q = sp.symbols("r q", nonnegative=True)

    D0 = (2 + X) / 10
    rm = (12 + X) / 20

    # Q3 gives c2/c3 <= 6X/(X+8).
    w = 6 * X * W / (X + 8)
    # The proved two-step factorial-drop theorem gives
    # c1/c3 <= 2wX/(X+4).
    ratio = 2 * X * V / (X + 4)
    v = w * ratio
    # The core has order N>=core_order, while c0=1 and c1=N before
    # normalization.  Thus c0/c3=(c1/c3)/N <= v/core_order.  This order
    # constraint is essential beginning with Delta^5: the cone using
    # only Q1 admits fractional pseudo-forests of order below 13.
    z = v * Z / core_order

    r_low = sp.Rational(1, 2) + (
        rm - sp.Rational(1, 2)
    ) * A
    r_high = rm + (1 - rm) * A
    D_full = D0 + (1 - D0) * T
    D_above_switch = (
        2 * r_high - 1 + (2 - 2 * r_high) * T
    )
    D_below_switch = D0 + (
        2 * r_high - 1 - D0
    ) * T

    regions = (
        # The upper q endpoint over the entire D,r box.
        (
            "q_upper",
            sp.Rational(1, 2) + A / 2,
            D_full,
            sp.S.One,
        ),
        # q=1/2 and D>=2r-1, split at r=rm.
        ("q_half_low_r", r_low, D_full, sp.Rational(1, 2)),
        (
            "q_half_high_r",
            r_high,
            D_above_switch,
            sp.Rational(1, 2),
        ),
        # q=r-D/2 and D<=2r-1.
        (
            "q_cross",
            r_high,
            D_below_switch,
            r_high - D_below_switch / 2,
        ),
    )
    return (X, T, A, W, V, Z), (D, r, q), (w, v, z), regions


def cleared_numerator(
    raw,
    coefficient_variables,
    box_variables,
    normalized_variables,
    *,
    c0_bound,
    core_order,
):
    """Substitute a c0 endpoint and clear every positive denominator."""
    terms = sp.Poly(raw, *coefficient_variables).terms()
    return cleared_numerator_from_terms(
        terms,
        box_variables,
        normalized_variables,
        c0_bound=c0_bound,
        core_order=core_order,
    )


def cleared_numerator_from_terms(
    terms,
    box_variables,
    normalized_variables,
    *,
    c0_bound,
    core_order,
    denominator_maxima=None,
):
    """Clear denominators from coefficient-monomial term data."""
    X, _, _, W, V, Z = box_variables
    D, r, q = normalized_variables
    denominator_powers = []
    for monomial, _ in terms:
        a0, a1, a2, _, a4, a5, _, ak = monomial
        powers = [
            a4 + 2 * a5 + ak,
            a0 + a1,
            a0 + a1 + a2,
        ]
        if c0_bound == "pair":
            powers.append(a0)
        denominator_powers.append(tuple(powers))
    local_maxima = (
        max(item[0] for item in denominator_powers),
        max(item[1] for item in denominator_powers),
        max(item[2] for item in denominator_powers),
        max(item[3] for item in denominator_powers)
        if c0_bound == "pair"
        else 0,
    )
    if denominator_maxima is None:
        denominator_maxima = local_maxima
    assert all(
        supplied >= required
        for supplied, required in zip(denominator_maxima, local_maxima)
    )
    max_x, max_x4, max_x8, max_linear = denominator_maxima
    positive_linear = X * (V + 1) + 4

    numerator = sp.S.Zero
    for (monomial, coefficient), powers in zip(
        terms, denominator_powers
    ):
        a0, a1, a2, _, _, a5, ah, ak = monomial
        px, px4, px8 = powers[:3]
        term = coefficient
        if c0_bound == "order":
            term *= (
                sp.Rational(12, core_order) * X**2 * W * V * Z
            ) ** a0
        elif c0_bound == "pair":
            term *= (12 * X**3 * W * V**2 * Z) ** a0
            term *= positive_linear ** (max_linear - powers[3])
        else:
            raise ValueError(c0_bound)
        term *= (12 * X**2 * W * V) ** a1
        term *= (6 * X * W) ** a2
        term *= (1 - D) ** a5
        term *= r**ah * q**ak
        term *= X ** (max_x - px)
        term *= (X + 4) ** (max_x4 - px4)
        term *= (X + 8) ** (max_x8 - px8)
        numerator += term
    return sp.expand(numerator)


def coefficient_regions(box_variables, core_order):
    """Partition where the two exact c0 bounds exchange dominance."""
    X, _, _, _, V, _ = box_variables
    assert core_order >= 6
    threshold_x = sp.Rational(4, core_order - 2)
    high_x = threshold_x + (1 - threshold_x) * X
    critical_denominator = high_x * (core_order - 1)
    critical_numerator = high_x + 4
    return (
        # 2XV/(X+4) <= 2/(N-1): the pair-count bound
        # c0 <= c1^2/(c1+2c2) is sharper.
        (
            "pair_low_x",
            "pair",
            threshold_x * X,
            V,
            sp.S.One,
        ),
        (
            "pair_low_ratio",
            "pair",
            high_x,
            critical_numerator * V,
            critical_denominator,
        ),
        # 2XV/(X+4) >= 2/(N-1): the order bound is sharper.
        (
            "order_high_ratio",
            "order",
            high_x,
            critical_numerator
            + (critical_denominator - critical_numerator) * V,
            critical_denominator,
        ),
    )


def remove_nonnegative_monomial_factor(expression, variables):
    """Drop the greatest common box-variable monomial."""
    polynomial = sp.Poly(expression, *variables)
    terms = polynomial.terms()
    minimum_exponents = tuple(
        min(monomial[index] for monomial, _ in terms)
        for index in range(len(variables))
    )
    factor = sp.prod(
        variable**exponent
        for variable, exponent in zip(variables, minimum_exponents)
    )
    quotient = sp.cancel(expression / factor)
    assert sp.denom(quotient) == 1
    return sp.expand(quotient), minimum_exponents


def certify_difference(
    order,
    raw,
    coefficient_variables,
    box_variables,
    normalized_variables,
    lower_coefficients,
    regions,
    *,
    core_order=13,
    maximum_subdivision_depth=30,
    initial_only=False,
    selected_coefficient_region=None,
):
    del lower_coefficients
    X, _, _, _, V, _ = box_variables
    D, r, q = normalized_variables
    summaries = []
    required_bounds = (
        {"pair"}
        if selected_coefficient_region in {"pair_low_x", "pair_low_ratio"}
        else {"order"}
        if selected_coefficient_region == "order_high_ratio"
        else {"pair", "order"}
    )
    numerators = {
        bound: cleared_numerator(
            raw,
            coefficient_variables,
            box_variables,
            normalized_variables,
            c0_bound=bound,
            core_order=core_order,
        )
        for bound in required_bounds
    }

    for name, r_value, D_value, q_value in regions:
        for (
            coefficient_name,
            bound,
            x_value,
            v_numerator,
            v_denominator,
        ) in coefficient_regions(box_variables, core_order):
            if (
                selected_coefficient_region
                and coefficient_name != selected_coefficient_region
            ):
                continue
            endpoint = sp.expand(
                numerators[bound].xreplace(
                    {D: D_value, r: r_value, q: q_value}
                )
            )
            v_degree = sp.Poly(endpoint, V).degree()
            mapped = endpoint.xreplace(
                {
                    X: x_value,
                    V: v_numerator / v_denominator,
                }
            )
            rational = sp.cancel(mapped * v_denominator**v_degree)
            numerator, denominator = sp.fraction(rational)
            assert denominator > 0
            expanded = sp.expand(numerator)
            expanded, monomial_factor = (
                remove_nonnegative_monomial_factor(
                    expanded, box_variables
                )
            )
            region_label = f"{name}/{coefficient_name}"
            degrees, coefficients = tensor_bernstein_fast(
                expanded, box_variables
            )
            initial_minimum, initial_index = minimum_with_index(
                coefficients
            )
            if initial_only:
                summaries.append(
                    {
                        "region": region_label,
                        "degrees": degrees,
                        "coefficients": coefficients.size,
                        "zeros": sum(
                            value == 0 for value in coefficients.flat
                        ),
                        "smallest_positive": min(
                            (
                                value
                                for value in coefficients.flat
                                if value > 0
                            ),
                            default=None,
                        ),
                        "leaves": 1,
                        "maximum_depth": 0,
                        "initial_minimum": initial_minimum,
                        "initial_index": initial_index,
                        "monomial_factor": monomial_factor,
                    }
                )
                continue

            queue = deque([(coefficients, 0)])
            leaves = []
            maximum_depth = 0
            axis_order = (0, 3, 4, 5, 1, 2)
            while queue:
                patch, depth = queue.popleft()
                minimum, index = minimum_with_index(patch)
                if minimum >= 0:
                    leaves.append(patch)
                    maximum_depth = max(maximum_depth, depth)
                    continue
                if depth >= maximum_subdivision_depth:
                    raise AssertionError(
                        f"Delta^{order}, region {region_label}: "
                        f"unresolved Bernstein coefficient {minimum} "
                        f"at {index}, depth {depth}"
                    )
                interiorities = [
                    (
                        min(position, degree - position) / degree
                        if degree
                        else 0
                    )
                    for position, degree in zip(index, degrees)
                ]
                if max(interiorities) > 0:
                    axis = max(
                        range(len(degrees)),
                        key=interiorities.__getitem__,
                    )
                else:
                    axis = axis_order[depth % len(axis_order)]
                left, right = split_bernstein_midpoint(patch, axis)
                queue.append((left, depth + 1))
                queue.append((right, depth + 1))

            positives = [
                value
                for patch in leaves
                for value in patch.flat
                if value > 0
            ]
            summaries.append(
                {
                    "region": region_label,
                    "degrees": degrees,
                    "coefficients": sum(
                        patch.size for patch in leaves
                    ),
                    "zeros": sum(
                        value == 0
                        for patch in leaves
                        for value in patch.flat
                    ),
                    "smallest_positive": (
                        min(positives) if positives else None
                    ),
                    "leaves": len(leaves),
                    "maximum_depth": maximum_depth,
                }
            )
    return summaries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=1)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--region")
    parser.add_argument("--core-order", type=int, default=13)
    parser.add_argument("--coefficient-region")
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--initial-only", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.min_difference <= args.max_difference <= 15

    differences, coefficient_variables = raw_forward_differences()
    verify_q_concavity(differences, coefficient_variables)
    (
        box_variables,
        normalized_variables,
        lower_coefficients,
        regions,
    ) = parameter_data(args.core_order)
    if args.region:
        regions = tuple(item for item in regions if item[0] == args.region)
        if not regions:
            raise ValueError(f"unknown region: {args.region}")

    total = 0
    for order in range(args.min_difference, args.max_difference + 1):
        raw = differences[order - 1]
        summaries = certify_difference(
            order,
            raw,
            coefficient_variables,
            box_variables,
            normalized_variables,
            lower_coefficients,
            regions,
            core_order=args.core_order,
            maximum_subdivision_depth=args.maximum_depth,
            initial_only=args.initial_only,
            selected_coefficient_region=args.coefficient_region,
        )
        count = sum(item["coefficients"] for item in summaries)
        total += count
        print(
            f"Delta^{order}: PASS regions={len(summaries)} "
            f"Bernstein_coefficients={count:,}",
            flush=True,
        )
        if args.initial_only:
            for item in summaries:
                print(
                    f"  {item['region']}: degrees={item['degrees']} "
                    f"minimum={item['initial_minimum']} "
                    f"index={item['initial_index']} "
                    f"monomial_factor={item['monomial_factor']}",
                    flush=True,
                )
    print(
        "rank-5 isolate-payment monotonicity certificate: PASS "
        f"total_Bernstein_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
