#!/usr/bin/env python3
"""Exact order-20 audit of the two single-forest rank-seven PGC inputs.

The order-20 disconnected pass deliberately streams products with possible
duplicates.  This is still exhaustive because every disconnected forest of
order 20 has a component of order at most 10.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_forest_residual_n20_exact_20260813.json"
FOREST_COUNTS_THROUGH_19 = (
    1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348,
    2974, 6777, 15739, 37524, 90965, 224562, 561475,
)


def coeff(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def q7(poly: tuple[int, ...]) -> int:
    p6, p7, p8 = (coeff(poly, rank) for rank in (6, 7, 8))
    return 14 * p7 * p7 - p6 * p7 - 16 * p6 * p8


def v7(poly: tuple[int, ...]) -> int:
    b5, b6, b7 = (coeff(poly, rank) for rank in (5, 6, 7))
    return 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6 * b6


def main() -> int:
    tree_sets: list[set[tuple[int, ...]]] = [set() for _ in range(20)]
    tree_sets[1].add((1, 1))
    for order in range(2, 20):
        tree_sets[order] = {
            tree_polynomial(tree) for tree in nx.nonisomorphic_trees(order)
        }
        print("tree polynomials", order, len(tree_sets[order]), flush=True)

    forests: list[set[tuple[int, ...]]] = [set() for _ in range(20)]
    forests[0].add((1,))
    records: dict[str, dict[str, object]] = {
        "Q7_alpha_at_least_12": {
            "checks": 0, "minimum": None, "negative_count": 0,
            "most_negative": None,
        },
        "V7_alpha_at_least_11": {
            "checks": 0, "minimum": None, "negative_count": 0,
            "most_negative": None,
        },
    }
    negative_counts_below_threshold = {
        "Q7_by_alpha": {},
        "V7_by_alpha": {},
    }
    required_negative_rows: dict[str, dict[tuple[int, ...], dict[str, object]]] = {
        "Q7": {}, "V7": {},
    }

    def inspect(poly: tuple[int, ...], order: int, source: str) -> None:
        alpha = len(poly) - 1
        values = (("Q7", q7(poly), 12), ("V7", v7(poly), 11))
        for name, value, threshold in values:
            if alpha >= threshold:
                key = f"{name}_alpha_at_least_{threshold}"
                record = records[key]
                record["checks"] = int(record["checks"]) + 1
                candidate = {
                    "value": value,
                    "order": order,
                    "alpha": alpha,
                    "polynomial": poly,
                    "source": source,
                }
                if record["minimum"] is None or value < record["minimum"]["value"]:
                    record["minimum"] = candidate
                if value < 0:
                    record["negative_count"] = int(record["negative_count"]) + 1
                    row = required_negative_rows[name].setdefault(poly, {
                        "value": value,
                        "order": order,
                        "alpha": alpha,
                        "polynomial": poly,
                        "sources": set(),
                        "occurrences": 0,
                    })
                    row["sources"].add(source)
                    row["occurrences"] = int(row["occurrences"]) + 1
                    if (
                        record["most_negative"] is None
                        or value < record["most_negative"]["value"]
                    ):
                        record["most_negative"] = candidate
            elif value < 0:
                table = negative_counts_below_threshold[f"{name}_by_alpha"]
                table[str(alpha)] = table.get(str(alpha), 0) + 1

    for order in range(1, 20):
        current = set()
        for component_order in range(1, order + 1):
            for left in forests[order - component_order]:
                left_poly = Poly(list(left))
                for right in tree_sets[component_order]:
                    current.add(tuple(int(x) for x in left_poly * Poly(list(right))))
        forests[order] = current
        assert len(current) == FOREST_COUNTS_THROUGH_19[order - 1]
        for poly in current:
            source = (
                "distinct_connected_tree_polynomial"
                if poly in tree_sets[order]
                else "distinct_disconnected_forest_polynomial"
            )
            inspect(poly, order, source)
        print("forests", order, len(current), flush=True)

    connected_trees = 0
    order20_connected_eligible = 0
    for tree in nx.nonisomorphic_trees(20):
        connected_trees += 1
        poly = tree_polynomial(tree)
        if len(poly) - 1 >= 11:
            order20_connected_eligible += 1
        inspect(poly, 20, "connected_tree")
    assert connected_trees == 823_065

    disconnected_products = 0
    disconnected_eligible = 0
    for component_order in range(1, 11):
        for left in forests[20 - component_order]:
            left_poly = Poly(list(left))
            for right in tree_sets[component_order]:
                disconnected_products += 1
                poly = tuple(int(x) for x in left_poly * Poly(list(right)))
                if len(poly) - 1 >= 11:
                    disconnected_eligible += 1
                inspect(poly, 20, "disconnected_product_with_duplicates")
    report = {
        "status": "PASS_EXACT_FOREST_RANK7_RESIDUAL_CENSUS_THROUGH_ORDER_20_NOT_THEOREM",
        "scope": {
            "distinct_forest_polynomials_through_order_19": True,
            "order20_connected_trees": connected_trees,
            "order20_disconnected_products_with_duplicates": disconnected_products,
            "order20_exhaustive_reason": "a disconnected order-20 forest has a component of order at most 10",
            "order20_connected_alpha_at_least_11": order20_connected_eligible,
            "order20_disconnected_product_alpha_at_least_11": disconnected_eligible,
        },
        "functionals": {
            "Q7": "14*i7^2-i6*i7-16*i6*i8",
            "V7": "9*i5*i6+105*i5*i7-72*i6^2",
        },
        "required_range_records": records,
        "required_range_negative_rows": {
            name: [
                {
                    **{key: value for key, value in row.items() if key != "sources"},
                    "sources": sorted(row["sources"]),
                }
                for row in sorted(rows.values(), key=lambda item: (item["order"], item["value"], item["polynomial"]))
            ]
            for name, rows in required_negative_rows.items()
        },
        "negative_counts_below_required_threshold": negative_counts_below_threshold,
        "warning": "finite exact evidence only; no all-order claim",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(records, indent=2))
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
