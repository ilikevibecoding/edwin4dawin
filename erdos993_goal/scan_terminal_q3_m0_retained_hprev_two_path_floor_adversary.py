#!/usr/bin/env python3
"""Exact finite search of the retained-hprev two-path-floor certificate.

Search evidence only.  It uses the frozen all-order one-centre path floor and
checks both exact occupied-weight/tau endpoints at fixed N,d,R,T,Y.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path

from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    balanced_motifs,
    certificate_cell,
    exact_coefficients,
    hmax_row,
    path_row,
    sector_extra_upper,
)


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "terminal_q3_m0_retained_hprev_two_path_floor_exact_search_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@lru_cache(maxsize=None)
def two_path_extra_row(
    d: int, R: int, Y: int, maximum: int
) -> tuple[int, ...]:
    q, s = divmod(R, d)
    output = [0] * (maximum + 1)
    for count, vertices in (
        (s, R + Y - q - 1),
        (d - s, R + Y - q),
    ):
        row = path_row(vertices, maximum)
        for rank in range(maximum):
            output[rank + 1] += count * row[rank]
    return tuple(output)


def tau_endpoints(N: int, d: int, R: int, T: int, Y: int, B3: int) -> tuple[int, ...]:
    q, s = divmod(R, d)
    low_arm_capacity = (d - s) * q
    high_arm_capacity = s * (q + 1)
    minimum_weight = (q - 1) * Y + max(0, Y - low_arm_capacity)
    maximum_weight = (q - 1) * Y + min(Y, high_arm_capacity)
    assert minimum_weight >= 0 and maximum_weight >= minimum_weight
    base = B3 + (d - 1) * R + T - (N - 2)
    return tuple(sorted({base + minimum_weight, base + maximum_weight}))


def path_h_tangent_cell(
    N: int,
    j: int,
    d: int,
    R: int,
    T: int,
    Y: int,
    B2: int,
    A2: int,
    tau: int,
    extra: tuple[int, ...],
) -> dict[str, int | str]:
    """Use the single S-vertex path as the simultaneous H endpoint."""
    coefficients = exact_coefficients(N, j, d, R, T, Y, B2, A2, tau)
    Cf, Cb, Ch = (int(coefficients[name]) for name in ("Cf", "Cb", "Ch"))
    Ej = extra[j] if Cb >= 0 else sector_extra_upper(j, d, R, T)
    Enext = extra[j + 1]
    S = R + T
    path = path_row(S, j + 1)
    pprev, pj, pnext = path[j - 1], path[j], path[j + 1]
    residual_vertices = max(0, S - 4)
    residual_rank = j - 2
    denominator = (
        path_row(residual_vertices, residual_rank)[residual_rank]
        if residual_rank >= 0
        else 0
    )
    numerator = (
        path_row(residual_vertices, residual_rank + 1)[residual_rank + 1]
        if residual_rank >= 0
        else 0
    )
    if denominator == 0:
        denominator, numerator = 1, 0
    common = Cf * numerator + (Cb + Ch) * denominator
    Hmax = hmax_row(R, T, Y, j + 1)[j]
    residual_endpoint = 0 if common >= 0 else Hmax - pj
    assert residual_endpoint >= 0
    cleared = (
        denominator
        * (
            Cf * Enext
            + Cb * Ej
            + Cf * (pnext + pprev)
            + (Cb + Ch) * pj
        )
        + common * residual_endpoint
    )
    return {
        **coefficients,
        "Ej": Ej,
        "Enext": Enext,
        "path_prev": pprev,
        "path_j": pj,
        "path_next": pnext,
        "Hmax_j": Hmax,
        "path_common_numerator": common,
        "path_ratio_numerator": numerator,
        "path_ratio_denominator": denominator,
        "cleared_certificate": cleared,
        "certificate_scale": denominator,
        "branch": "single_path_H_tangent",
    }


def scan(
    start_order: int,
    maximum_order: int,
    maximum_rank: int,
    h_mode: str = "concentration",
) -> dict[str, object]:
    assert h_mode in {"concentration", "path", "maximum"}
    parameter_cells = endpoint_checks = positives = zeros = 0
    negatives: list[dict[str, object]] = []
    minimum_positive = None
    rank_minima: dict[int, tuple] = {}
    sign_branches: dict[str, int] = {}
    quotient_counts: dict[int, int] = {}
    for N in range(start_order, maximum_order + 1):
        for d in range(1, N):
            for R in range(1, N - d):
                T = N - d - R
                q, _ = divmod(R, d)
                A2, B2, B3, _ = balanced_motifs(d, R)
                for Y in range(1, min(R, T) + 1):
                    parameter_cells += 1
                    extra = two_path_extra_row(d, R, Y, maximum_rank + 1)
                    for tau in tau_endpoints(N, d, R, T, Y, B3):
                        for j in range(4, min(maximum_rank, N) + 1):
                            concentration_result = certificate_cell(
                                N, j, d, R, T, Y, B2, A2, tau, extra
                            )
                            path_result = path_h_tangent_cell(
                                N, j, d, R, T, Y, B2, A2, tau, extra
                            )
                            if h_mode == "concentration":
                                result = concentration_result
                            elif h_mode == "path":
                                result = path_result
                            else:
                                result = max(
                                    (concentration_result, path_result),
                                    key=lambda row: int(row["cleared_certificate"])
                                    / int(row["certificate_scale"]),
                                )
                            endpoint_checks += 1
                            quotient_counts[q] = quotient_counts.get(q, 0) + 1
                            common_value = int(
                                result.get(
                                    "common_numerator",
                                    result.get("path_common_numerator", 0),
                                )
                            )
                            common_sign = "+" if common_value >= 0 else "-"
                            cb_sign = "+" if int(result["Cb"]) >= 0 else "-"
                            key = f"Cb{cb_sign}_common{common_sign}_{result['branch']}"
                            sign_branches[key] = sign_branches.get(key, 0) + 1
                            value = int(result["cleared_certificate"])
                            record = (
                                value,
                                N,
                                j,
                                d,
                                q,
                                R,
                                T,
                                Y,
                                tau,
                                str(result["branch"]),
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
        "h_mode": h_mode,
        "parameter_cells": parameter_cells,
        "exact_tau_endpoint_rank_checks": endpoint_checks,
        "positive_checks": positives,
        "zero_checks": zeros,
        "negative_checks": len(negatives),
        "minimum_positive_cleared": minimum_positive,
        "sign_branch_counts": sign_branches,
        "quotient_check_counts": quotient_counts,
        "rank_minima": {str(rank): row for rank, row in rank_minima.items()},
        "first_negative_exact_row_witnesses": negatives[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-order", type=int, default=15)
    parser.add_argument("--order", type=int, default=35)
    parser.add_argument("--rank", type=int, default=16)
    parser.add_argument(
        "--h-mode",
        choices=("concentration", "path", "maximum"),
        default="concentration",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = scan(args.start_order, args.order, args.rank, args.h_mode)
    payload = {
        "schema": "terminal-q3-m0-retained-hprev-two-path-floor-search-v1",
        "status": (
            "SEARCH_EXACT_NO_NEGATIVES_RETAINED_HPREV_TWO_PATH_FLOOR_BOX"
            if result["negative_checks"] == 0
            else "SEARCH_EXACT_NEGATIVE_RETAINED_HPREV_TWO_PATH_FLOOR_WITNESSES"
        ),
        "result": result,
        "dependency_sha256": {
            "prove_balanced_subdivided_star_one_center_path_floor_adversary.py": sha256(
                ROOT / "prove_balanced_subdivided_star_one_center_path_floor_adversary.py"
            ),
            "balanced_subdivided_star_one_center_path_floor_exact_adversary_20260829.json": sha256(
                ROOT / "balanced_subdivided_star_one_center_path_floor_exact_adversary_20260829.json"
            ),
            "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py": sha256(
                ROOT / "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py"
            ),
        },
        "scope_warning": (
            "This is an exact finite two-endpoint search, not the all-order "
            "sign cone, terminal m=0 proof, or Erdos Problem 993."
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
