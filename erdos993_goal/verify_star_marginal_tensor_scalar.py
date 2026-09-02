#!/usr/bin/env python3
"""Verify the scalar tensorization condition for ordered star addition.

Assume the marginal-square lemma for a star forest R with M leaves.
Add a new star with a leaves, where a is at least every old branch
size.  Put S_a=(1+x)^a+x and K=R S_a.  For rank k define

    A = sum_t (S_a)_t (k-t) R_(k-t),   h=R_(k-1).

Minkowski's inequality shows that the marginal-square lemma for the
enlarged forest follows from the scalar condition

    (M+a)(A^2+4 M h^2) <= M k^2 K_k^2.

This program checks that condition exactly over a finite range.  It is
not an all-parameter proof.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from find_min_star_root_pird_failure import (
    build,
    conv,
    partitions_with_cost,
    star,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--old-cost-max", type=int, default=30)
    parser.add_argument("--new-leaves-max", type=int, default=30)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    old_multisets = 0
    additions = 0
    rank_checks = 0
    first_failure = None
    largest_ratio = Fraction(0)
    largest_case = None

    for cost in range(2, args.old_cost_max + 1):
        cost_multisets = 0
        for old_branches in partitions_with_cost(cost):
            if not old_branches:
                continue
            old_multisets += 1
            cost_multisets += 1
            m = sum(old_branches)
            old_poly, _, _ = build(old_branches)
            minimum_new_size = max(old_branches)
            for leaves in range(
                minimum_new_size,
                args.new_leaves_max + 1,
            ):
                additions += 1
                factor = star(leaves)
                new_poly = conv(old_poly, factor)
                for k in range(1, len(new_poly)):
                    a_value = sum(
                        factor_value
                        * (k - t)
                        * (
                            old_poly[k - t]
                            if 0 <= k - t < len(old_poly)
                            else 0
                        )
                        for t, factor_value in enumerate(factor)
                    )
                    h_value = (
                        old_poly[k - 1]
                        if k - 1 < len(old_poly)
                        else 0
                    )
                    left = (m + leaves) * (
                        a_value * a_value
                        + 4 * m * h_value * h_value
                    )
                    right = (
                        m * k * k * new_poly[k] * new_poly[k]
                    )
                    rank_checks += 1
                    ratio = Fraction(left, right)
                    if ratio > largest_ratio:
                        largest_ratio = ratio
                        largest_case = {
                            "old_star_leaf_counts":
                                list(old_branches),
                            "new_star_leaf_count": leaves,
                            "k": k,
                            "ratio_numerator": ratio.numerator,
                            "ratio_denominator": ratio.denominator,
                            "ratio_decimal": float(ratio),
                        }
                    if left > right and first_failure is None:
                        first_failure = {
                            "old_star_leaf_counts":
                                list(old_branches),
                            "new_star_leaf_count": leaves,
                            "k": k,
                            "left": left,
                            "right": right,
                        }
                        break
                if first_failure is not None:
                    break
            if first_failure is not None:
                break
        print(
            f"old_cost={cost}: multisets={cost_multisets:,}; "
            f"checks={rank_checks:,}",
            flush=True,
        )
        if first_failure is not None:
            break

    report = {
        "status": (
            "FAILURE_FOUND"
            if first_failure is not None
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            "old_cost_max": args.old_cost_max,
            "new_leaves_max": args.new_leaves_max,
        },
        "old_branch_multisets": old_multisets,
        "ordered_star_additions": additions,
        "rank_checks": rank_checks,
        "first_failure": first_failure,
        "largest_ratio": largest_case,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
