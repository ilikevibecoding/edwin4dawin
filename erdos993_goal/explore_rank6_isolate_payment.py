#!/usr/bin/env python3
"""Explore sibling-isolate smoothing of the rank-6 leaf payment.

For a rooted tree A with H=A-root, put C_s=sK_1 union A.  The
terminal rank-6 leaf payment is built from

    d_s=i_4(C_s), e_s=i_5(C_s), f_s=i_6(C_s),
    a_s=e_s+i_4(H), b_s=f_s+i_5(H).

This script constructs M_s symbolically, reports its exact degree and
the signs of its Newton coefficients, and can scan rooted trees.
"""

from __future__ import annotations

import argparse
import math

import sympy as sp

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from scan_rank4_three_halves_leaf_finite import trees_of_order
from verify_general_q_leaf_payment_identity import payment


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if 0 <= rank < len(polynomial) else 0


def raw_forward_differences():
    coefficients = sp.symbols(
        "c0 c1 c2 c3 c4 c5 c6 h k", nonnegative=True
    )
    core = coefficients[:7]
    h, k = coefficients[7:]

    def smoothed(rank: int, smoothing: int):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def value(smoothing: int):
        d, e, f = (
            smoothed(rank, smoothing) for rank in (4, 5, 6)
        )
        return sp.expand(payment(6, e + h, f + k, d, e, f))

    # The crude degree bound is 20.  One extra value proves termination.
    values = [value(smoothing) for smoothing in range(22)]
    initial = values[0]
    differences = []
    while len(values) > 1:
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        differences.append(values[0])
    while differences and differences[-1] == 0:
        differences.pop()
    return initial, differences, coefficients


def payment_values(core, deleted, count: int):
    h = coefficient(deleted, 4)
    k = coefficient(deleted, 5)
    values = []
    for smoothing in range(count):
        smoothed = [
            sum(
                math.comb(smoothing, offset)
                * coefficient(core, rank - offset)
                for offset in range(min(smoothing, rank) + 1)
            )
            for rank in range(7)
        ]
        d, e, f = smoothed[4:7]
        values.append(payment(6, e + h, f + k, d, e, f))
    return values


def finite_scan(maximum_order: int, degree: int) -> None:
    for order in range(1, maximum_order + 1):
        rooted = 0
        minimum_m0 = None
        minimum_m1 = None
        minima = [None] * degree
        for tree in trees_of_order(order):
            deleted_by_root, core = all_root_states(tree, 6)
            for deleted in deleted_by_root.values():
                rooted += 1
                values = payment_values(core, deleted, degree + 2)
                minimum_m0 = (
                    values[0]
                    if minimum_m0 is None
                    else min(minimum_m0, values[0])
                )
                minimum_m1 = (
                    values[1]
                    if minimum_m1 is None
                    else min(minimum_m1, values[1])
                )
                for difference_order in range(degree):
                    values = [
                        values[index + 1] - values[index]
                        for index in range(len(values) - 1)
                    ]
                    value = values[0]
                    minima[difference_order] = (
                        value
                        if minima[difference_order] is None
                        else min(minima[difference_order], value)
                    )
        print(
            f"core_n={order} rooted={rooted:,} "
            f"min_M0={minimum_m0} min_M1={minimum_m1} "
            f"min_Delta1={minima[0]} "
            f"negative_differences="
            f"{[j + 1 for j, value in enumerate(minima) if value < 0]}",
            flush=True,
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-order", type=int, default=12)
    parser.add_argument("--symbolic-only", action="store_true")
    args = parser.parse_args()
    initial, differences, variables = raw_forward_differences()
    print(
        f"rank-6 isolate payment degree={len(differences)} "
        f"M0_terms={len(sp.Poly(initial, *variables).terms())}"
    )
    for order, difference in enumerate(differences, start=1):
        terms = sp.Poly(difference, *variables).terms()
        print(
            f"Delta^{order}: terms={len(terms)} "
            f"negative_coefficients="
            f"{len([value for _, value in terms if value < 0])}"
        )
    if not args.symbolic_only:
        finite_scan(args.maximum_order, len(differences))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
