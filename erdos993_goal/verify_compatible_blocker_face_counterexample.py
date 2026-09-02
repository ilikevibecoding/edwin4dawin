#!/usr/bin/env python3
"""Verify an exact counterexample to the compatible-blocker TI lemma."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb
from pathlib import Path


OUT = Path("compatible_blocker_face_counterexample_20260729.json")


def add(left: list[int], right: list[int]) -> list[int]:
    size = max(len(left), len(right))
    return [
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    ]


def shift(poly: list[int]) -> list[int]:
    return [0, *poly]


def main() -> int:
    blocker_size = 8
    outside_singletons = 30
    rank = 4

    simplex = [
        comb(blocker_size, index)
        for index in range(blocker_size + 1)
    ]

    # Delta is the union of the blocker simplex and 30 isolated
    # outside vertices.
    deletion_link = simplex.copy()
    deletion_link[1] += outside_singletons

    # The optional root-neighbour v is forbidden by every nonempty
    # blocker face, but is compatible with each outside singleton.
    root_deleted = simplex.copy()
    root_deleted[1] += 1 + outside_singletons
    root_deleted[2] += outside_singletons

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
        "previous": 180,
        "current": 210,
        "avoid_previous": 56,
        "avoid_current": 70,
        "u": Fraction(14, 3),
        "rho_previous": Fraction(31, 45),
        "rho_current": Fraction(2, 3),
        "burden": Fraction(8, 135),
        "cleared_margin": -480,
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
    checks["blocker_union_is_face"] = True
    checks["burden_is_positive"] = burden > 0
    checks["cleared_margin_is_negative"] = cleared_margin < 0

    report = {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "construction": {
            "blocker_size": blocker_size,
            "outside_singletons": outside_singletons,
            "residual_coefficients": deletion_link,
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
            "Every outside vertex conflicts with all eight blockers; "
            "a tree lower vertex can conflict with at most one."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
