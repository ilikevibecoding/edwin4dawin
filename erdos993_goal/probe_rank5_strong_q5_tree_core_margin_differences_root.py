#!/usr/bin/env python3
"""Exact fixed-core scout for strong-Q5 isolate-margin differences."""

from __future__ import annotations

import argparse

import sympy as sp

from certify_rank5_ratio_payment_order28_tree_cells_root import D4_CEILING, root_regions
from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from certify_rank5_ratio_payment_order28_large_cores_root import raw_ratio_margin
from verify_rank5_isolate_payment_margin_monotonicity_root import (
    raw_margin_forward_differences,
)


def certify_adaptive(coefficients, degrees, maximum_depth):
    stack = [(coefficients, 0)]
    leaves = 0
    deepest = 0
    smallest = None
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            smallest = minimum if smallest is None else min(smallest, minimum)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved minimum={minimum} index={index} depth={depth}"
            )
        interiorities = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        axis = (
            max(range(len(degrees)), key=interiorities.__getitem__)
            if max(interiorities) > 0
            else depth % len(degrees)
        )
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    assert smallest is not None
    return leaves, deepest, smallest


def cells(
    core_order: int,
    difference: int,
    maximum_depth: int,
    initial_only: bool,
    selected_branch: str | None,
    selected_region: str | None,
    nonstar_maximum: bool,
    smoothing: int | None,
):
    B, A, T, R = sp.symbols("B A T R", nonnegative=True)
    variables = (B, A, T, R)
    mass = sp.Integer(core_order - 2)
    threshold = mass / 2
    maximum = sp.binomial(
        core_order - 3 if nonstar_maximum else core_order - 2,
        2,
    )
    if smoothing is None:
        raw_differences, coefficient_variables = raw_margin_forward_differences()
        raw = raw_differences[difference - 1]
    else:
        raw, coefficient_variables = raw_ratio_margin(smoothing)
    c0v, c1v, c2v, c3v, c4v, c5v, hv, kv = coefficient_variables
    rows = []
    for branch in ("zero", "cauchy"):
        if selected_branch and branch != selected_branch:
            continue
        if branch == "zero":
            e_low, e_high = sp.S.Zero, threshold
        else:
            e_low, e_high = threshold, maximum
        excess = sp.expand(e_low + (e_high - e_low) * B)
        gamma = (
            sp.S.Zero
            if branch == "zero"
            else sp.expand(excess * (2 * excess - mass) / (3 * mass))
        )
        tau_low = sp.expand(excess + gamma)
        tau_high = sp.expand(sp.Rational(core_order - 1, 3) * excess)
        tau = sp.expand(tau_low + (tau_high - tau_low) * A)
        c3 = sp.expand(sp.binomial(core_order - 2, 3) + excess)
        c4 = sp.expand(
            sp.binomial(core_order - 3, 4)
            + (core_order - 4) * excess
            - tau
        )
        X = sp.cancel(c3 / c4)
        D0 = sp.cancel((2 + X) / 10)
        assert all(
            (D4_CEILING - D0).subs({B: b, A: a}) >= 0
            for b in (0, 1)
            for a in (0, 1)
        )
        for label, r_value, D_value, q_value in root_regions(D0, R, T):
            if selected_region and label != selected_region:
                continue
            c5 = sp.cancel((1 - D_value) * c4**2 / c3)
            value = sp.cancel(
                raw.subs(
                    {
                        c0v: 1,
                        c1v: core_order,
                        c2v: sp.binomial(core_order - 1, 2),
                        c3v: c3,
                        c4v: c4,
                        c5v: c5,
                        hv: r_value * c3,
                        kv: q_value * c4,
                    },
                    simultaneous=True,
                )
            )
            numerator, denominator = sp.fraction(value)
            midpoint = {variable: sp.Rational(1, 2) for variable in variables}
            if denominator.subs(midpoint) < 0:
                numerator, denominator = -numerator, -denominator
            denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
                sp.expand(denominator), variables
            )
            denominator_minimum, _ = minimum_with_index(denominator_coefficients)
            assert denominator_minimum > 0
            degrees, coefficients = tensor_bernstein_fast(
                sp.expand(numerator), variables
            )
            initial_minimum, index = minimum_with_index(coefficients)
            if initial_only or initial_minimum >= 0:
                leaves, depth, terminal_minimum = 1, 0, initial_minimum
            else:
                leaves, depth, terminal_minimum = certify_adaptive(
                    coefficients, degrees, maximum_depth
                )
            rows.append((branch, label, degrees, initial_minimum, index, leaves, depth, terminal_minimum))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-order", type=int, required=True)
    parser.add_argument("--difference", type=int, default=1)
    parser.add_argument("--smoothing", type=int)
    parser.add_argument("--maximum-depth", type=int, default=28)
    parser.add_argument("--initial-only", action="store_true")
    parser.add_argument("--branch", choices=("zero", "cauchy"))
    parser.add_argument("--region")
    parser.add_argument("--nonstar-maximum", action="store_true")
    args = parser.parse_args()
    assert args.core_order >= 20 and 1 <= args.difference <= 15
    assert args.smoothing is None or args.smoothing >= 0
    rows = cells(
        args.core_order,
        args.difference,
        args.maximum_depth,
        args.initial_only,
        args.branch,
        args.region,
        args.nonstar_maximum,
        args.smoothing,
    )
    for row in rows:
        print(
            "CELL", row[0], row[1], "degrees", row[2], "initial", row[3],
            "index", row[4], "leaves", row[5], "depth", row[6],
            "terminal", row[7],
        )
    print(
        "RESULT",
        "INITIAL_ONLY" if args.initial_only else "PASS",
        "minimum",
        min(row[7] for row in rows),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
