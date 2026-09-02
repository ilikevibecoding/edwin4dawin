#!/usr/bin/env python3
"""Exact Galvin-family products with path, star, and double-star trees.

This is a bounded counterexample search, not a proof.  Galvin's tree
T_{m,t,1} has a root with m identical children, each supporting t pendant
P2 arms.  Its independence polynomial is reconstructed directly from the
rooted states.  Every candidate product is tested with exact integers.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path

from flint import fmpz_poly

from search_nonlogconcave_tree_product_counterexample_root import (
    double_star_polynomial,
    path_polynomial,
    star_polynomial,
)
from search_t3_family_forest_product_counterexample_root import (
    first_unimodality_failure,
    log_concavity_failures,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "galvin_standard_tree_factor_search_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def poly_list(polynomial: fmpz_poly) -> list[int]:
    return [int(polynomial[index]) for index in range(len(polynomial))]


def binomial_scaled(order: int, scale: int) -> fmpz_poly:
    return fmpz_poly([
        math.comb(order, index) * scale**index
        for index in range(order + 1)
    ])


def galvin_polynomial(m: int, t: int) -> tuple[int, list[int]]:
    """Return (order, I(T_{m,t,1};x)) from its two root states."""
    x = fmpz_poly([0, 1])
    branch_excluded = binomial_scaled(t, 2)
    branch_included = x * binomial_scaled(t, 1)
    branch_total = branch_excluded + branch_included
    root_excluded = branch_total**m
    root_included = x * binomial_scaled(m * t, 2)
    polynomial = poly_list(root_excluded + root_included)
    order = 1 + m + 2 * m * t
    assert polynomial[0] == 1
    assert polynomial[1] == order
    assert len(polynomial) - 1 == m * (t + 1)
    return order, polynomial


def convolve(left: list[int], right: list[int]) -> list[int]:
    return poly_list(fmpz_poly(left) * fmpz_poly(right))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-m", type=int, default=50)
    parser.add_argument("--maximum-t", type=int, default=50)
    parser.add_argument("--maximum-order", type=int, default=500)
    parser.add_argument("--maximum-path-star-size", type=int, default=200)
    parser.add_argument("--maximum-double-star-leaves", type=int, default=80)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    assert min(
        args.maximum_m,
        args.maximum_t,
        args.maximum_order,
        args.maximum_path_star_size,
    ) >= 1
    assert args.maximum_double_star_leaves >= 0

    members = []
    tree_hit = None
    for m in range(1, args.maximum_m + 1):
        for t in range(1, args.maximum_t + 1):
            order, polynomial = galvin_polynomial(m, t)
            if order > args.maximum_order:
                continue
            failure = first_unimodality_failure(polynomial)
            if failure is not None:
                tree_hit = {
                    "family": "Galvin_T_m_t_1",
                    "m": m,
                    "t": t,
                    "order": order,
                    "polynomial": polynomial,
                    "unimodality_failure": failure,
                }
                break
            defects = log_concavity_failures(polynomial)
            if defects:
                members.append({
                    "family": "Galvin_T_m_t_1",
                    "m": m,
                    "t": t,
                    "order": order,
                    "polynomial": polynomial,
                    "log_concavity_failures": defects,
                })
        if tree_hit is not None:
            break

    # Stronger defects and lower orders are searched first.  Ordering changes
    # search latency only; every retained pair is still checked exactly.
    members.sort(
        key=lambda row: (
            max(
                Fraction(
                    defect["neighbor_product"],
                    defect["center_square"],
                )
                for defect in row["log_concavity_failures"]
            ),
            -row["order"],
        ),
        reverse=True,
    )

    standard = []
    for order in range(1, args.maximum_path_star_size + 1):
        standard.append({
            "family": "path",
            "parameter": order,
            "order": order,
            "polynomial": path_polynomial(order),
        })
    for leaves in range(1, args.maximum_path_star_size + 1):
        standard.append({
            "family": "star",
            "parameter": leaves,
            "order": leaves + 1,
            "polynomial": star_polynomial(leaves),
        })
    for left in range(args.maximum_double_star_leaves + 1):
        for right in range(left, args.maximum_double_star_leaves + 1):
            standard.append({
                "family": "double_star",
                "parameter": [left, right],
                "order": left + right + 2,
                "polynomial": double_star_polynomial(left, right),
            })
    unique = {}
    for row in standard:
        unique.setdefault(tuple(row["polynomial"]), row)
    standard = list(unique.values())
    assert all(
        first_unimodality_failure(row["polynomial"]) is None
        for row in standard
    )
    print(
        "NON_LC_GALVIN", len(members),
        "STANDARD", len(standard),
        "TREE_HIT", tree_hit is not None,
        flush=True,
    )

    checks = 0
    forest_hit = None
    if tree_hit is None:
        for index, first in enumerate(members):
            if index % 10 == 0:
                print("GALVIN_INDEX", index, "CHECKS", checks, flush=True)
            for second in standard:
                product = convolve(first["polynomial"], second["polynomial"])
                checks += 1
                failure = first_unimodality_failure(product)
                if failure is not None:
                    forest_hit = {
                        "galvin_factor": first,
                        "standard_factor": second,
                        "forest_order": first["order"] + second["order"],
                        "product_polynomial": product,
                        "unimodality_failure": failure,
                    }
                    print(
                        "FOREST_CANDIDATE",
                        first["m"], first["t"],
                        second["family"], second["parameter"],
                        flush=True,
                    )
                    break
            if forest_hit is not None:
                break

    hit = tree_hit if tree_hit is not None else forest_hit
    payload = {
        "schema": "galvin-standard-tree-factor-counterexample-search-root-v1",
        "status": (
            "FINITE_EXACT_TREE_OR_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_INDEPENDENT_LITERAL_AUDIT"
            if hit is not None else
            "NO_NONUNIMODAL_PRODUCT_IN_BOUNDED_GALVIN_STANDARD_FACTOR_SEARCH_EVIDENCE_ONLY"
        ),
        "parameters": {
            "maximum_m": args.maximum_m,
            "maximum_t": args.maximum_t,
            "maximum_order": args.maximum_order,
            "maximum_path_star_size": args.maximum_path_star_size,
            "maximum_double_star_leaves": args.maximum_double_star_leaves,
        },
        "rooted_state_formula": {
            "branch_excluded": "(1+2x)^t",
            "branch_included": "x(1+x)^t",
            "tree": "((1+2x)^t+x(1+x)^t)^m+x(1+2x)^(mt)",
        },
        "non_log_concave_galvin_members": len(members),
        "unique_standard_tree_factors": len(standard),
        "exact_products_checked": checks,
        "tree_hit": tree_hit,
        "forest_hit": forest_hit,
        "scope_warning": (
            "No-hit output is finite evidence only. Any hit must be rebuilt "
            "from literal adjacency lists by an independent implementation."
        ),
        "dependencies": {
            name: sha256(HERE / name)
            for name in (
                "search_nonlogconcave_tree_product_counterexample_root.py",
                "search_t3_family_forest_product_counterexample_root.py",
            )
        },
        "script_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
