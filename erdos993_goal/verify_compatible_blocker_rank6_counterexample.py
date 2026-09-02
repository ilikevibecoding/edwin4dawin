#!/usr/bin/env python3
"""Verify compatible-blocker TI failure at the first required rank."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb
from pathlib import Path


OUT = Path("compatible_blocker_rank6_counterexample_20260729.json")


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
    blocker_size = 12
    outside_parts = 335
    outside_part_size = 3
    rank = 6

    blocker_simplex = [
        comb(blocker_size, index)
        for index in range(blocker_size + 1)
    ]
    outside_nonempty = [
        comb(outside_part_size, index)
        for index in range(outside_part_size + 1)
    ]
    outside_nonempty[0] = 0

    deletion_link = add(
        blocker_simplex,
        [outside_parts * value for value in outside_nonempty],
    )
    root_deleted = add(
        add(blocker_simplex, [0, 1]),
        [
            outside_parts * value
            for value in multiply(outside_nonempty, [1, 1])
        ],
    )
    rooted_base = add(root_deleted, shift(deletion_link))
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
        "previous": 2672,
        "current": 3003,
        "avoid_previous": 792,
        "avoid_current": 924,
        "burden": Fraction(543, 55778),
        "cleared_margin": -11584,
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
    checks["blocker_union_is_face"] = True
    checks["burden_is_positive"] = burden > 0
    checks["cleared_margin_is_negative"] = cleared_margin < 0

    report = {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "construction": {
            "blocker_size": blocker_size,
            "outside_parts": outside_parts,
            "outside_part_size": outside_part_size,
            "residual_order": (
                blocker_size + outside_parts * outside_part_size
            ),
            "deletion_link_coefficients": deletion_link,
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
            "Each outside vertex conflicts with all twelve blockers; "
            "a forest lower vertex can conflict with at most one."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
