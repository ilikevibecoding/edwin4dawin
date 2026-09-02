#!/usr/bin/env python3
"""Exact products of non-LC T3-family trees with standard tree factors."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from search_nonlogconcave_tree_product_counterexample_root import (
    double_star_polynomial,
    path_polynomial,
    star_polynomial,
)
from search_t3_family_forest_product_counterexample_root import (
    convolve,
    family_polynomial,
    first_unimodality_failure,
    log_concavity_failures,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "t3_standard_tree_factor_search_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-family-parameter", type=int, default=75)
    parser.add_argument("--maximum-path-star-size", type=int, default=200)
    parser.add_argument("--maximum-double-star-leaves", type=int, default=80)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    family = []
    for starred in (False, True):
        for m in range(1, args.maximum_family_parameter + 1):
            for n in range(m, args.maximum_family_parameter + 1):
                order, polynomial = family_polynomial(starred, m, n)
                failures = log_concavity_failures(polynomial)
                if failures:
                    family.append({
                        "family": "Tstar_3_m_n" if starred else "T_3_m_n",
                        "m": m, "n": n, "order": order,
                        "polynomial": polynomial,
                        "log_concavity_failures": failures,
                    })

    standard = []
    for order in range(1, args.maximum_path_star_size + 1):
        standard.append({
            "family": "path", "parameter": order, "order": order,
            "polynomial": path_polynomial(order),
        })
    for leaves in range(1, args.maximum_path_star_size + 1):
        standard.append({
            "family": "star", "parameter": leaves, "order": leaves + 1,
            "polynomial": star_polynomial(leaves),
        })
    for left in range(args.maximum_double_star_leaves + 1):
        for right in range(left, args.maximum_double_star_leaves + 1):
            standard.append({
                "family": "double_star", "parameter": [left, right],
                "order": left + right + 2,
                "polynomial": double_star_polynomial(left, right),
            })
    unique = {}
    for row in standard:
        unique.setdefault(tuple(row["polynomial"]), row)
    standard = list(unique.values())
    assert all(first_unimodality_failure(row["polynomial"]) is None for row in standard)
    print("NON_LC_T3", len(family), "STANDARD", len(standard), flush=True)

    checks = 0
    hit = None
    for index, first in enumerate(family):
        if index % 25 == 0:
            print("T3_INDEX", index, "CHECKS", checks, flush=True)
        for second in standard:
            product = convolve(first["polynomial"], second["polynomial"])
            checks += 1
            failure = first_unimodality_failure(product)
            if failure:
                hit = {
                    "t3_factor": first,
                    "standard_factor": second,
                    "forest_order": first["order"] + second["order"],
                    "product_polynomial": product,
                    "unimodality_failure": failure,
                }
                print("CANDIDATE", first["family"], first["m"], first["n"], second["family"], second["parameter"], flush=True)
                break
        if hit:
            break

    payload = {
        "schema": "t3-standard-tree-factor-counterexample-search-root-v1",
        "status": (
            "FINITE_EXACT_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_INDEPENDENT_AUDIT"
            if hit else
            "NO_NONUNIMODAL_PRODUCT_IN_BOUNDED_T3_STANDARD_FACTOR_SEARCH_EVIDENCE_ONLY"
        ),
        "parameters": {
            "maximum_family_parameter": args.maximum_family_parameter,
            "maximum_path_star_size": args.maximum_path_star_size,
            "maximum_double_star_leaves": args.maximum_double_star_leaves,
        },
        "non_log_concave_t3_members": len(family),
        "unique_standard_tree_factors": len(standard),
        "exact_products_checked": checks,
        "hit": hit,
        "scope_warning": "No-hit output is finite evidence only; any hit requires independent literal-tree replay.",
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
