#!/usr/bin/env python3
"""Certify Delta^2 through Delta^6 of the terminal-broom residual.

The certificate uses the full exact tree coefficient cone:

* the path/star interval for c2/c3;
* the rank-3 reserve and two-extension interval for c3/c4;
* the rank-4 reserve and the proved rank-(3,4,5) defect ceiling;
* the rank-5 reserve and the forest two-extension ceiling at rank 6;
* both endpoints of the rooted-cross interval for h5/c5.

Every rational map is over-cleared by an explicitly positive common
denominator, and the resulting unit-box polynomials are checked by
exact tensor Bernstein coefficients.
"""

from __future__ import annotations

import argparse
from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank6_terminal_bundle_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


CORE_ORDER = 18
D4_CEILING = sp.Rational(1559, 3575)


def positive_fraction(expression, box_variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    midpoint = {
        variable: sp.Rational(1, 2)
        for variable in box_variables
    }
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    degrees, coefficients = tensor_bernstein_fast(
        sp.expand(denominator), box_variables
    )
    minimum, index = minimum_with_index(coefficients)
    if minimum < 0:
        raise AssertionError(
            "map denominator lacks a positive certificate: "
            f"degrees={degrees}, minimum={minimum}, index={index}"
        )
    assert denominator.subs(midpoint) > 0
    return sp.expand(numerator), sp.expand(denominator)


def coefficient_map(
    box_variables,
    endpoint,
    d5_endpoint,
    d4_endpoint,
):
    T, W, A, R = box_variables
    order = sp.Rational(CORE_ORDER, 1) / T

    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / (
        (order - 3) * (order - 4)
    )
    w = sp.factor(w_low + (w_high - w_low) * W)

    x3_low = 8 * w / (6 - w)
    x3_high = 4 * w / (3 * (1 - w))
    x3 = sp.factor(x3_low + (x3_high - x3_low) * A)

    d4_low = (2 + x3) / 10
    if d4_endpoint == "q4":
        d4 = d4_low
    elif d4_endpoint == "defect":
        d4 = D4_CEILING
    else:
        raise ValueError(d4_endpoint)

    c0 = sp.factor(2 * w / ((order - 1) * (order - 2)))
    c1 = sp.factor(order * c0)
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x3
    c5 = (1 - d4) / x3**2

    x5 = sp.factor(c4 / c5)
    d5_low = (2 + x5) / 12
    # The forest two-extension inequality at k=4 gives
    # c6 >= 5c5^2/(6c4)-c5/2, equivalently D5<=1/6+x5/2.
    d5_high = sp.Rational(1, 6) + x5 / 2
    if d5_endpoint == "q5":
        d5 = d5_low
    elif d5_endpoint == "extension":
        d5 = d5_high
    else:
        raise ValueError(d5_endpoint)
    c6 = sp.factor((1 - d5) * c5**2 / c4)

    root_r = sp.Rational(1, 2) + R / 2
    if endpoint == "cross":
        root_q = root_r - d5 / 2
    elif endpoint == "upper":
        root_q = sp.S.One
    else:
        raise ValueError(endpoint)
    h4 = root_r * c4
    h5 = root_q * c5

    return (c0, c1, c2, c3, c4, c5, c6, h4, h5)


def cleared_polynomial(
    raw,
    coefficient_variables,
    box_variables,
    endpoint,
    d5_endpoint,
    d4_endpoint,
):
    mapped = coefficient_map(
        box_variables, endpoint, d5_endpoint, d4_endpoint
    )
    rational = sp.together(
        raw.subs(
            dict(zip(coefficient_variables, mapped)),
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(rational)
    midpoint = {
        variable: sp.Rational(1, 2)
        for variable in box_variables
    }
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    denominator_degrees, denominator_coefficients = (
        tensor_bernstein_fast(
            sp.expand(denominator), box_variables
        )
    )
    denominator_minimum, denominator_index = minimum_with_index(
        denominator_coefficients
    )
    if denominator_minimum < 0:
        raise AssertionError(
            "combined denominator lacks a positive certificate: "
            f"degrees={denominator_degrees}, "
            f"minimum={denominator_minimum}, "
            f"index={denominator_index}"
        )
    return sp.expand(numerator)


def certify_patch(coefficients, maximum_depth):
    queue = deque([(coefficients, 0)])
    leaves = 0
    deepest = 0
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved patch minimum={minimum}, index={index}, "
                f"depth={depth}"
            )
        interiorities = [
            (
                min(position, degree - position) / degree
                if degree > 0
                else 0
            )
            for position, size in zip(index, patch.shape)
            for degree in (size - 1,)
        ]
        axis = max(
            range(patch.ndim),
            key=interiorities.__getitem__,
        )
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return leaves, deepest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=2)
    parser.add_argument("--max-difference", type=int, default=6)
    parser.add_argument(
        "--endpoint",
        choices=("cross", "upper", "both"),
        default="both",
    )
    parser.add_argument(
        "--d4-endpoint",
        choices=("q4", "defect", "both"),
        default="both",
    )
    parser.add_argument(
        "--d5-endpoint",
        choices=("q5", "extension", "both"),
        default="both",
    )
    parser.add_argument("--maximum-depth", type=int, default=24)
    parser.add_argument("--initial-only", action="store_true")
    args = parser.parse_args()
    assert 2 <= args.min_difference <= args.max_difference <= 6

    differences = newton_coefficients(exact_decomposition())
    coefficient_variables = (*c[:7], h[4], h[5])
    box_variables = sp.symbols("T W A R", nonnegative=True)
    endpoints = (
        ("cross", "upper")
        if args.endpoint == "both"
        else (args.endpoint,)
    )
    d5_endpoints = (
        ("q5", "extension")
        if args.d5_endpoint == "both"
        else (args.d5_endpoint,)
    )
    d4_endpoints = (
        ("q4", "defect")
        if args.d4_endpoint == "both"
        else (args.d4_endpoint,)
    )

    total = 0
    for rank in range(
        args.min_difference, args.max_difference + 1
    ):
        for endpoint in endpoints:
            for d5_endpoint in d5_endpoints:
                for d4_endpoint in d4_endpoints:
                    label = (
                        f"{endpoint}/{d5_endpoint}/{d4_endpoint}"
                    )
                    print(
                        f"Delta^{rank} endpoint={label}: "
                        "building exact numerator",
                        flush=True,
                    )
                    polynomial = cleared_polynomial(
                        differences[rank],
                        coefficient_variables,
                        box_variables,
                        endpoint,
                        d5_endpoint,
                        d4_endpoint,
                    )
                    degrees, coefficients = tensor_bernstein_fast(
                        polynomial, box_variables
                    )
                    minimum, index = minimum_with_index(coefficients)
                    if args.initial_only:
                        leaves, deepest = 1, 0
                    else:
                        leaves, deepest = certify_patch(
                            coefficients, args.maximum_depth
                        )
                    count = leaves * coefficients.size
                    total += count
                    print(
                        f"Delta^{rank} endpoint={label}: "
                        f"degrees={degrees} "
                        f"initial_minimum={minimum} "
                        f"initial_index={index} leaves={leaves} "
                        f"max_depth={deepest} "
                        f"leaf_coefficients={count:,}",
                        flush=True,
                    )
    print(
        "rank-6 terminal-bundle middle differences: PASS "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
