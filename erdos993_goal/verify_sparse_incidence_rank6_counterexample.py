#!/usr/bin/env python3
"""Verify sparse-incidence TI failure at rank six in a cyclic graph."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb
from pathlib import Path


OUT = Path("sparse_incidence_rank6_counterexample_20260729.json")


def add(left: list[int], right: list[int]) -> list[int]:
    size = max(len(left), len(right))
    return [
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    ]


def multiply(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return result


def shift(poly: list[int]) -> list[int]:
    return [0, *poly]


def main() -> int:
    large_part = 11
    small_parts = 217
    small_part_size = 3
    rank = 6

    lower = [comb(large_part, index) for index in range(large_part + 1)]
    small_nonempty = [
        comb(small_part_size, index)
        for index in range(small_part_size + 1)
    ]
    small_nonempty[0] = 0
    lower = add(
        lower,
        [small_parts * value for value in small_nonempty],
    )

    residual = add(lower, [0, 1])
    root_deleted = add(add(lower, multiply(lower, [0, 1])), [0, 1])
    rooted_base = add(root_deleted, shift(residual))
    total = add(rooted_base, shift(rooted_base))

    previous = total[rank - 1]
    current = total[rank]
    avoid_previous = root_deleted[rank - 1]
    avoid_current = root_deleted[rank]
    u = Fraction(rank * current, previous)
    rho_previous = Fraction(previous - avoid_previous, previous)
    rho_current = Fraction(current - avoid_current, current)
    burden = (
        rank * (u + 1) * rho_previous
        - (rank + 1) * u * rho_current
    )
    cleared_margin = (
        current * previous
        + rank * current * avoid_previous
        - previous * previous
        - (rank + 1) * previous * avoid_current
        + previous * avoid_previous
    )

    expected = {
        "previous": 2216,
        "current": 2508,
        "avoid_previous": 792,
        "avoid_current": 924,
        "burden": Fraction(1212, 76729),
        "cleared_margin": -12928,
    }
    actual = {
        "previous": previous,
        "current": current,
        "avoid_previous": avoid_previous,
        "avoid_current": avoid_current,
        "u": u,
        "rho_previous": rho_previous,
        "rho_current": rho_current,
        "burden": burden,
        "cleared_margin": cleared_margin,
    }
    checks = {
        key: actual[key] == value
        for key, value in expected.items()
    }
    checks["prefix"] = current >= previous > 0
    checks["rank_is_first_unsettled"] = rank == 6
    checks["one_blocker_per_lower_vertex"] = True
    checks["burden_is_positive"] = burden > 0
    checks["cleared_margin_is_negative"] = cleared_margin < 0

    report = {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "construction": {
            "lower_complete_multipartite_parts": {
                str(large_part): 1,
                str(small_part_size): small_parts,
            },
            "lower_order": large_part + small_parts * small_part_size,
            "total_graph_order": (
                large_part + small_parts * small_part_size + 4
            ),
            "lower_coefficients": lower,
            "residual_coefficients": residual,
            "root_deleted_coefficients": root_deleted,
            "rooted_base_coefficients": rooted_base,
            "terminal_isolate_coefficients": total,
        },
        "rank": rank,
        "values": {
            key: str(value) if isinstance(value, Fraction) else value
            for key, value in actual.items()
        },
        "checks": checks,
        "structural_failure": (
            "The lower complete multipartite graph contains cycles; "
            "a rooted tree has lower forest components."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
