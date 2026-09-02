#!/usr/bin/env python3
"""Assemble the exact all-order rank-seven alpha(B)=11 boundary theorem."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OBSTRUCTIONS = ROOT / "rank7_alpha11_obstructions_wave14_exact_20260813.json"
DISCONNECTED = ROOT / "rank7_disconnected_n21_n22_wave14_exact_20260813.json"
CONNECTED = ROOT / "rank7_alpha11_connected_n21_n22_exact_20260813.json"
DEFAULT_REPORT = ROOT / "rank7_alpha11_boundary_theorem_exact_20260813.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(poly: list[int], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def q7(poly: list[int]) -> int:
    p6, p7, p8 = (coefficient(poly, rank) for rank in (6, 7, 8))
    return 14 * p7 * p7 - p6 * p7 - 16 * p6 * p8


def v7(poly: list[int]) -> int:
    b5, b6, b7 = (coefficient(poly, rank) for rank in (5, 6, 7))
    return 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6 * b6


def parse_fraction(text: str) -> Fraction:
    return Fraction(text)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    obstruction = json.loads(OBSTRUCTIONS.read_text(encoding="utf-8"))
    disconnected = json.loads(DISCONNECTED.read_text(encoding="utf-8"))
    connected = json.loads(CONNECTED.read_text(encoding="utf-8"))

    assert obstruction["status"] == (
        "PASS_EXACT_FINITE_RANK7_ALPHA11_OBSTRUCTIONS_THROUGH_ORDER_20_NOT_THEOREM"
    )
    rows = obstruction["obstructions"]["rows"]
    assert len(rows) == obstruction["obstructions"]["distinct_negative_V7_rows"] == 15
    assert Counter(row["order"] for row in rows) == {19: 7, 20: 8}
    assert all(row["alpha"] == 11 and row["components"] == 1 for row in rows)
    assert all(row["V7"] == v7(row["polynomial"]) < 0 for row in rows)
    assert sum(row["tree_realizations"] for row in rows) == 15
    assert sum(row["root_occurrences"] for row in rows) == 293
    assert sum(row["distinct_C_states_including_unattached"] for row in rows) == 246

    # Recheck the exact identity arithmetic for every row's worst literal
    # reconstruction.  The source replay checks all 246 reconstructions.
    row_minima = []
    for row in rows:
        item = row["minimum_coupled_reconstruction"]
        base, deletion, full = item["B"], item["C"], item["P"]
        assert item["Q7"] == q7(full) >= 0
        assert item["V7"] == v7(base) == row["V7"]
        p6, b5, c6 = coefficient(full, 6), coefficient(base, 5), coefficient(deletion, 6)
        numerator = 7 * b5 * q7(full) + 21 * c6 * p6 * b5 + v7(base) * p6
        denominator = 2 * p6 * b5
        assert numerator == item["cleared_numerator"] > 0
        assert Fraction(numerator, denominator) == parse_fraction(item["margin"]["text"])
        row_minima.append(Fraction(numerator, denominator))

    coupled = obstruction["coupled_reconstructions"]
    assert coupled["distinct_B_C_checks"] == 246
    assert coupled["Q7_negative_checks"] == coupled["residual_negative_checks"] == 0
    assert min(row_minima) == parse_fraction(coupled["global_minimum"]["margin"]["text"])
    assert min(row_minima) == Fraction(740_494_109_067, 8_823_188) > 0

    assert disconnected["status"] == "PASS_EXACT_ALL_DISCONNECTED_FORESTS_V7_ORDERS21_22"
    disconnected_summary = {}
    for order in (21, 22):
        row = disconnected["records"][str(order)]
        assert row["negative_alpha_at_least_11"] == []
        alpha11_occurrences = (
            row["alpha_at_least_11_occurrences"]
            - row["alpha_at_least_12_occurrences"]
        )
        # The alpha>=11 minimum is strictly below the alpha>=12 minimum, so
        # its witness lies in the exact alpha=11 slice.
        minimum11 = row["minimum_alpha_at_least_11"]["value"]
        assert minimum11 < row["minimum_alpha_at_least_12"]["value"]
        assert minimum11 > 0
        disconnected_summary[str(order)] = {
            "covering_product_occurrences": row["product_occurrences"],
            "alpha11_covering_occurrences": alpha11_occurrences,
            "negative_V7_alpha11_rows": 0,
            "minimum_V7_alpha11": minimum11,
            "duplicates_are_harmless": True,
        }

    assert connected["status"] == "PASS_EXACT_CONNECTED_ALPHA11_V7_ORDERS21_22"
    for order, row in connected["records"].items():
        assert row["negative_V7_alpha11_trees"] == 0
        assert row["minimum_V7_alpha11"] > 0

    negative_polynomials = [row["polynomial"] for row in rows]
    report = {
        "status": "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM",
        "theorem": (
            "For every forest B with alpha(B)=11, V7(B) is negative only "
            "on the 15 listed connected tree rows at orders 19 and 20; "
            "every literal pendant reconstruction of those rows has "
            "Q7(P)>=0 and H7(P)-H6(B)>0."
        ),
        "all_order_reason": (
            "Every forest is bipartite, so alpha(B)>=ceil(|B|/2). "
            "Thus alpha(B)=11 forces |B|<=22, exactly the exhausted range."
        ),
        "classification": {
            "orders_at_most_18": "no negative V7 row",
            "order_19": "7 negative rows, all connected trees",
            "order_20": "8 negative rows, all connected trees",
            "orders_21_22_connected": connected["records"],
            "orders_21_22_disconnected": disconnected_summary,
            "negative_V7_polynomials": negative_polynomials,
        },
        "literal_pendant_reconstructions": {
            "why_complete": (
                "Each negative B is connected. Restoring the support p and "
                "leaf l in a forest either leaves p unattached to B, giving "
                "C=B, or attaches p to exactly one vertex v of B, giving "
                "C=I(B-v); two attachments would create a cycle."
            ),
            "matching_unlabeled_trees": 15,
            "root_occurrences": 293,
            "distinct_B_C_polynomial_checks": 246,
            "Q7_negative_checks": 0,
            "negative_coupled_margin_checks": 0,
            "minimum_margin": "740494109067/8823188",
        },
        "hashes": {
            OBSTRUCTIONS.name: sha256(OBSTRUCTIONS),
            DISCONNECTED.name: sha256(DISCONNECTED),
            CONNECTED.name: sha256(CONNECTED),
        },
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("negative_V7_rows=15 orders={19:7,20:8}")
    print("literal_B_C_checks=246 negative_margins=0")
    print("minimum_margin=740494109067/8823188")
    print(f"report_sha256={sha256(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
