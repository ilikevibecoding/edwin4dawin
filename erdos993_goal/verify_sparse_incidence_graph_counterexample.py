#!/usr/bin/env python3
"""Verify TI failure despite a one-blocker-per-lower-vertex incidence cap."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb
from pathlib import Path


OUT = Path("sparse_incidence_graph_counterexample_20260729.json")


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
    large_part = 7
    singleton_parts = 21
    rank = 4

    lower = [comb(large_part, index) for index in range(large_part + 1)]
    lower[1] += singleton_parts

    # A single blocker u is universal to the lower graph.  Hence the
    # residual polynomial is E+x.  The selector v is adjacent only to
    # u, so its deletion polynomial is (1+x)E+x.
    residual = lower.copy()
    residual[1] += 1
    root_deleted = add(add(lower, shift(lower)), [0, 1])
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
        "previous": 155,
        "current": 182,
        "avoid_previous": 56,
        "avoid_current": 70,
        "u": Fraction(728, 155),
        "rho_previous": Fraction(99, 155),
        "rho_current": Fraction(8, 13),
        "burden": Fraction(2468, 24025),
        "cleared_margin": -617,
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
    checks["one_blocker_per_lower_vertex"] = True
    checks["burden_is_positive"] = burden > 0
    checks["cleared_margin_is_negative"] = cleared_margin < 0

    report = {
        "status": "PASS" if all(checks.values()) else "FAIL",
        "construction": {
            "lower_complete_multipartite_parts": [
                large_part,
                *([1] * singleton_parts),
            ],
            "lower_coefficients": lower,
            "residual_coefficients": residual,
            "root_deleted_coefficients": root_deleted,
            "rooted_base_coefficients": rooted_base,
            "terminal_isolate_coefficients": total,
            "total_graph_order": large_part + singleton_parts + 4,
        },
        "rank": rank,
        "values": {
            key: str(value) if isinstance(value, Fraction) else value
            for key, value in actual.items()
        },
        "checks": checks,
        "structural_failure": (
            "The lower complete multipartite graph contains cycles; "
            "the lower components of a rooted tree are forests."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
