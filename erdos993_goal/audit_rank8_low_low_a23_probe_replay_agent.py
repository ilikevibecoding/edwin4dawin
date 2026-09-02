#!/usr/bin/env python3
"""Independent exact replay of the compressed a2/a3 probe and transform."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    INNER_NAMES,
    POWER_TO_BERNSTEIN_TIMES_2,
    build_at,
)


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
IDENTITY = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_probe_replay_agent_20260822.json"
EXPECTED = {
    PROBE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    IDENTITY.name: "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluate(poly, p_value, q_value, z_value, w_value):
    return sum(
        coefficient
        * p_value ** degree[0]
        * q_value ** degree[1]
        * z_value ** degree[2]
        * w_value ** degree[3]
        for degree, coefficient in poly.items()
    )


def direct_factor(terminal, gaps):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [Fraction(1)]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def direct_convolution(left, right, rank):
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def direct_build(values, multiplier, p_value, q_value, z_value, w_value):
    h = Fraction(values["h"])
    a2, a3 = (1 - z_value) * p_value, z_value * p_value
    b2, b3 = (1 - w_value) * q_value, w_value * q_value
    left_gaps = [
        2 * h + values["a0"], h, h + a2, h + a3,
        h + values["a4"], h + values["a5"],
        h + values["a6"], h + values["a7"],
    ]
    right_gaps = [
        2 * h + values["b0"], (1 - multiplier) * h,
        (1 + multiplier) * h + b2, h + b3,
        h + values["b4"], h + values["b5"],
        h + values["b6"], h + values["b7"],
    ]
    left_ratios, left = direct_factor(Fraction(values["ta"]), left_gaps)
    _, right = direct_factor(Fraction(values["tb"]), right_gaps)
    tail = [Fraction(0)] * 3 + left[3:]
    return {
        "capacity": left_ratios[2],
        "c": {rank: direct_convolution(left, right, rank) for rank in (7, 8, 9)},
        "v": {rank: direct_convolution(tail, right, rank) for rank in (7, 8, 9)},
    }


def expected_bernstein(power_coefficients, left_index, right_index):
    # Independent general degree-n power-to-Bernstein formula:
    # b_i=sum_{k<=i} c_k*C(i,k)/C(n,k), tensorized for n=2.
    return sum(
        Fraction(
            math.comb(left_index, i) * math.comb(right_index, j),
            math.comb(2, i) * math.comb(2, j),
        ) * power_coefficients[i, j]
        for i in range(left_index + 1)
        for j in range(right_index + 1)
    )


def main() -> None:
    assert {path.name: sha256(path) for path in (PROBE, IDENTITY)} == EXPECTED
    assignments = [
        dict(zip(INNER_NAMES, row))
        for row in (
            (2, 3, 4, 1, 2, 1, 3, 2, 2, 1, 2, 2, 1),
            (3, 1, 5, 2, 1, 3, 1, 2, 1, 2, 1, 3, 2),
        )
    ]
    coordinate_trials = (
        (Fraction(2), Fraction(3), Fraction(0), Fraction(0), "corner_0_0"),
        (Fraction(2), Fraction(3), Fraction(1), Fraction(1), "corner_1_1"),
        (Fraction(3), Fraction(2), Fraction(1, 3), Fraction(1, 2), "interior"),
    )
    comparisons = 0
    endpoint_counts = {"corner_0_0": 0, "corner_1_1": 0, "interior": 0}
    outer_target = (9, 8, 2, 2)
    for values in assignments:
        for multiplier in (-1, 0, 1):
            symbolic = build_at(values, multiplier, outer_target, 1)
            for p_value, q_value, z_value, w_value, label in coordinate_trials:
                direct = direct_build(
                    values, multiplier, p_value, q_value, z_value, w_value,
                )
                assert evaluate(
                    symbolic["capacity"], p_value, q_value, z_value, w_value,
                ) == direct["capacity"]
                comparisons += 1
                endpoint_counts[label] += 1
                for family in ("c", "v"):
                    for rank in (7, 8, 9):
                        assert evaluate(
                            symbolic[family][rank],
                            p_value, q_value, z_value, w_value,
                        ) == direct[family][rank]
                        comparisons += 1
                        endpoint_counts[label] += 1
    assert comparisons == 126

    transform_comparisons = 0
    matrices = (
        {(i, j): Fraction(1 + 3 * i + 5 * j) for i in range(3) for j in range(3)},
        {(i, j): Fraction((-1) ** (i + j) * (2 + i + 2 * j), 3)
         for i in range(3) for j in range(3)},
    )
    for coefficients in matrices:
        for left_index in range(3):
            for right_index in range(3):
                transformed_times_4 = sum(
                    POWER_TO_BERNSTEIN_TIMES_2[left_index][i]
                    * POWER_TO_BERNSTEIN_TIMES_2[right_index][j]
                    * coefficients[i, j]
                    for i in range(3) for j in range(3)
                )
                assert transformed_times_4 == 4 * expected_bernstein(
                    coefficients, left_index, right_index,
                )
                transform_comparisons += 1
    assert transform_comparisons == 18

    payload = {
        "schema": "rank8-low-low-a23-probe-replay-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY",
        "row_builder_replay": {
            "inner_assignments": len(assignments),
            "multipliers": 3,
            "coordinate_trials": len(coordinate_trials),
            "exact_equalities": comparisons,
            "by_coordinate_type": endpoint_counts,
            "includes_both_endpoints_and_rational_interior": True,
        },
        "bernstein_conversion_replay": {
            "independent_formula": (
                "b_i=sum_{k<=i} c_k*C(i,k)/C(2,k), tensorized"
            ),
            "coefficient_matrices": len(matrices),
            "exact_position_equalities": transform_comparisons,
            "tensor_scaling": 4,
        },
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
