#!/usr/bin/env python3
"""Exact search and symbolic setup for the d=1 canonical-H j=4 sector.

The scan is evidence only until every unbounded parameter cone is certified.
"""

from __future__ import annotations

import argparse

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import block_data
from prove_d1_canonical_h_retained_dprev_reduction_adversary import (
    canonical_h_lower,
    exact_k_lower,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--s-max", type=int, default=100)
    args = parser.parse_args()
    rank = 4
    checks = positives = zeros = negatives = 0
    minimum_positive = None
    first_negative = []
    branch_counts: dict[tuple[str, str], int] = {}
    for S in range(14, args.s_max + 1):
        N = S + 1
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                data = block_data(N, rank, R, T, Y)
                Hlower, details = canonical_h_lower(
                    R, T, Y, rank, data["lead"], data["BH"]
                )
                Klower, Z = exact_k_lower(
                    T, Y, rank, data["lead"], data["BK"]
                )
                total = Hlower + Klower
                record = (total, N, R, T, Y, Hlower, Klower, Z)
                branch = (str(data["H_cap_branch"]), str(data["K_cap_branch"]))
                branch_counts[branch] = branch_counts.get(branch, 0) + 1
                if total > 0:
                    positives += 1
                    minimum_positive = (
                        record
                        if minimum_positive is None
                        else min(minimum_positive, record)
                    )
                elif total == 0:
                    zeros += 1
                else:
                    negatives += 1
                    if len(first_negative) < 20:
                        first_negative.append(record)
                assert details["lower_slack"] >= 0
                checks += 1
    print("SEARCH_ONLY")
    print("box", {"S": [14, args.s_max], "j": 4})
    print("checks", checks, "positive", positives, "zero", zeros, "negative", negatives)
    print("minimum_positive", minimum_positive)
    print("first_negative", first_negative)
    print("branches", branch_counts)


if __name__ == "__main__":
    main()
