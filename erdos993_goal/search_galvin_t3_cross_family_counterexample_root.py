#!/usr/bin/env python3
"""Exact bounded Galvin/Galvin and Galvin/T3 forest-product search."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from flint import fmpz_poly

from search_galvin_standard_tree_factor_counterexample_root import (
    galvin_polynomial,
)
from search_t3_family_forest_product_counterexample_root import (
    family_polynomial,
    first_unimodality_failure,
    log_concavity_failures,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "galvin_t3_cross_family_search_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolve(left: list[int], right: list[int]) -> list[int]:
    product = fmpz_poly(left) * fmpz_poly(right)
    return [int(product[index]) for index in range(len(product))]


def compact(row: dict) -> dict:
    return {
        key: row[key]
        for key in (
            "family", "parameters", "order", "polynomial",
            "log_concavity_failures",
        )
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--galvin-maximum-m", type=int, default=50)
    parser.add_argument("--galvin-maximum-t", type=int, default=50)
    parser.add_argument("--galvin-maximum-order", type=int, default=500)
    parser.add_argument("--t3-maximum-parameter", type=int, default=75)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    galvin = []
    for m in range(1, args.galvin_maximum_m + 1):
        for t in range(1, args.galvin_maximum_t + 1):
            order, polynomial = galvin_polynomial(m, t)
            if order > args.galvin_maximum_order:
                continue
            assert first_unimodality_failure(polynomial) is None
            galvin.append({
                "family": "Galvin_T_m_t_1",
                "parameters": {"m": m, "t": t},
                "order": order,
                "polynomial": polynomial,
                "log_concavity_failures": log_concavity_failures(polynomial),
            })

    t3 = []
    for starred in (False, True):
        for m in range(1, args.t3_maximum_parameter + 1):
            for n in range(m, args.t3_maximum_parameter + 1):
                order, polynomial = family_polynomial(starred, m, n)
                assert first_unimodality_failure(polynomial) is None
                t3.append({
                    "family": "Tstar_3_m_n" if starred else "T_3_m_n",
                    "parameters": {"m": m, "n": n},
                    "order": order,
                    "polynomial": polynomial,
                    "log_concavity_failures": log_concavity_failures(polynomial),
                })
    print(
        "GALVIN", len(galvin),
        "GALVIN_NON_LC", sum(bool(row["log_concavity_failures"]) for row in galvin),
        "T3", len(t3),
        "T3_NON_LC", sum(bool(row["log_concavity_failures"]) for row in t3),
        flush=True,
    )

    hit = None
    checks = 0
    skipped_both_log_concave = 0
    lanes = []

    def check_lane(label: str, left_rows: list[dict], right_rows: list[dict], symmetric: bool) -> bool:
        nonlocal hit, checks, skipped_both_log_concave
        before = checks
        for left_index, left in enumerate(left_rows):
            if left_index % 25 == 0:
                print("LANE", label, "LEFT_INDEX", left_index, "CHECKS", checks, flush=True)
            candidates = right_rows[left_index:] if symmetric else right_rows
            for right in candidates:
                if (
                    not left["log_concavity_failures"]
                    and not right["log_concavity_failures"]
                ):
                    skipped_both_log_concave += 1
                    continue
                product = convolve(left["polynomial"], right["polynomial"])
                checks += 1
                failure = first_unimodality_failure(product)
                if failure is not None:
                    hit = {
                        "lane": label,
                        "left": compact(left),
                        "right": compact(right),
                        "forest_order": left["order"] + right["order"],
                        "product_polynomial": product,
                        "unimodality_failure": failure,
                    }
                    print("CANDIDATE", label, left["parameters"], right["parameters"], flush=True)
                    return True
        lanes.append({"lane": label, "exact_products_checked": checks - before})
        return False

    if not check_lane("galvin_galvin", galvin, galvin, True):
        check_lane("galvin_t3", galvin, t3, False)

    payload = {
        "schema": "galvin-t3-cross-family-counterexample-search-root-v1",
        "status": (
            "FINITE_EXACT_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_INDEPENDENT_LITERAL_AUDIT"
            if hit is not None else
            "NO_NONUNIMODAL_PRODUCT_IN_BOUNDED_GALVIN_T3_CROSS_FAMILY_SEARCH_EVIDENCE_ONLY"
        ),
        "parameters": {
            "galvin_maximum_m": args.galvin_maximum_m,
            "galvin_maximum_t": args.galvin_maximum_t,
            "galvin_maximum_order": args.galvin_maximum_order,
            "t3_maximum_parameter": args.t3_maximum_parameter,
        },
        "counts": {
            "galvin_members": len(galvin),
            "galvin_non_log_concave": sum(
                bool(row["log_concavity_failures"]) for row in galvin
            ),
            "t3_members": len(t3),
            "t3_non_log_concave": sum(
                bool(row["log_concavity_failures"]) for row in t3
            ),
            "exact_products_checked": checks,
            "skipped_both_log_concave": skipped_both_log_concave,
        },
        "completed_lanes": lanes,
        "hit": hit,
        "scope_warning": (
            "No-hit output is finite evidence only. Any hit requires an "
            "independent literal-adjacency reconstruction and product replay."
        ),
        "dependencies": {
            name: sha256(HERE / name)
            for name in (
                "search_galvin_standard_tree_factor_counterexample_root.py",
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
