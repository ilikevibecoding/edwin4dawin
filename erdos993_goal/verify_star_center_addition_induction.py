#!/usr/bin/env python3
"""Test the proposed one-center induction for every star-root multiset.

Let R be the independence polynomial of an existing star forest and let
L_0=(1+x)^m, where m is the number of its leaves.  For a new star with
a>=2 leaves, put

    W = R(1+x)^a,
    K = R((1+x)^a+x),
    L = L_0(1+x)^a.

The proposed inductive comparison is

    a Delta_k(K,L) >= (a-1) Delta_k(W,L),

where Delta is the star-root PIRD minor.  If this holds universally,
one may add the non-unit star centres one at a time, beginning with the
already-proved all-unit family.

This program is an exact finite search, not a proof.  It enumerates each
star-branch multiset by rooted-tree order, deletes each distinct
non-unit centre in turn, and checks every coefficient index.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from find_min_star_root_pird_failure import (
    binomial,
    build,
    conv,
    partitions_with_cost,
    star,
)


def coefficient(poly: list[int], index: int) -> int:
    return poly[index] if 0 <= index < len(poly) else 0


def delta(k_poly: list[int], l_poly: list[int], k: int) -> int:
    return (
        coefficient(k_poly, k) ** 2
        - coefficient(k_poly, k - 1) * coefficient(k_poly, k + 1)
        + coefficient(k_poly, k)
        * (coefficient(l_poly, k) + coefficient(l_poly, k - 1))
        - coefficient(k_poly, k + 1)
        * (coefficient(l_poly, k - 1) + coefficient(l_poly, k - 2))
    )


def remove_one(
    branches: tuple[int, ...],
    selected_index: int,
) -> tuple[int, ...]:
    return branches[:selected_index] + branches[selected_index + 1 :]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    branch_multisets = 0
    center_deletions = 0
    rank_checks = 0
    first_failure = None
    minimum_comparison_ratio = None
    minimum_comparison_case = None
    zero_baseline_cases = 0

    for order in range(1, args.n_max + 1):
        order_multisets = 0
        order_deletions = 0
        for branches in partitions_with_cost(order - 1):
            branch_multisets += 1
            order_multisets += 1
            if not branches:
                continue

            new_poly, l_poly, _ = build(branches)
            last_selected_size = None
            for selected_index, leaves in enumerate(branches):
                if leaves < 2 or leaves == last_selected_size:
                    continue
                last_selected_size = leaves
                old_branches = remove_one(branches, selected_index)
                old_poly, _, _ = build(old_branches)
                baseline_poly = conv(old_poly, binomial(leaves))
                assert new_poly == conv(old_poly, star(leaves))

                center_deletions += 1
                order_deletions += 1
                upper = max(len(new_poly), len(baseline_poly), len(l_poly))
                for k in range(1, upper):
                    new_delta = delta(new_poly, l_poly, k)
                    baseline_delta = delta(baseline_poly, l_poly, k)
                    cleared = (
                        leaves * new_delta
                        - (leaves - 1) * baseline_delta
                    )
                    rank_checks += 1
                    if cleared < 0 and first_failure is None:
                        first_failure = {
                            "rooted_tree_order": order,
                            "star_leaf_counts": list(branches),
                            "deleted_center_leaf_count": leaves,
                            "k": k,
                            "new_delta": new_delta,
                            "baseline_delta": baseline_delta,
                            "cleared_difference": cleared,
                        }
                        break

                    if baseline_delta > 0 and leaves > 1:
                        ratio = Fraction(
                            leaves * new_delta,
                            (leaves - 1) * baseline_delta,
                        )
                        if (
                            minimum_comparison_ratio is None
                            or ratio < minimum_comparison_ratio
                        ):
                            minimum_comparison_ratio = ratio
                            minimum_comparison_case = {
                                "rooted_tree_order": order,
                                "star_leaf_counts": list(branches),
                                "deleted_center_leaf_count": leaves,
                                "k": k,
                                "new_delta": new_delta,
                                "baseline_delta": baseline_delta,
                                "cleared_difference": cleared,
                                "ratio_numerator": ratio.numerator,
                                "ratio_denominator": ratio.denominator,
                                "ratio_decimal": float(ratio),
                            }
                    elif baseline_delta == 0:
                        zero_baseline_cases += 1
                if first_failure is not None:
                    break
            if first_failure is not None:
                break
        print(
            f"n={order}: multisets={order_multisets:,}; "
            f"deletions={order_deletions:,}; "
            f"checks={rank_checks:,}",
            flush=True,
        )
        if first_failure is not None:
            break

    report = {
        "status": "FAILURE_FOUND" if first_failure else "PASS_NOT_PROOF",
        "parameters": {"n_max": args.n_max},
        "branch_multisets": branch_multisets,
        "distinct_nonunit_center_deletions": center_deletions,
        "rank_checks": rank_checks,
        "zero_baseline_cases": zero_baseline_cases,
        "first_failure": first_failure,
        "minimum_comparison_case": minimum_comparison_case,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
