#!/usr/bin/env python3
"""Compute the exact uncovered rooted-C7 parameter cut after B2<=4.

This is a coverage certificate, not a universal C7 theorem.  It combines:
the finite n=19..22 census, the n>=39 analytic theorem, the exact B2<=4
structural censuses in n=23..38, the root-degree staircase, and the sharp
piecewise extension-mean transfer.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def transfer(mu4: Fraction) -> Fraction:
    """Sharp convex-envelope lower bound for mu5 from mu4."""
    integer = mu4.numerator // mu4.denominator
    assert integer >= 3
    phi = Fraction((integer - 1) * (integer - 2), 2) + (
        mu4 - integer
    ) * (integer - 1)
    sharp = 2 * phi / mu4
    smooth = mu4 - 3 + Fraction(2, 1) / mu4
    assert sharp >= smooth
    return sharp


def i4_ceiling(order: int, b2: int) -> int:
    edge_incidence = comb(order - 1, 4)
    inclusion_exclusion = (
        comb(order, 4)
        - (order - 1) * comb(order - 2, 2)
        + comb(order - 1, 2)
        + (order - 4) * (b2 + order - 2)
        - (order - 3 + b2)
    )
    ceiling = min(edge_incidence, inclusion_exclusion)
    assert ceiling > 0
    return ceiling


def scalar(order: int, root_degree: int, b2: int) -> Fraction:
    path_endpoint = Fraction((order - 7) * (order - 8), order - 3)
    curvature_coefficient = Fraction(
        order**3 - 8 * order**2 - 19 * order + 302, 6
    )
    mu4 = path_endpoint + curvature_coefficient * b2 / (
        (order - 3) * i4_ceiling(order, b2)
    )
    x = transfer(mu4) / 6
    extension_ceiling = Fraction(order - root_degree - 5, 5)
    return 1 + 2 * x - 28 * (extension_ceiling - x) / (
        1 + extension_ceiling
    )


def b2_bounds(order: int, root_degree: int) -> tuple[int, int]:
    root_excess = root_degree - 1
    lower = comb(root_excess, 2)
    remaining_excess = order - root_degree - 1
    upper = comb(root_excess, 2) + comb(remaining_excess, 2)
    assert lower <= upper
    return lower, upper


def assert_prerequisite(filename: str, status: str) -> dict:
    path = HERE / filename
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["status"] == status
    return {"file": filename, "sha256": sha256(path), "status": status}


def main() -> int:
    prerequisites = [
        assert_prerequisite(
            "rank7_rooted_cross_finite_n19_n22_exact_20260816.json",
            "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDERS_19_THROUGH_22",
        ),
        assert_prerequisite(
            "rank7_rooted_cross_b2_2_3_exact_20260816.json",
            "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_TREES_B2_2_OR_3_N23_THROUGH_N38",
        ),
        assert_prerequisite(
            "rank7_rooted_cross_b2_4_exact_20260816.json",
            "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_TREES_B2_4_N23_THROUGH_N38",
        ),
    ]

    residual = []
    curvature_rows = []
    for order in range(23, 39):
        order_row = {"order": order, "root_degrees": []}
        for root_degree in range(1, 10):
            structural_lower, structural_upper = b2_bounds(order, root_degree)
            threshold = next(
                (
                    value
                    for value in range(structural_lower, structural_upper + 1)
                    if scalar(order, root_degree, value) > 0
                ),
                None,
            )
            if threshold is not None:
                assert all(
                    scalar(order, root_degree, value) > 0
                    for value in range(threshold, structural_upper + 1)
                )
            uncovered_lower = max(5, structural_lower)
            uncovered_upper = (
                structural_upper
                if threshold is None
                else min(structural_upper, threshold - 1)
            )
            cell = {
                "root_degree": root_degree,
                "structural_B2_min": structural_lower,
                "structural_B2_max": structural_upper,
                "curvature_closes_from_B2": threshold,
            }
            order_row["root_degrees"].append(cell)
            if uncovered_lower <= uncovered_upper:
                residual.append(
                    {
                        "order": order,
                        "root_degree": root_degree,
                        "B2_min": uncovered_lower,
                        "B2_max": uncovered_upper,
                        "integer_levels": uncovered_upper - uncovered_lower + 1,
                    }
                )
        curvature_rows.append(order_row)

    assert len(residual) == 83
    integer_levels = sum(cell["integer_levels"] for cell in residual)
    assert integer_levels == 18_517
    assert all(cell["B2_min"] >= 5 for cell in residual)

    by_order = []
    for order in range(23, 39):
        cells = [cell for cell in residual if cell["order"] == order]
        by_order.append(
            {
                "order": order,
                "residual_root_degree_cells": len(cells),
                "integer_levels": sum(cell["integer_levels"] for cell in cells),
            }
        )

    report = {
        "status": "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4",
        "proved_ranges": [
            "all rooted trees of orders 19 through 22",
            "all rooted trees of order at least 39",
            "all rooted trees with B2<=4 in orders 23 through 38",
            "degree-staircase and curvature-closed cells in orders 23 through 38",
        ],
        "sharp_transfer": "mu5 >= 2*Phi(mu4)/mu4 with Phi linearly interpolating C(q-1,2)",
        "root_degree_B2_bounds": "C(r-1,2) <= B2 <= C(r-1,2)+C(n-r-1,2)",
        "curvature_rows": curvature_rows,
        "residual": {
            "orders": "23 through 38",
            "cell_count": len(residual),
            "integer_parameter_levels": integer_levels,
            "by_order": by_order,
            "cells": residual,
            "warning": "This is the exact uncovered parameter cut of the listed certificates, not a claim that every parameter level is realizable.",
        },
        "prerequisites": prerequisites,
        "scope_warning": "Universal rooted C7 is not proved; the 83 listed cells remain.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"residual cells={len(residual)} integer levels={integer_levels}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
