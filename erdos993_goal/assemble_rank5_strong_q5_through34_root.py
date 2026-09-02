#!/usr/bin/env python3
"""Assemble the exact, independently audited strong-Q5 theorem through order 34."""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import networkx as nx
import sympy as sp

from assemble_rank5_strong_q5_through28_root import (
    PINNED,
    verify_preservation_identity,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_strong_q5_through34_theorem_exact_root_20260826.json"
BASE = HERE / "rank5_strong_q5_order11_base_exact_root_20260826.json"
BASE_AUDIT = HERE / "rank5_strong_q5_base_small_grid_independent_audit_root_20260826.json"
SMALL = HERE / "rank5_ratio_payment_through34_small_core_grid_exact_root_20260826.json"
SMALL_AUDIT = HERE / "rank5_small_grid_through34_independent_audit_root_20260826.json"
LARGE = HERE / "rank5_ratio_payment_through34_large_core_grid_exact_root_20260826.json"
OLD_LARGE_AUDIT = HERE / "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.json"
LARGE_EXTENSION_AUDIT = HERE / "rank5_ratio_payment_through34_large_core_extension_independent_audit_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    actual_pins = {name: sha256(HERE / name) for name in PINNED}
    assert actual_pins == PINNED
    base = load(BASE)
    base_audit = load(BASE_AUDIT)
    small = load(SMALL)
    small_audit = load(SMALL_AUDIT)
    large = load(LARGE)
    old_large_audit = load(OLD_LARGE_AUDIT)
    extension_audit = load(LARGE_EXTENSION_AUDIT)

    assert base["status"] == "PASS_EXACT_RANK5_STRONG_Q5_ORDER11_BASE"
    assert base["unlabeled_trees"] == 235 and base["negative_reserves"] == 0
    assert int(base["minimum_five_Q5_minus_i4_i5"]) > 0
    assert base_audit["status"] == "PASS_INDEPENDENT_RANK5_STRONG_Q5_BASE_AND_SMALL_CORE_GRID_AUDIT"
    assert base_audit["agreement"]["base_minimum"] is True

    assert small["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_SMALL_CORE_GRID"
    assert small["coverage"]["nonstar_core_sibling_cells"] == 392
    assert small["coverage"]["rooted_payment_rows"] == 140_008_201
    assert small["coverage"]["negative_margins"] == 0
    assert small_audit["status"] == "PASS_INDEPENDENT_RANK5_SMALL_CORE_GRID_THROUGH34_AUDIT"
    assert small_audit["coverage"]["matching_rows"] == 392
    assert small_audit["coverage"]["rooted_payment_rows"] == 140_008_201
    assert small_audit["agreement"] == {
        "all_nonstar_rows_field_for_field": True,
        "all_star_rows_field_for_field": True,
    }
    small_pairs = {
        (row["total_tree_order"], row["core_order"])
        for row in small["nonstar_cells"] + small["star_center_cells"]
    }
    assert all(int(row["minimum_margin"]) > 0 for row in small["nonstar_cells"])
    assert all(int(row["margin"]) > 0 for row in small["star_center_cells"])

    assert large["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_LARGE_CORE_GRID"
    expected_large_pairs = {
        (core, siblings)
        for core in range(20, 33)
        for siblings in range(33 - core)
    }
    assert {tuple(pair) for pair in large["core_sibling_pairs"]} == expected_large_pairs
    assert large["coverage"] == {
        "core_sibling_pairs": 91,
        "analytic_cells": 910,
        "negative_terminal_minima": 0,
        "matching_through28_cells": 280,
    }
    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in large["cells"])
    assert all(sp.Rational(row["denominator_minimum"]) > 0 for row in large["cells"])
    assert old_large_audit["status"] == "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_LARGE_CORE_GRID_AUDIT"
    assert old_large_audit["coverage"]["analytic_cells"] == 280
    assert extension_audit["status"] == "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_THROUGH34_LARGE_CORE_EXTENSION_AUDIT"
    assert extension_audit["coverage"]["extension_analytic_cells"] == 630
    assert extension_audit["coverage"]["combined_analytic_cells"] == 910
    assert extension_audit["coverage"]["negative_terminal_minima"] == 0
    large_pairs = {
        (core + siblings + 2, core)
        for core, siblings in expected_large_pairs
    }

    expected_induction_pairs = {
        (order, core)
        for order in range(12, 35)
        for core in range(order - 1)
    }
    covered_pairs = small_pairs | large_pairs
    assert small_pairs.isdisjoint(large_pairs)
    assert len(expected_induction_pairs) == 506
    assert covered_pairs == expected_induction_pairs
    identity = verify_preservation_identity()

    reports = {
        path.name: sha256(path)
        for path in (
            BASE, BASE_AUDIT, SMALL, SMALL_AUDIT, LARGE,
            OLD_LARGE_AUDIT, LARGE_EXTENSION_AUDIT,
        )
    }
    payload = {
        "schema": "rank5-strong-q5-through34-theorem-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK5_STRONG_Q5_FOR_EVERY_TREE_ORDER_11_THROUGH_34",
        "theorem": (
            "For every tree T with 11<=|T|<=34, "
            "Q5(T)>=i4(T)*i5(T)/5, where "
            "Q5(T)=10*i5(T)^2-i4(T)*i5(T)-12*i4(T)*i6(T)."
        ),
        "base": {
            "order": 11,
            "unlabeled_trees": 235,
            "minimum_five_Q5_minus_i4_i5": base["minimum_five_Q5_minus_i4_i5"],
        },
        "induction": {
            "orders": [12, 34],
            "terminal_decomposition": (
                "Choose a support vertex p whose neighbors other than its "
                "unique inward neighbor are leaves (with the star handled as "
                "the empty-core case). Delete one leaf to form B; then B-p is "
                "a connected terminal core C plus s sibling isolates."
            ),
            "preservation_identity": identity,
            "positivity": (
                "Here a=i4(B)>0 and d=i3(B-p)>0. Each exact terminal cell "
                "proves M-a*d*e*(a+d)>=0, so F(B)>=0 implies F(G)>=0."
            ),
            "terminal_order_core_pairs_expected": 506,
            "terminal_order_core_pairs_covered": len(covered_pairs),
            "missing_pairs": [],
            "small_core_orders": [0, 19],
            "large_core_orders": [20, 32],
            "small_exact_rooted_payment_rows": 140_008_201,
            "large_exact_analytic_cells": 910,
            "independent_small_grid_rows_matched": 392,
            "independent_large_analytic_cells_recomputed": 910,
        },
        "proof_inputs": {
            "reports": reports,
            "pinned_sources_and_lower_rank_theorems": actual_pins,
        },
        "software": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
            "networkx": nx.__version__,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This rank-5 quantitative theorem is a proof input; it is not by "
            "itself the complete rank-8 or all-rank forest theorem."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("COVERED_TERMINAL_PAIRS", len(covered_pairs))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
