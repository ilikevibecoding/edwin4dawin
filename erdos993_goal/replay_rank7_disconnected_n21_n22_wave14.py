#!/usr/bin/env python3
"""Exact V7 census of every disconnected forest of orders 21 and 22.

The enumeration is polynomial-complete and allows duplicate products.
For order 21 a smallest component has order at most 10.  For order 22:

* if a non-isolate component has order at most 11, select it;
* the only missing two-component case is K1 plus a connected order-21 tree;
* if deleting an isolate leaves a disconnected order-21 forest, that forest
  has a component of order at most 10 and is selected separately;
* the edgeless forest is checked directly.

Thus every disconnected forest independence polynomial occurs.  This script
does not enumerate connected trees, which have separate complete passes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from math import comb
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from replay_rank6_component_pgc_boundary import tree_polynomial
from replay_rank7_pgc_census_wave14 import coeff, v7


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = ROOT / "rank7_disconnected_n21_n22_wave14_exact_20260813.json"
EXPECTED_TREE_COUNTS = (
    0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
    3159, 7741, 19320, 48629, 123867, 317955, 823065, 2144505,
)
EXPECTED_FOREST_COUNTS = (
    1, 1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348,
    2974, 6777, 15739, 37524, 90965, 224562, 561475, 1425505,
)


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    return tuple(int(value) for value in Poly(list(left)) * Poly(list(right)))


def components(poly: Polynomial) -> int:
    order = coeff(poly, 1)
    return order - comb(order, 2) + coeff(poly, 2)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    started = time.perf_counter()

    tree_sets: list[set[Polynomial]] = [set() for _ in range(21)]
    tree_sets[1].add((1, 1))
    tree_counts = [0] * 22
    tree_counts[1] = 1
    for order in range(2, 21):
        current: set[Polynomial] = set()
        for tree in nx.nonisomorphic_trees(order):
            tree_counts[order] += 1
            current.add(tree_polynomial(tree))
        assert tree_counts[order] == EXPECTED_TREE_COUNTS[order]
        tree_sets[order] = current
        print(
            f"trees order={order} unlabeled={tree_counts[order]} "
            f"polynomials={len(current)}",
            flush=True,
        )

    forests: list[set[Polynomial]] = [set() for _ in range(21)]
    forests[0].add((1,))
    for order in range(1, 21):
        current: set[Polynomial] = set()
        for component_order in range(1, order + 1):
            for component in tree_sets[component_order]:
                component_poly = Poly(list(component))
                for rest in forests[order - component_order]:
                    current.add(tuple(int(value) for value in component_poly * Poly(list(rest))))
        forests[order] = current
        assert len(current) == EXPECTED_FOREST_COUNTS[order]
        print(f"forests order={order} polynomials={len(current)}", flush=True)

    records = {
        21: {
            "product_occurrences": 0,
            "alpha_at_least_11_occurrences": 0,
            "alpha_at_least_12_occurrences": 0,
            "minimum_alpha_at_least_11": None,
            "minimum_alpha_at_least_12": None,
            "negative_alpha_at_least_11": {},
            "negative_alpha_at_least_12": {},
        },
        22: {
            "product_occurrences": 0,
            "alpha_at_least_11_occurrences": 0,
            "alpha_at_least_12_occurrences": 0,
            "minimum_alpha_at_least_11": None,
            "minimum_alpha_at_least_12": None,
            "negative_alpha_at_least_11": {},
            "negative_alpha_at_least_12": {},
        },
    }

    def inspect(poly: Polynomial, order: int, source: str) -> None:
        record = records[order]
        record["product_occurrences"] += 1
        alpha = len(poly) - 1
        value = v7(poly)
        for threshold in (11, 12):
            if alpha < threshold:
                continue
            record[f"alpha_at_least_{threshold}_occurrences"] += 1
            candidate = {
                "value": value,
                "order": order,
                "alpha": alpha,
                "components": components(poly),
                "polynomial": poly,
                "source": source,
            }
            minimum_key = f"minimum_alpha_at_least_{threshold}"
            if record[minimum_key] is None or value < record[minimum_key]["value"]:
                record[minimum_key] = candidate
            if value < 0:
                negative = record[f"negative_alpha_at_least_{threshold}"].setdefault(poly, {
                    **candidate,
                    "sources": set(),
                    "occurrences": 0,
                })
                negative["sources"].add(source)
                negative["occurrences"] += 1

    # Order 21: every disconnected forest has a component of order <=10.
    for component_order in range(1, 11):
        for component in tree_sets[component_order]:
            component_poly = Poly(list(component))
            for rest in forests[21 - component_order]:
                inspect(
                    tuple(int(value) for value in component_poly * Poly(list(rest))),
                    21,
                    f"selected_component_order_{component_order}",
                )

    # Order 22, first cover every forest with a selected non-isolate
    # component of order 2..11.
    for component_order in range(2, 12):
        for component in tree_sets[component_order]:
            component_poly = Poly(list(component))
            for rest in forests[22 - component_order]:
                inspect(
                    tuple(int(value) for value in component_poly * Poly(list(rest))),
                    22,
                    f"selected_nonisolate_component_order_{component_order}",
                )

    isolate = Poly([1, 1])
    # Cover K1 plus a connected order-21 tree by streaming the latter.
    order21_tree_polynomials: set[Polynomial] = set()
    for tree in nx.nonisomorphic_trees(21):
        tree_counts[21] += 1
        poly = tree_polynomial(tree)
        order21_tree_polynomials.add(poly)
    assert tree_counts[21] == EXPECTED_TREE_COUNTS[21]
    for poly in order21_tree_polynomials:
        inspect(
            tuple(int(value) for value in isolate * Poly(list(poly))),
            22,
            "isolate_times_connected_order21_tree_polynomial",
        )

    # If deleting one isolate leaves a disconnected order-21 forest, select
    # a component of that remainder of order <=10.  The remaining factor has
    # order <=19 and is already materialized.
    for component_order in range(1, 11):
        for component in tree_sets[component_order]:
            selected = isolate * Poly(list(component))
            for rest in forests[21 - component_order]:
                inspect(
                    tuple(int(value) for value in selected * Poly(list(rest))),
                    22,
                    f"isolate_then_selected_component_order_{component_order}",
                )

    inspect(tuple(comb(22, rank) for rank in range(23)), 22, "edgeless_order22")

    output_records = {}
    for order, record in records.items():
        converted = {}
        for key, value in record.items():
            if not key.startswith("negative_"):
                converted[key] = value
                continue
            converted[key] = [
                {
                    **{name: item for name, item in row.items() if name != "sources"},
                    "sources": sorted(row["sources"]),
                }
                for row in sorted(value.values(), key=lambda item: (item["value"], item["polynomial"]))
            ]
        output_records[str(order)] = converted

    report = {
        "status": "PASS_EXACT_ALL_DISCONNECTED_FORESTS_V7_ORDERS21_22",
        "scope": {
            "orders": [21, 22],
            "polynomial_complete": True,
            "duplicates_harmless": True,
            "coverage_decomposition": __doc__,
        },
        "coverage": {
            "unlabeled_tree_counts_through_21": tree_counts[1:],
            "tree_polynomial_counts_through_21": [
                *(len(tree_sets[n]) for n in range(1, 21)),
                len(order21_tree_polynomials),
            ],
            "forest_polynomial_counts_through_20": [len(forests[n]) for n in range(21)],
        },
        "records": output_records,
        "elapsed_seconds": time.perf_counter() - started,
    }
    assert all(
        not report["records"][str(order)][f"negative_alpha_at_least_{threshold}"]
        for order in (21, 22) for threshold in (11, 12)
    )
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    for order in (21, 22):
        record = report["records"][str(order)]
        print(
            f"order={order} products={record['product_occurrences']} "
            f"minimum_alpha11={record['minimum_alpha_at_least_11']['value']} "
            f"minimum_alpha12={record['minimum_alpha_at_least_12']['value']}",
            flush=True,
        )
    print(f"script_sha256={hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}")
    print(f"report_sha256={hashlib.sha256(args.output.read_bytes()).hexdigest().upper()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
