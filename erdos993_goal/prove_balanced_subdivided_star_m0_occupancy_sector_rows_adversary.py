#!/usr/bin/env python3
"""Exact replay for occupancy-coupled balanced subdivided-star sector rows.

The all-order proof is in
BALANCED_SUBDIVIDED_STAR_M0_OCCUPANCY_SECTOR_ROWS_2026-08-29.md.  The finite
atlas below is an adversarial replay, not the proof and not an m=0 theorem.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import comb
from pathlib import Path

from probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary import (
    balanced_arm_counts,
    family_rows,
    structural_data,
    weak_compositions,
)
from prove_balanced_subdivided_star_m0_row_correlation_adversary import h_max_row


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_m0_occupancy_sector_rows_exact_adversary_20260829.json"
DEPENDENCIES = (
    ROOT / "prove_balanced_subdivided_star_m0_row_correlation_adversary.py",
    ROOT / "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json",
    ROOT / "prove_balanced_subdivided_star_h_adjacent_ratio_concentration_adversary.py",
    ROOT / "balanced_subdivided_star_h_adjacent_ratio_concentration_exact_adversary_20260829.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolve(left: list[int], right: list[int], maximum: int) -> list[int]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= maximum:
                output[i + j] += a * b
    return output


def path_row(vertices: int, maximum: int) -> list[int]:
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def row_power(row: list[int], exponent: int, maximum: int) -> list[int]:
    output = [1] + [0] * maximum
    for _ in range(exponent):
        output = convolve(output, row, maximum)
    return output


def occupancy_counts(
    arms: tuple[int, ...], subdivisions: tuple[int, ...]
) -> tuple[int, ...]:
    output = []
    cursor = 0
    for degree in arms:
        block = subdivisions[cursor : cursor + degree]
        output.append(sum(value > 0 for value in block))
        cursor += degree
    return tuple(output)


def base_sector_rows(
    arms: tuple[int, ...], occupied: tuple[int, ...], maximum: int
) -> tuple[list[int], list[int], list[int]]:
    """Return F0,H0,E0=F0-H0 from the armwise literal minima."""
    p1 = path_row(1, maximum)
    p2 = path_row(2, maximum)
    F = [1] + [0] * maximum
    H = [1] + [0] * maximum
    for degree, y in zip(arms, occupied):
        Hi = convolve(
            row_power(p2, y, maximum),
            row_power(p1, degree - y, maximum),
            maximum,
        )
        Ki = row_power(p1, y, maximum)
        Fi = Hi[:]
        for rank in range(1, maximum + 1):
            Fi[rank] += Ki[rank - 1]
        F = convolve(F, Fi, maximum)
        H = convolve(H, Hi, maximum)
    return F, H, [F[rank] - H[rank] for rank in range(maximum + 1)]


def sector_upper_row(
    arms: tuple[int, ...], total_noncentres: int, maximum: int
) -> list[int]:
    """Edgeless upper row for F-H, retaining exact selected arm deletion."""
    d = len(arms)
    output = [0] * (maximum + 1)
    for mask in range(1, 1 << d):
        centres = mask.bit_count()
        deleted_arms = sum(
            arms[index] for index in range(d) if mask & (1 << index)
        )
        for rank in range(centres, maximum + 1):
            output[rank] += C(
                total_noncentres - deleted_arms, rank - centres
            )
    return output


def h_concentrated_row(R: int, T: int, Y: int, maximum: int) -> list[int]:
    row = row_power(path_row(1, maximum), R - Y, maximum)
    row = convolve(row, path_row(T - Y + 2, maximum), maximum)
    row = convolve(row, row_power(path_row(2, maximum), Y - 1, maximum), maximum)
    return row


def q0_f_concentrated_row(
    d: int, R: int, T: int, maximum: int
) -> list[int]:
    row = row_power(path_row(1, maximum), d - R, maximum)
    row = convolve(row, path_row(T + 2, maximum), maximum)
    row = convolve(row, row_power(path_row(2, maximum), R - 1, maximum), maximum)
    return row


def q0_f_max_row(d: int, R: int, T: int, maximum: int) -> list[int]:
    core = h_max_row(R, T + R, R, maximum)
    return convolve(
        row_power(path_row(1, maximum), d - R, maximum), core, maximum
    )


def atlas() -> dict[str, object]:
    allocation_rows = rank_checks = ratio_checks = q0_checks = 0
    minimum_lower_slack = None
    minimum_upper_slack = None
    minimum_h_cross = None
    minimum_q0_cross = None
    boundary = None
    for d in range(1, 7):
        for R in range(1, 9):
            arms = balanced_arm_counts(d, R)
            for T in range(1, 7):
                if C(T + R - 1, R - 1) > 1800:
                    continue
                N = d + R + T
                maximum = N
                upper = sector_upper_row(arms, R + T, maximum)
                for subdivisions in weak_compositions(T, R):
                    F, H = family_rows(arms, subdivisions, maximum)
                    occupied = occupancy_counts(arms, subdivisions)
                    Y = sum(occupied)
                    F0, H0, E0 = base_sector_rows(arms, occupied, maximum)
                    Hconc = h_concentrated_row(R, T, Y, maximum)
                    Hmax = h_max_row(R, T, Y, maximum)
                    data = structural_data(arms, subdivisions)
                    expected_tau = (
                        C(d - 1, 3)
                        + sum(C(value, 3) for value in arms)
                        + (d - 1) * R
                        + T
                        - (N - 2)
                        + sum((degree - 1) * y for degree, y in zip(arms, occupied))
                    )
                    assert data["tau"] == expected_tau
                    for rank in range(maximum + 1):
                        actual_extra = F[rank] - H[rank]
                        lower_slack = actual_extra - E0[rank]
                        upper_slack = upper[rank] - actual_extra
                        assert lower_slack >= 0
                        assert upper_slack >= 0
                        assert H[rank] >= Hconc[rank]
                        assert H[rank] <= Hmax[rank]
                        minimum_lower_slack = (
                            lower_slack
                            if minimum_lower_slack is None
                            else min(minimum_lower_slack, lower_slack)
                        )
                        minimum_upper_slack = (
                            upper_slack
                            if minimum_upper_slack is None
                            else min(minimum_upper_slack, upper_slack)
                        )
                        cross = (
                            (H[rank + 1] if rank < maximum else 0) * Hconc[rank]
                            - H[rank]
                            * (Hconc[rank + 1] if rank < maximum else 0)
                        )
                        assert cross >= 0
                        minimum_h_cross = (
                            cross if minimum_h_cross is None else min(minimum_h_cross, cross)
                        )
                        ratio_checks += 1
                    if R < d:
                        Fconc = q0_f_concentrated_row(d, R, T, maximum)
                        Fmax = q0_f_max_row(d, R, T, maximum)
                        for rank in range(maximum + 1):
                            assert Fconc[rank] <= F[rank] <= Fmax[rank]
                            cross = (
                                (F[rank + 1] if rank < maximum else 0) * Fconc[rank]
                                - F[rank]
                                * (Fconc[rank + 1] if rank < maximum else 0)
                            )
                            assert cross >= 0
                            minimum_q0_cross = (
                                cross
                                if minimum_q0_cross is None
                                else min(minimum_q0_cross, cross)
                            )
                            q0_checks += 1
                    if (N, d, R, T, Y) == (26, 4, 11, 11, 11):
                        boundary = {
                            "arms": list(arms),
                            "occupied": list(occupied),
                            "E0_rank4": E0[4],
                            "E0_rank5": E0[5],
                            "actual_rank4": F[4] - H[4],
                            "actual_rank5": F[5] - H[5],
                            "tau": data["tau"],
                        }
                    allocation_rows += 1
                    rank_checks += maximum + 1
    # The historical first relaxed obstruction lies outside the compact atlas
    # T<=6, so replay its unique positive-allocation row directly.
    if boundary is None:
        arms = (3, 3, 3, 2)
        subdivisions = (1,) * 11
        F, H = family_rows(arms, subdivisions, 6)
        occupied = occupancy_counts(arms, subdivisions)
        _, _, E0 = base_sector_rows(arms, occupied, 6)
        data = structural_data(arms, subdivisions)
        boundary = {
            "arms": list(arms),
            "occupied": list(occupied),
            "E0_rank4": E0[4],
            "E0_rank5": E0[5],
            "actual_rank4": F[4] - H[4],
            "actual_rank5": F[5] - H[5],
            "tau": data["tau"],
        }
    assert boundary == {
        "arms": [3, 3, 3, 2],
        "occupied": [3, 3, 3, 2],
        "E0_rank4": 4268,
        "E0_rank5": 15543,
        "actual_rank4": 4268,
        "actual_rank5": 15543,
        "tau": 44,
    }
    return {
        "allocation_rows": allocation_rows,
        "rank_checks": rank_checks,
        "H_adjacent_ratio_crosses": ratio_checks,
        "q0_F_adjacent_ratio_crosses": q0_checks,
        "minimum_sector_lower_slack": minimum_lower_slack,
        "minimum_sector_upper_slack": minimum_upper_slack,
        "minimum_H_adjacent_cross": minimum_h_cross,
        "minimum_q0_F_adjacent_cross": minimum_q0_cross,
        "former_relaxed_boundary": boundary,
    }


def main() -> None:
    result = atlas()
    payload = {
        "schema": "balanced-subdivided-star-m0-occupancy-sector-rows-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_M0_OCCUPANCY_SECTOR_ROW_LEMMA",
        "theorem": {
            "occupancy": "y_i=#{occupied arms at centre i}; Y=sum y_i",
            "lower_components": "H_i^0=P2^y_i P1^(r_i-y_i), K_i^0=P1^y_i",
            "lower_sector": "F-H >=coeff prod_i(H_i^0+xK_i^0)-prod_i H_i^0",
            "shared_moment": "tau=base+sum_i(r_i-1)y_i",
            "upper_sector": (
                "For selected centre set C, its rank-k sector is at most "
                "C(S-sum_(i in C)r_i,k-|C|)."
            ),
            "H_endpoints": "Hconc<=coeff H<=coeff Hmax and H LR-dominates Hconc",
            "q0_endpoints": "If R<d, Fconc<=coeff F<=coeff Fmax and F LR-dominates Fconc",
        },
        "exact_bounded_adversarial_replay": result,
        "dependency_sha256": {
            path.name: sha256(path) for path in DEPENDENCIES if path.exists()
        },
        "scope_warning": (
            "This is an all-order structural row lemma.  It does not prove the "
            "remaining parameter sign of Newton m=0, the terminal-payment "
            "theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print(result)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
