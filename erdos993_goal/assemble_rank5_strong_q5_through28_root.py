#!/usr/bin/env python3
"""Assemble the exact strong-Q5 theorem for trees of orders 11 through 28.

The proof is a finite induction.  The order-11 base is exhaustive.  At every
later order choose a terminal support vertex, delete one of its leaf children,
and write the remaining support-deleted forest as a connected terminal core
plus sibling isolates.  Exact finite cells cover core orders 0..19 and exact
analytic Bernstein cells cover core orders 20..26.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_strong_q5_through28_theorem_exact_root_20260826.json"

BASE = HERE / "rank5_strong_q5_order11_base_exact_root_20260826.json"
SMALL = HERE / "rank5_ratio_payment_through28_small_core_grid_exact_root_20260826.json"
LARGE = HERE / "rank5_ratio_payment_through28_large_core_grid_exact_root_20260826.json"
SMALL_AUDIT = HERE / "rank5_strong_q5_base_small_grid_independent_audit_root_20260826.json"
LARGE_AUDIT = HERE / "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.json"

PINNED = {
    "verify_tree_degree_surplus_tau_interval_root.py":
        "24E054CD42BBCC67DE2BB0D675775EDAE3240D9A25913749A605CED1426EC5EF",
    "tree_degree_surplus_tau_interval_exact_root_20260826.json":
        "062A8B4383232A4AEB95324DF7ADBF0FEA1FF1DE1DA50D64A11EB9868487EDFB",
    "verify_rank4_three_halves_leaf_certificate.py":
        "96CBFFC37EA83C71A5E9B8C79440B00AF00138A67C0FF926DBD3B2FD7BEA1396",
    "RANK4_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md":
        "65D25F0F6F7E7BDE888712D5AEEE37D747100AF79BD38531DFE893CB234E4732",
    "verify_forest_rank345_defect_ceiling.py":
        "B2AAF96271AE47FA606E35F56D8C3841977F35347C691594CCADBA72B747C59B",
    "FOREST_RANK345_DEFECT_CEILING_2026-07-28.md":
        "ACA8EDFD30E249FB46155237EE49CD21695E4A1459E8D494176D3F000768E085",
    "verify_rank5_cross_drop_certificate.py":
        "61F33A0CF40C93146FA1912F61DADF38FFE5AE2CF349EC0BA360542630E8633D",
    "verify_forest_rank34_monotonicity.py":
        "40D22D328A631208F76743652FF6E300DFAB32D83DC69823745197FB79B0FE0A",
    "verify_rank2_factorial_curvature_forests.py":
        "7812055A07E890FB372E18A5906748F6124AFA451A9402B53F8BFAF9AFFA19FD",
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "verify_rank5_terminal_payment_assembly.py":
        "1D05C10390DC31E4F96539FC6EB7EE7F4B8A3A2FD3D1FE74C663A1CC9FDC7F98",
    "verify_rank5_normalized_algebra_lemma.py":
        "DD519E717221D1E7BDCDED2B246C961E8C74980E77640B526479568783D8B22E",
    "certify_rank5_ratio_payment_order28_tree_cells_root.py":
        "BBB10D379C4866769752996EC0721C3B89075F4924F981AE6630B62F53013670",
    "certify_rank5_ratio_payment_order28_large_cores_root.py":
        "EFE98417A975E656E1D8735F39EB0BFC2FCE408D810395A06F3F217618A3D6A9",
    "explore_rank4_three_halves_grouped.py":
        "0F700C716739ABEF49DB90C9890C3218186F680E7CA71DC81A82249BC9951AFA",
    "certify_rank5_strong_q5_order11_base_root.py":
        "8B65EF6ED3E595C0A2727ADB898256E149BDBA26C0AA1ABFC1C59621253B1942",
    "certify_rank5_ratio_payment_through28_small_core_grid_root.py":
        "7C5A7CE82F71DED00B90D6F0D7129D4D54C8A8DC96DF789D7D89285647245720",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def verify_preservation_identity() -> str:
    a, b, c, d, e, f = sp.symbols("a b c d e f", positive=True)
    q_old = 10 * b**2 - a * b - 12 * a * c
    q_new = 10 * (b + e) ** 2 - (a + d) * (b + e) - 12 * (a + d) * (c + f)
    q4 = 8 * e**2 - d * e - 10 * d * f
    cross_error = (
        a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 50 * (b * d - a * e) ** 2
    )
    payment = 6 * a * (a + d) * q4 + cross_error
    assert sp.factor(q_new - q_old - d * q_old / a - payment / (5 * a * d)) == 0
    f_old = q_old - a * b / 5
    f_new = q_new - (a + d) * (b + e) / 5
    remainder = sp.factor(
        f_new - (a + d) * f_old / a
        - (payment - a * d * e * (a + d)) / (5 * a * d)
    )
    assert remainder == 0
    return (
        "F(G)=(a+d)F(B)/a + "
        "(M-a*d*e*(a+d))/(5*a*d), where F=Q5-i4*i5/5"
    )


def main() -> int:
    actual_pins = {name: sha256(HERE / name) for name in PINNED}
    assert actual_pins == PINNED, (actual_pins, PINNED)

    base = load(BASE)
    small = load(SMALL)
    large = load(LARGE)
    small_audit = load(SMALL_AUDIT)
    large_audit = load(LARGE_AUDIT)
    assert base["status"] == "PASS_EXACT_RANK5_STRONG_Q5_ORDER11_BASE"
    assert base["unlabeled_trees"] == 235 and base["negative_reserves"] == 0
    assert int(base["minimum_five_Q5_minus_i4_i5"]) > 0
    assert base["source_sha256"] == sha256(HERE / "certify_rank5_strong_q5_order11_base_root.py")

    assert small["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH28_SMALL_CORE_GRID"
    assert small["coverage"]["nonstar_core_sibling_cells"] == 278
    assert small["coverage"]["rooted_payment_rows"] == 82_439_257
    assert small["coverage"]["negative_margins"] == 0
    small_pairs = {
        (row["total_tree_order"], row["core_order"])
        for row in small["nonstar_cells"]
    }
    small_pairs.update(
        (row["total_tree_order"], row["core_order"])
        for row in small["star_center_cells"]
    )
    assert all(int(row["minimum_margin"]) > 0 for row in small["nonstar_cells"])
    assert all(int(row["margin"]) > 0 for row in small["star_center_cells"])
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_RANK5_STRONG_Q5_BASE_AND_SMALL_CORE_GRID_AUDIT"
    )
    assert small_audit["grid"]["rooted_payment_rows"] == 82_439_257
    assert small_audit["agreement"] == {
        "base_minimum": True,
        "all_nonstar_rows_field_for_field": True,
        "all_star_rows_field_for_field": True,
    }

    assert large["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_TREE_CELLS"
    assert large["source_sha256"] == sha256(HERE / "certify_rank5_ratio_payment_order28_tree_cells_root.py")
    expected_large_core_sibling = {
        (core, siblings)
        for core in range(20, 27)
        for siblings in range(27 - core)
    }
    assert {tuple(pair) for pair in large["core_sibling_pairs"]} == expected_large_core_sibling
    labels = {
        "q_upper", "q_half_low_r", "q_half_middle_r",
        "q_cross_middle_r", "q_cross_high_r",
    }
    expected_large_cells = {
        (core, siblings, branch, label)
        for core, siblings in expected_large_core_sibling
        for branch in ("zero", "cauchy")
        for label in labels
    }
    actual_large_cells = {
        (
            row["core_order"], row["sibling_isolates"],
            row["gamma_branch"], row["root_region"],
        )
        for row in large["cells"]
    }
    assert actual_large_cells == expected_large_cells
    assert len(large["cells"]) == 280
    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in large["cells"])
    assert all(sp.Rational(row["denominator_minimum"]) > 0 for row in large["cells"])
    assert large_audit["status"] == (
        "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_LARGE_CORE_GRID_AUDIT"
    )
    assert large_audit["coverage"]["analytic_cells"] == 280
    assert large_audit["coverage"]["negative_terminal_minima"] == 0
    assert large_audit["coverage"]["matching_primary_initial_certificates"] == 280
    large_pairs = {
        (core + siblings + 2, core)
        for core, siblings in expected_large_core_sibling
    }

    expected_induction_pairs = {
        (order, core)
        for order in range(12, 29)
        for core in range(order - 1)
    }
    covered_pairs = small_pairs | large_pairs
    assert small_pairs.isdisjoint(large_pairs)
    assert covered_pairs == expected_induction_pairs
    assert len(covered_pairs) == 323

    identity = verify_preservation_identity()
    report_dependencies = {
        BASE.name: sha256(BASE),
        SMALL.name: sha256(SMALL),
        LARGE.name: sha256(LARGE),
        SMALL_AUDIT.name: sha256(SMALL_AUDIT),
        LARGE_AUDIT.name: sha256(LARGE_AUDIT),
    }
    payload = {
        "schema": "rank5-strong-q5-through28-theorem-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK5_STRONG_Q5_FOR_EVERY_TREE_ORDER_11_THROUGH_28",
        "theorem": (
            "For every tree T with 11<=|T|<=28, "
            "Q5(T)>=i4(T)*i5(T)/5, where "
            "Q5(T)=10*i5(T)^2-i4(T)*i5(T)-12*i4(T)*i6(T)."
        ),
        "base": {
            "order": 11,
            "unlabeled_trees": 235,
            "minimum_five_Q5_minus_i4_i5": base["minimum_five_Q5_minus_i4_i5"],
        },
        "induction": {
            "orders": [12, 28],
            "terminal_decomposition": (
                "Choose a support vertex p whose neighbors other than its "
                "unique inward neighbor are leaves (with the star handled as "
                "the empty-core case). Delete one leaf to form B; "
                "then B-p is a connected terminal core C plus s sibling isolates."
            ),
            "preservation_identity": identity,
            "positivity": (
                "At these orders a=i4(B)>0 and d=i3(B-p)>0. Each covered "
                "terminal cell proves M-a*d*e*(a+d)>=0, so F(B)>=0 implies F(G)>=0."
            ),
            "terminal_order_core_pairs_expected": len(expected_induction_pairs),
            "terminal_order_core_pairs_covered": len(covered_pairs),
            "missing_pairs": [],
            "small_core_orders": [0, 19],
            "large_core_orders": [20, 26],
            "small_exact_rooted_payment_rows": 82_439_257,
            "large_exact_analytic_cells": 280,
            "independent_small_grid_rows_matched": 278,
            "independent_large_analytic_cells_recomputed": 280,
        },
        "proof_inputs": {
            "reports": report_dependencies,
            "pinned_sources_and_lower_rank_theorems": actual_pins,
        },
        "software": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
            "networkx": nx.__version__,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This theorem is a rank-5 quantitative input through order 28; "
            "it is not by itself the full rank-8 or global unimodality theorem."
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
