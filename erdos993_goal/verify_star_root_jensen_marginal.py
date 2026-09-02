#!/usr/bin/env python3
"""Verify the marginal-square and rational Jensen-reserve reductions.

For a star forest with leaf counts a_1,...,a_s, write

    K(x)=prod_i ((1+x)^a_i+x),   M=sum_i a_i.

At rank k define the switchable-block marginal

    p_i = 2 [x^(k-1)] K/S_ai / K_k.

The proposed marginal-square lemma is

    sum_i p_i^2 <= k^2/M.

It implies, by the weighted-leaf representation and Jensen's
inequality,

    G_kk >= K_k^2 (3/4)^(k^2/M),

where G_kk counts ordered compatible pairs of rank-k independent
sets.  To keep the finite reserve check integer-only, this program
uses the weaker rational lower bound

    G_kk >= K_k^2 (3/4)^ceil(k^2/M).

The program checks both the exact marginal inequality and whether that
rational lower bound pays the diagonal debt (k+1)D_k.  The latter is a
finite diagnostic, not a proof of the all-parameter debt inequality.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import ceil
from pathlib import Path

from find_min_star_root_pird_failure import (
    build,
    partitions_with_cost,
    star,
)


def divide_exact(dividend: list[int], divisor: list[int]) -> list[int]:
    """Divide polynomials with constant coefficient one."""
    quotient = [0] * (len(dividend) - len(divisor) + 1)
    remainder = dividend[:]
    for i in range(len(quotient)):
        quotient[i] = remainder[i]
        if quotient[i]:
            for j, value in enumerate(divisor):
                remainder[i + j] -= quotient[i] * value
    assert all(value == 0 for value in remainder[len(quotient) :])
    return quotient


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    branch_multisets = 0
    marginal_checks = 0
    adverse_debt_checks = 0
    first_marginal_failure = None
    first_rational_reserve_failure = None
    largest_marginal_ratio = Fraction(0)
    largest_marginal_case = None
    smallest_reserve_ratio = None
    smallest_reserve_case = None

    for order in range(1, args.n_max + 1):
        order_multisets = 0
        for branches in partitions_with_cost(order - 1):
            branch_multisets += 1
            order_multisets += 1
            if not branches:
                continue

            m = sum(branches)
            k_poly, l_poly, _ = build(branches)
            deleted = [
                divide_exact(k_poly, star(leaves))
                for leaves in branches
            ]

            for k in range(1, len(k_poly)):
                derivative_square_sum = sum(
                    (
                        2
                        * (
                            quotient[k - 1]
                            if k - 1 < len(quotient)
                            else 0
                        )
                    )
                    ** 2
                    for quotient in deleted
                )
                marginal_left = m * derivative_square_sum
                marginal_right = k * k * k_poly[k] * k_poly[k]
                marginal_checks += 1
                marginal_ratio = Fraction(
                    marginal_left,
                    marginal_right,
                )
                if marginal_ratio > largest_marginal_ratio:
                    largest_marginal_ratio = marginal_ratio
                    largest_marginal_case = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "ratio_numerator": marginal_ratio.numerator,
                        "ratio_denominator": marginal_ratio.denominator,
                        "ratio_decimal": float(marginal_ratio),
                    }
                if (
                    marginal_left > marginal_right
                    and first_marginal_failure is None
                ):
                    first_marginal_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "left": marginal_left,
                        "right": marginal_right,
                    }
                    break

                if k + 1 >= len(k_poly) or k >= len(l_poly):
                    continue
                debt = (
                    k_poly[k + 1]
                    * (
                        l_poly[k - 1]
                        + (l_poly[k - 2] if k >= 2 else 0)
                    )
                    - k_poly[k] * (l_poly[k] + l_poly[k - 1])
                )
                if debt <= 0:
                    continue

                exponent = ceil(k * k / m)
                reserve_left = k_poly[k] ** 2 * 3**exponent
                reserve_right = 4**exponent * (k + 1) * debt
                adverse_debt_checks += 1
                reserve_ratio = Fraction(reserve_left, reserve_right)
                if (
                    smallest_reserve_ratio is None
                    or reserve_ratio < smallest_reserve_ratio
                ):
                    smallest_reserve_ratio = reserve_ratio
                    smallest_reserve_case = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "ceiling_exponent": exponent,
                        "debt": debt,
                        "ratio_numerator": reserve_ratio.numerator,
                        "ratio_denominator": reserve_ratio.denominator,
                        "ratio_decimal": float(reserve_ratio),
                    }
                if (
                    reserve_left < reserve_right
                    and first_rational_reserve_failure is None
                ):
                    first_rational_reserve_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "ceiling_exponent": exponent,
                        "left": reserve_left,
                        "right": reserve_right,
                    }
                    break
            if (
                first_marginal_failure is not None
                or first_rational_reserve_failure is not None
            ):
                break
        print(
            f"n={order}: multisets={order_multisets:,}; "
            f"marginal_checks={marginal_checks:,}; "
            f"adverse_debts={adverse_debt_checks:,}",
            flush=True,
        )
        if (
            first_marginal_failure is not None
            or first_rational_reserve_failure is not None
        ):
            break

    report = {
        "status": (
            "FAILURE_FOUND"
            if (
                first_marginal_failure is not None
                or first_rational_reserve_failure is not None
            )
            else "PASS_NOT_PROOF"
        ),
        "parameters": {"n_max": args.n_max},
        "branch_multisets": branch_multisets,
        "marginal_checks": marginal_checks,
        "adverse_debt_checks": adverse_debt_checks,
        "first_marginal_failure": first_marginal_failure,
        "first_rational_reserve_failure":
            first_rational_reserve_failure,
        "largest_marginal_ratio": largest_marginal_case,
        "smallest_rational_reserve_ratio": smallest_reserve_case,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if report["status"] == "FAILURE_FOUND" else 0


if __name__ == "__main__":
    raise SystemExit(main())
