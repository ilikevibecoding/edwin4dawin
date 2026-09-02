#!/usr/bin/env python3
"""Search-only d=1 m0 cone using the rigorous quantitative q-gap cap."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from prove_d1_spider_quantitative_qgap_cap_adversary import quantitative_cap
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    certificate_cell,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def scan(maximum_order: int, maximum_R: int, maximum_rank: int) -> dict[str, object]:
    checks = positive = zero = 0
    negative = []
    minimum = None
    branch_counts: dict[str, int] = {}
    for N in range(15, maximum_order + 1):
        for R in range(1, min(N - 2, maximum_R) + 1):
            T = N - 1 - R
            for Y in range(1, min(R, T) + 1):
                B2 = C(R, 2)
                tau = C(R, 3) + (R - 1) * (Y - 1)
                for rank in range(4, min(maximum_rank, N) + 1):
                    cap = quantitative_cap(R, T, Y, rank)
                    if cap is None:
                        continue
                    result = certificate_cell(
                        N, rank, 1, R, T, Y, B2, B2, tau
                    )
                    q3 = Fraction(result["z3"], 3 * result["f3"])
                    qgap_floor = max(Fraction(0), q3 - cap["cap"])
                    f_lower = cap["Hconc_rank"]
                    reserve_lower = (
                        3
                        * rank
                        * result["a"]
                        * result["p0"]
                        * (result["p0"] + result["a"])
                        * result["f3"]
                        * f_lower
                        * qgap_floor
                    )
                    scale = result["certificate_scale"]
                    total = Fraction(result["cleared_certificate"]) + scale * reserve_lower
                    checks += 1
                    branch = str(result["branch"])
                    branch_counts[branch] = branch_counts.get(branch, 0) + 1
                    record = (
                        total,
                        N,
                        rank,
                        R,
                        T,
                        Y,
                        result["cleared_certificate"],
                        scale,
                        qgap_floor,
                        f_lower,
                        cap["Kmax_deep_occupied_Z"],
                    )
                    if minimum is None or record < minimum:
                        minimum = record
                    if total < 0:
                        negative.append(record)
                    elif total == 0:
                        zero += 1
                    else:
                        positive += 1
    return {
        "orders": [15, maximum_order],
        "maximum_R": maximum_R,
        "maximum_rank": maximum_rank,
        "exact_parameter_rank_checks": checks,
        "positive_checks": positive,
        "zero_checks": zero,
        "negative_checks": len(negative),
        "minimum_paid_scaled_lower": minimum,
        "branch_counts": branch_counts,
        "first_negative_parameter_cells": negative[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=250)
    parser.add_argument("--R", type=int, default=30)
    parser.add_argument("--rank", type=int, default=50)
    args = parser.parse_args()
    result = scan(args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print(
        "SEARCH_EXACT_D1_QGAP_PAID_SECTOR_BOUND",
        "PASS" if result["negative_checks"] == 0 else "FAIL",
    )


if __name__ == "__main__":
    main()
