#!/usr/bin/env python3
"""Certify monotonicity of the full strong-Q5 terminal payment margin.

This strengthens ``verify_rank5_isolate_payment_monotonicity.py`` by applying
the same exact low-rank cone to

    R_s = M_s - a_s d_s e_s (a_s + d_s),

which is the quantity actually required by the strong-Q5 preservation
identity.  If every forward difference at zero is nonnegative, then the
Newton expansion proves R_s >= R_0 for every integer s >= 0.
"""

from __future__ import annotations

import argparse
import math

import sympy as sp

from verify_rank5_isolate_payment_monotonicity import (
    certify_difference,
    parameter_data,
    verify_q_concavity,
)
from verify_rank5_leaf_induction_reduction import rooted_payment


def raw_margin_forward_differences():
    c0, c1, c2, c3, c4, c5, h, k = sp.symbols(
        "c0 c1 c2 c3 c4 c5 h k", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def smoothed(rank: int, smoothing: int):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def margin(smoothing: int):
        d, e, f = (smoothed(rank, smoothing) for rank in (3, 4, 5))
        a = e + h
        b = f + k
        return sp.expand(rooted_payment(a, b, d, e, f) - a * d * e * (a + d))

    values = [margin(smoothing) for smoothing in range(17)]
    differences = []
    for _ in range(1, 16):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        differences.append(values[0])
    assert sp.expand(values[1] - values[0]) == 0
    return differences, (c0, c1, c2, c3, c4, c5, h, k)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=1)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--region")
    parser.add_argument("--core-order", type=int, default=20)
    parser.add_argument("--coefficient-region")
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--initial-only", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.min_difference <= args.max_difference <= 15

    differences, coefficient_variables = raw_margin_forward_differences()
    # The subtracted target is independent of k, so the concavity endpoint
    # reduction in k is unchanged; verify that identity directly.
    verify_q_concavity(differences, coefficient_variables)
    box_variables, normalized_variables, lower_coefficients, regions = parameter_data(
        args.core_order
    )
    if args.region:
        regions = tuple(item for item in regions if item[0] == args.region)
        if not regions:
            raise ValueError(f"unknown region: {args.region}")

    total = 0
    for order in range(args.min_difference, args.max_difference + 1):
        summaries = certify_difference(
            order,
            differences[order - 1],
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
            f"Margin Delta^{order}: PASS regions={len(summaries)} "
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
        "rank-5 isolate-payment-margin monotonicity certificate: PASS "
        f"total_Bernstein_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
