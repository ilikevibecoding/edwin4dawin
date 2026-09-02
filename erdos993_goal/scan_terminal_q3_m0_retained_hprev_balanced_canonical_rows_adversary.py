#!/usr/bin/env python3
"""Exact search of the canonical balanced-occupancy retained-hprev rows.

Search evidence only.  The all-order occupancy-balancing theorem reduces each
equal-degree class to a single canonical product, so this scan has no hidden
histogram enumeration.  It reuses the sign-aware E upper row and the exact
Hconc/tangent payment from the frozen all-row certificate.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path

from prove_balanced_subdivided_star_occupancy_balancing_adversary import (
    balanced_group_row,
)
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    balanced_motifs,
    certificate_cell,
    convolve,
    path_row,
    row_power,
)


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "terminal_q3_m0_retained_hprev_balanced_canonical_rows_exact_search_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@lru_cache(maxsize=None)
def canonical_extra_row(
    d: int,
    q: int,
    s: int,
    occupied_high: int,
    occupied_low: int,
    maximum: int,
) -> tuple[int, ...]:
    high = balanced_group_row(s, q + 1, occupied_high, maximum)
    low = balanced_group_row(d - s, q, occupied_low, maximum)
    full = convolve(high, low, maximum)
    occupied = occupied_high + occupied_low
    H0 = convolve(
        row_power(path_row(2, maximum), occupied, maximum),
        row_power(path_row(1, maximum), d * q + s - occupied, maximum),
        maximum,
    )
    extra = tuple(left - right for left, right in zip(full, H0))
    assert all(value >= 0 for value in extra)
    return extra


@lru_cache(maxsize=None)
def canonical_one_center_extra_row(
    d: int,
    q: int,
    s: int,
    occupied_high: int,
    occupied_low: int,
    maximum: int,
) -> tuple[int, ...]:
    """Canonical lower using only the exactly-one-centre sectors.

    This is a sum of at most four rows x*(1+x)^a*(1+2x)^b and is the
    factorization-friendly subrow of canonical_extra_row.
    """
    R = d * q + s
    Y = occupied_high + occupied_low
    output = [0] * (maximum + 1)
    for centres, degree, occupied in (
        (s, q + 1, occupied_high),
        (d - s, q, occupied_low),
    ):
        if not centres:
            assert occupied == 0
            continue
        low, high_count = divmod(occupied, centres)
        for count, y in ((centres - high_count, low), (high_count, low + 1)):
            if not count:
                continue
            a_exponent = R - Y - degree + 2 * y
            b_exponent = Y - y
            assert a_exponent >= 0 and b_exponent >= 0
            row = convolve(
                row_power(path_row(1, maximum), a_exponent, maximum),
                row_power(path_row(2, maximum), b_exponent, maximum),
                maximum,
            )
            for rank in range(maximum):
                output[rank + 1] += count * row[rank]
    full = canonical_extra_row(
        d, q, s, occupied_high, occupied_low, maximum
    )
    assert all(left <= right for left, right in zip(output, full))
    return tuple(output)


def scan(
    start_order: int,
    maximum_order: int,
    maximum_rank: int,
    row_mode: str = "canonical",
) -> dict[str, object]:
    assert row_mode in {"canonical", "one_center"}
    cells = checks = positives = zeros = 0
    negatives: list[dict[str, object]] = []
    minimum_positive = None
    quotient_counts: dict[int, int] = {}
    rank_minima: dict[int, tuple] = {}
    branch_counts: dict[str, int] = {}
    for N in range(start_order, maximum_order + 1):
        for d in range(1, N):
            for R in range(1, N - d):
                T = N - d - R
                q, s = divmod(R, d)
                A2, B2, B3, _ = balanced_motifs(d, R)
                base_tau = B3 + (d - 1) * R + T - (N - 2)
                high_capacity = s * (q + 1)
                low_capacity = (d - s) * q
                for occupied_high in range(high_capacity + 1):
                    low_floor = max(0, 1 - occupied_high)
                    low_ceiling = min(low_capacity, T - occupied_high)
                    for occupied_low in range(low_floor, low_ceiling + 1):
                        Y = occupied_high + occupied_low
                        if not (1 <= Y <= min(R, T)):
                            continue
                        cells += 1
                        tau = base_tau + q * occupied_high + (q - 1) * occupied_low
                        row_function = (
                            canonical_extra_row
                            if row_mode == "canonical"
                            else canonical_one_center_extra_row
                        )
                        extra = row_function(
                            d, q, s, occupied_high, occupied_low, maximum_rank + 1
                        )
                        for j in range(4, min(maximum_rank, N) + 1):
                            result = certificate_cell(
                                N, j, d, R, T, Y, B2, A2, tau, extra
                            )
                            checks += 1
                            quotient_counts[q] = quotient_counts.get(q, 0) + 1
                            branch = str(result["branch"])
                            branch_counts[branch] = branch_counts.get(branch, 0) + 1
                            value = int(result["cleared_certificate"])
                            record = (
                                value,
                                N,
                                j,
                                d,
                                q,
                                s,
                                R,
                                T,
                                occupied_high,
                                occupied_low,
                                Y,
                                tau,
                                branch,
                            )
                            if value < 0:
                                negatives.append({"cell": list(record), "details": result})
                            elif value == 0:
                                zeros += 1
                            else:
                                positives += 1
                                if minimum_positive is None or record < minimum_positive:
                                    minimum_positive = record
                            if j not in rank_minima or record < rank_minima[j]:
                                rank_minima[j] = record
    return {
        "orders": [start_order, maximum_order],
        "ranks": [4, maximum_rank],
        "row_mode": row_mode,
        "canonical_occupancy_cells": cells,
        "exact_rank_checks": checks,
        "positive_checks": positives,
        "zero_checks": zeros,
        "negative_checks": len(negatives),
        "minimum_positive_cleared": minimum_positive,
        "quotient_check_counts": quotient_counts,
        "branch_counts": branch_counts,
        "rank_minima": {str(rank): row for rank, row in rank_minima.items()},
        "first_negative_exact_row_witnesses": negatives[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=35)
    parser.add_argument("--rank", type=int, default=16)
    parser.add_argument(
        "--row-mode", choices=("canonical", "one_center"), default="canonical"
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = scan(args.start_order, args.order, args.rank, args.row_mode)
    payload = {
        "schema": "terminal-q3-m0-retained-hprev-balanced-canonical-rows-search-v1",
        "status": (
            "SEARCH_EXACT_NO_NEGATIVES_BALANCED_CANONICAL_RETAINED_HPREV_BOX"
            if result["negative_checks"] == 0
            else "SEARCH_EXACT_NEGATIVE_BALANCED_CANONICAL_ROW_WITNESSES"
        ),
        "result": result,
        "dependency_sha256": {
            "prove_balanced_subdivided_star_occupancy_balancing_adversary.py": sha256(
                ROOT / "prove_balanced_subdivided_star_occupancy_balancing_adversary.py"
            ),
            "balanced_subdivided_star_occupancy_balancing_exact_adversary_20260829.json": sha256(
                ROOT / "balanced_subdivided_star_occupancy_balancing_exact_adversary_20260829.json"
            ),
            "scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary.py": sha256(
                ROOT / "scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary.py"
            ),
        },
        "scope_warning": (
            "This is exact finite search evidence.  It is not the all-order "
            "parameter cone, terminal m=0 proof, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, args.output)
    print(payload["status"])
    for key, value in result.items():
        print(key, value)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(args.output))


if __name__ == "__main__":
    main()
