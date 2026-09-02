#!/usr/bin/env python3
"""Search-only scan of the corrected d=1 critical-Z payment lower."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import (
    block_data,
    coefficient,
    h_lower,
    tangent_ratio,
)
from prove_balanced_subdivided_star_m0_row_correlation_adversary import h_max_row
from prove_d1_spider_quantitative_qgap_cap_adversary import (
    h_concentrated_row,
    k_coefficient_ceiling,
)
from prove_balanced_subdivided_star_m0_row_correlation_adversary import path_row


def corrected_k_values(T, Y, rank, lead, BK):
    if T == Y:
        value = lead * coefficient([1], rank)  # overwritten below by binomial row
        from math import comb

        C = lambda n, k: comb(n, k) if 0 <= k <= n else 0
        return [(lead * C(Y, rank) + BK * C(Y, rank - 1), 0)]
    rho = tangent_ratio(T, rank - 1)
    common = lead * rho + BK
    global_ceiling = k_coefficient_ceiling(T, Y, rank - 1)[0]
    values = []
    for Z in range(1, min(Y, T - Y) + 1):
        canonical = h_concentrated_row(Y, T - Y, Z)
        previous = coefficient(canonical, rank - 1)
        current = coefficient(canonical, rank)
        if common >= 0:
            value = lead * current + BK * previous
        else:
            value = lead * (current - rho * previous) + common * global_ceiling
        values.append((value, Z))
    return values


def matching_ceiling(T: int, Y: int, rank: int) -> int:
    matching = (T - Y + 1) // 2
    isolates = T - 2 * matching
    return sum(
        comb(matching, selected_edges)
        * (2**selected_edges)
        * (
            comb(isolates, rank - selected_edges)
            if 0 <= rank - selected_edges <= isolates
            else 0
        )
        for selected_edges in range(min(rank, matching) + 1)
    )


def scan(start_order, maximum_order, maximum_R, maximum_rank):
    checks = negatives = positives = zeros = 0
    minimum = minimum_positive = None
    first_negative = []
    branch_counts = {}
    critical_sizes = {}
    negative_without_K_residual = []
    negative_without_K_residual_ranks = {}
    negative_with_edgeless_K_ceiling_ranks = {}
    negative_hprev_scalar_payment_ranks = {}
    failed_hprev_dominations = []
    negative_gap_binomial_K_ceiling_ranks = {}
    negative_matching_K_ceiling_ranks = {}
    minimum_matching_crude_normalized = None
    negative_path_H_matching_K_ranks = {}
    for N in range(start_order, maximum_order + 1):
        for R in range(1, min(maximum_R, N - 2) + 1):
            T = N - 1 - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(4, min(maximum_rank, N) + 1):
                    data = block_data(N, rank, R, T, Y)
                    Hlower, Hcommon = h_lower(
                        R, T, Y, rank, data["lead"], data["BH"]
                    )
                    values = corrected_k_values(
                        T, Y, rank, data["lead"], data["BK"]
                    )
                    Klower, Z = min(values)
                    total = Hlower + Klower
                    record = (
                        total,
                        N,
                        rank,
                        R,
                        T,
                        Y,
                        Hlower,
                        Klower,
                        Z,
                    )
                    minimum = record if minimum is None else min(minimum, record)
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
                    rho = tangent_ratio(T, rank - 1)
                    Kcommon = data["lead"] * rho + data["BK"]
                    if Kcommon < 0:
                        kceil = k_coefficient_ceiling(T, Y, rank - 1)[0]
                        crude = Hlower + Kcommon * kceil
                    else:
                        kceil = k_coefficient_ceiling(T, Y, rank - 1)[0]
                        crude = Hlower
                    if crude < 0:
                        negative_without_K_residual_ranks[str(rank)] = (
                            negative_without_K_residual_ranks.get(str(rank), 0) + 1
                        )
                        if len(negative_without_K_residual) < 20:
                            negative_without_K_residual.append(
                                (crude, N, rank, R, T, Y)
                            )
                    if Kcommon < 0:
                        edgeless_crude = Hlower + Kcommon * (
                            comb(T, rank - 1) if rank - 1 <= T else 0
                        )
                    else:
                        edgeless_crude = Hlower
                    if edgeless_crude < 0:
                        negative_with_edgeless_K_ceiling_ranks[str(rank)] = (
                            negative_with_edgeless_K_ceiling_ranks.get(str(rank), 0)
                            + 1
                        )
                    if Kcommon < 0:
                        gap_ceiling = min(
                            comb(T, rank - 1) if rank - 1 <= T else 0,
                            comb(T + Y - (rank - 1), rank - 1)
                            if rank - 1 <= T + Y - (rank - 1)
                            else 0,
                        )
                        gap_crude = Hlower + Kcommon * gap_ceiling
                    else:
                        gap_crude = Hlower
                    if gap_crude < 0:
                        negative_gap_binomial_K_ceiling_ranks[str(rank)] = (
                            negative_gap_binomial_K_ceiling_ranks.get(str(rank), 0)
                            + 1
                        )
                    if Kcommon < 0:
                        matching_crude = Hlower + Kcommon * matching_ceiling(
                            T, Y, rank - 1
                        )
                    else:
                        matching_crude = Hlower
                    if matching_crude < 0:
                        negative_matching_K_ceiling_ranks[str(rank)] = (
                            negative_matching_K_ceiling_ranks.get(str(rank), 0)
                            + 1
                        )
                    pS = path_row(R + T, rank + 1)
                    path_Hlower = (
                        data["lead"]
                        * (
                            coefficient(pS, rank - 1)
                            + coefficient(pS, rank + 1)
                        )
                        + data["BH"] * coefficient(pS, rank)
                    )
                    if Kcommon < 0:
                        path_matching_crude = (
                            path_Hlower
                            + Kcommon * matching_ceiling(T, Y, rank - 1)
                        )
                    else:
                        path_matching_crude = path_Hlower
                    if path_matching_crude < 0:
                        negative_path_H_matching_K_ranks[str(rank)] = (
                            negative_path_H_matching_K_ranks.get(str(rank), 0) + 1
                        )
                    matching_denominator = max(
                        1, abs(Kcommon) * max(1, matching_ceiling(T, Y, rank - 1))
                    )
                    matching_normalized = matching_crude / matching_denominator
                    matching_record = (
                        matching_normalized,
                        N,
                        rank,
                        R,
                        T,
                        Y,
                        matching_crude,
                        Hlower,
                        Kcommon,
                    )
                    if (
                        matching_crude > 0 and Kcommon < 0 and rank >= 5
                        and (
                            minimum_matching_crude_normalized is None
                            or matching_record < minimum_matching_crude_normalized
                        )
                    ):
                        minimum_matching_crude_normalized = matching_record
                    hconc = h_concentrated_row(R, T, Y)
                    hprev = coefficient(hconc, rank - 1)
                    if hprev < kceil and len(failed_hprev_dominations) < 20:
                        failed_hprev_dominations.append(
                            (hprev - kceil, N, rank, R, T, Y, hprev, kceil)
                        )
                    if Kcommon < 0 and hprev and Hlower + Kcommon * hprev < 0:
                        negative_hprev_scalar_payment_ranks[str(rank)] = (
                            negative_hprev_scalar_payment_ranks.get(str(rank), 0) + 1
                        )
                    key = (
                        f"Hcap_{data['H_cap_branch']}_Kcap_{data['K_cap_branch']}_"
                        f"Hcommon_{'plus' if Hcommon >= 0 else 'minus'}_"
                        f"Kcommon_{'plus' if Kcommon >= 0 else 'minus'}"
                    )
                    branch_counts[key] = branch_counts.get(key, 0) + 1
                    critical_sizes[str(len(values))] = critical_sizes.get(str(len(values)), 0) + 1
                    checks += 1
    return {
        "orders": [start_order, maximum_order],
        "maximum_R": maximum_R,
        "maximum_rank": maximum_rank,
        "checks": checks,
        "positive": positives,
        "zero": zeros,
        "negative": negatives,
        "minimum": minimum,
        "minimum_positive": minimum_positive,
        "first_negative": first_negative,
        "branch_counts": branch_counts,
        "Z_range_size_counts": critical_sizes,
        "first_negative_without_K_residual": negative_without_K_residual,
        "negative_without_K_residual_ranks": negative_without_K_residual_ranks,
        "negative_with_edgeless_K_ceiling_ranks": negative_with_edgeless_K_ceiling_ranks,
        "negative_hprev_scalar_payment_ranks": negative_hprev_scalar_payment_ranks,
        "first_failed_Hconc_prev_dominates_Kceiling": failed_hprev_dominations,
        "negative_gap_binomial_K_ceiling_ranks": negative_gap_binomial_K_ceiling_ranks,
        "negative_matching_K_ceiling_ranks": negative_matching_K_ceiling_ranks,
        "minimum_nonnegative_matching_crude_normalized": minimum_matching_crude_normalized,
        "negative_path_H_matching_K_ranks": negative_path_H_matching_K_ranks,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=100)
    parser.add_argument("--R", type=int, default=25)
    parser.add_argument("--rank", type=int, default=40)
    args = parser.parse_args()
    result = scan(args.start_order, args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print(
        "SEARCH_ONLY_D1_CORRECTED_CRITICAL_PAYMENT",
        "PASS" if result["negative"] == 0 else "FAIL",
    )


if __name__ == "__main__":
    main()
