#!/usr/bin/env python3
"""Search-only audit of a quantitative q-gap lower bound on d=1 spiders."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from prove_d1_spider_one_edge_decomposition_adversary import (
    path_independence,
    product,
    spider_formula,
)
from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    h_max_row,
)
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    exact_coefficients,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def endpoint_shapes(R: int, T: int, Y: int) -> dict[str, tuple[int, ...]]:
    output = {
        "H_concentrated": (T - Y + 1,) + (1,) * (Y - 1) + (0,) * (R - Y)
    }
    if T >= 2 * Y - 1:
        output["K_concentrated"] = (
            (T - 2 * (Y - 1),) + (2,) * (Y - 1) + (0,) * (R - Y)
        )
    quotient, remainder = divmod(T, Y)
    output["balanced_positive"] = (
        (quotient + 1,) * remainder
        + (quotient,) * (Y - remainder)
        + (0,) * (R - Y)
    )
    return output


def qgap_floor(N: int, j: int, R: int, T: int, Y: int, q3: Fraction) -> Fraction:
    """Floor from two linear-forest blocks and a target-row shadow.

    Returns zero whenever the coarse target-row shadow has no positive
    denominator or the resulting cap is above q3.
    """
    denominator = N + 2 - 3 * j
    if denominator <= 0:
        return Fraction(0)
    gap_h = N - 1 - 2 * j + R
    length_h = N - 1 - j + R
    gap_k = N + 1 - R - 2 * j + Y
    length_k = N - R - j + Y
    if min(gap_h, gap_k) < 0 or min(length_h, length_k) <= 0:
        return Fraction(0)
    q_h = Fraction(gap_h, length_h)
    included = (
        Fraction((j - 1) * gap_k, length_k) + R
    ) / j
    weight_candidates = [Fraction(j, denominator)]
    # Every unsubdivided arm contributes an isolated P_1 factor to H while
    # contributing P_0=1 to K, so h_j >= (R-Y) k_(j-1).
    isolates = R - Y
    if isolates:
        weight_candidates.append(Fraction(1, isolates))
    # K is a T-vertex linear forest.  Its adjacent row ratio is at least the
    # path ratio, and h_j>=k_j.
    path_numerator = (T - 2 * j + 2) * (T - 2 * j + 3)
    if path_numerator > 0:
        weight_candidates.append(
            Fraction(j * (T - j + 2), path_numerator)
        )
    # Expand the exact isolated-arm factor (1+x)^(R-Y).  The active H row
    # coefficientwise dominates K, while an ordinary subset shadow gives
    # k_(j-m)/k_(j-1) >= C(j-1,m-1)/C(T-j+m,m-1).  Summing every available
    # isolated-arm sector gives a substantially sharper common weight cap.
    lower_h_over_k = Fraction(0)
    if path_numerator > 0:
        lower_h_over_k += Fraction(
            path_numerator, j * (T - j + 2)
        )
    for selected_isolates in range(1, min(isolates, j) + 1):
        lower_h_over_k += Fraction(
            C(isolates, selected_isolates)
            * C(j - 1, selected_isolates - 1),
            C(T - j + selected_isolates, selected_isolates - 1),
        )
    if lower_h_over_k > 0:
        weight_candidates.append(1 / lower_h_over_k)
    # Sharp parameter-only common-row cap.  The frozen H concentration
    # theorem gives the coefficientwise lower row
    # (1+x)^(R-Y) P_(T-Y+2) P_2^(Y-1).  To upper-bound K, condition on
    # Z=#{ell_i>=2}; after replacing ell_i by ell_i-1, K is exactly an H row
    # with parameters (R,T,Y)=(Y,T-Y,Z), so the frozen Hmax theorem applies.
    h_concentrated = product(
        [path_independence(1)] * (R - Y)
        + [path_independence(T - Y + 2)]
        + [path_independence(2)] * (Y - 1)
    )
    h_floor = h_concentrated[j] if j < len(h_concentrated) else 0
    k_ceiling = C(Y, j - 1) if T == Y else 0
    for deep_occupied in range(1, min(Y, T - Y) + 1):
        row = h_max_row(Y, T - Y, deep_occupied, j - 1)
        k_ceiling = max(k_ceiling, row[j - 1])
    if h_floor > 0:
        weight_candidates.append(Fraction(k_ceiling, h_floor))
    weight = min(weight_candidates)
    endpoint_cap = (q_h + weight * included) / (1 + weight)
    q_cap = max(q_h, endpoint_cap)
    return max(Fraction(0), q3 - q_cap)


def scan(maximum_order: int, maximum_R: int, maximum_rank: int) -> dict[str, object]:
    checks = negative_c = paid = 0
    failures = []
    minimum = None
    for N in range(15, maximum_order + 1):
        for R in range(1, min(N - 1, maximum_R) + 1):
            T = N - 1 - R
            if T <= 0:
                continue
            for Y in range(1, min(R, T) + 1):
                B2 = C(R, 2)
                tau = C(R, 3) + (R - 1) * (Y - 1)
                for shape, subdivisions in endpoint_shapes(R, T, Y).items():
                    F, _, pieces = spider_formula(subdivisions)
                    H = pieces["H"]
                    maximum = min(maximum_rank, len(F) - 2)
                    for j in range(4, maximum + 1):
                        if not F[j]:
                            continue
                        data = exact_coefficients(
                            N, j, 1, R, T, Y, B2, B2, tau
                        )
                        value = lambda row, rank: row[rank] if 0 <= rank < len(row) else 0
                        repaired = (
                            data["Cf"] * (value(F, j + 1) + value(H, j - 1))
                            + data["Cb"] * value(F, j)
                            + data["Ch"] * value(H, j)
                        )
                        checks += 1
                        if repaired >= 0:
                            continue
                        negative_c += 1
                        q3 = Fraction(data["z3"], 3 * data["f3"])
                        gap = qgap_floor(N, j, R, T, Y, q3)
                        reserve = (
                            3
                            * j
                            * data["a"]
                            * data["p0"]
                            * (data["p0"] + data["a"])
                            * value(F, j)
                            * data["f3"]
                            * gap
                        )
                        total = Fraction(repaired) + reserve
                        record = (
                            total,
                            N,
                            j,
                            R,
                            T,
                            Y,
                            shape,
                            repaired,
                            gap,
                        )
                        if minimum is None or record < minimum:
                            minimum = record
                        if total < 0:
                            failures.append(record)
                        else:
                            paid += 1
    return {
        "orders": [15, maximum_order],
        "maximum_R": maximum_R,
        "maximum_rank": maximum_rank,
        "exact_endpoint_rank_checks": checks,
        "negative_C_repaired_checks": negative_c,
        "paid_by_linear_forest_qgap_bound": paid,
        "negative_after_bound": len(failures),
        "minimum_after_bound": minimum,
        "first_failures": failures[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=120)
    parser.add_argument("--R", type=int, default=15)
    parser.add_argument("--rank", type=int, default=30)
    args = parser.parse_args()
    result = scan(args.order, args.R, args.rank)
    for key, value in result.items():
        print(key, value)
    print(
        "SEARCH_EXACT_D1_LINEAR_FOREST_QGAP_BOUND",
        "PASS" if result["negative_after_bound"] == 0 else "FAIL",
    )


if __name__ == "__main__":
    main()
