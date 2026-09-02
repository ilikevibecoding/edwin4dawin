#!/usr/bin/env python3
"""Search-only d=1 m0 cone with a direct blockwise q-gap-mass floor.

Unlike the earlier scalar q-cap scan, this keeps the two exact blocks
``F_j=H_j+K_(j-1)`` separate.  This is search evidence only: the imported
row and token-ratio inequalities are theorem-grade, but this parameter scan
does not prove the resulting terminal inequality for unbounded parameters.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from prove_d1_spider_direct_qgap_mass_floor_adversary import direct_mass_floor
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    certificate_cell,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def scan(
    start_order: int,
    maximum_order: int,
    maximum_R: int,
    maximum_rank: int,
) -> dict[str, object]:
    checks = positive = zero = unsupported = negative_base = 0
    negative = []
    minimum = None
    branch_counts: dict[str, int] = {}
    for N in range(start_order, maximum_order + 1):
        for R in range(1, min(N - 2, maximum_R) + 1):
            T = N - 1 - R
            for Y in range(1, min(R, T) + 1):
                B2 = C(R, 2)
                tau = C(R, 3) + (R - 1) * (Y - 1)
                for rank in range(4, min(maximum_rank, N) + 1):
                    result = certificate_cell(N, rank, 1, R, T, Y, B2, B2, tau)
                    cleared = int(result["cleared_certificate"])
                    scale = int(result["certificate_scale"])
                    # A nonnegative retained-hprev certificate needs no
                    # quantitative q-gap payment (including unsupported top
                    # Hconc rows).
                    if cleared >= 0:
                        total = Fraction(cleared)
                        mass = {
                            "mass_floor": Fraction(0),
                            "raw_block_floor": Fraction(0),
                            "H_slope": Fraction(0),
                            "K_slope": Fraction(0),
                            "K_endpoint": 0,
                        }
                    else:
                        negative_base += 1
                        q3 = Fraction(result["z3"], 3 * result["f3"])
                        mass = direct_mass_floor(R, T, Y, rank, q3)
                        if mass is None:
                            unsupported += 1
                            continue
                        reserve_lower = (
                            3
                            * rank
                            * result["a"]
                            * result["p0"]
                            * (result["p0"] + result["a"])
                            * result["f3"]
                            * mass["mass_floor"]
                        )
                        total = Fraction(cleared) + scale * reserve_lower
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
                        cleared,
                        scale,
                        mass["mass_floor"],
                        mass["raw_block_floor"],
                        mass["H_slope"],
                        mass["K_slope"],
                        mass["K_endpoint"],
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
        "orders": [start_order, maximum_order],
        "maximum_R": maximum_R,
        "maximum_rank": maximum_rank,
        "exact_parameter_rank_checks": checks,
        "positive_checks": positive,
        "zero_checks": zero,
        "unsupported_h_term_or_row": unsupported,
        "negative_base_certificate_checks": negative_base,
        "negative_checks": len(negative),
        "minimum_paid_scaled_lower": minimum,
        "branch_counts": branch_counts,
        "first_negative_parameter_cells": negative[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=250)
    parser.add_argument("--R", type=int, default=30)
    parser.add_argument("--rank", type=int, default=50)
    args = parser.parse_args()
    result = scan(args.start_order, args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print(
        "SEARCH_EXACT_D1_DIRECT_QGAP_MASS_PAID",
        "PASS" if result["negative_checks"] == 0 else "FAIL",
    )


if __name__ == "__main__":
    main()
