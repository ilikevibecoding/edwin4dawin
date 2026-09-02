#!/usr/bin/env python3
"""Exact component-resolved coefficient bounds for forests of orders 6..15."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as catalog


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED_DEPENDENCY = {
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json":
        "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
}
EXPECTED_TREE_COUNTS = (0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741)
EXPECTED_FOREST_TOTALS = {
    6: 20, 7: 37, 8: 76, 9: 153, 10: 329,
    11: 710, 12: 1601, 13: 3658, 14: 8599, 15: 20514,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def forest_type_counts(tree_counts: list[int]):
    states = {(0, 0): 1}
    for order in range(1, 16):
        updated = {}
        for (old_n, old_c), count in states.items():
            maximum = (15 - old_n) // order
            for copies in range(maximum + 1):
                key = (old_n + copies * order, old_c + copies)
                multiplicity = math.comb(tree_counts[order] + copies - 1, copies)
                updated[key] = updated.get(key, 0) + count * multiplicity
        states = updated
    return states


def minimum_prefix(values) -> list[int]:
    return [min(value[index] for value in values) for index in range(5)]


def main() -> None:
    dependency_hashes = {name: sha256(HERE / name) for name in EXPECTED_DEPENDENCY}
    assert dependency_hashes == EXPECTED_DEPENDENCY
    peak = catalog.gate()
    tree_types = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = [0, 1]
    for order in range(2, 16):
        trees = list(nx.nonisomorphic_trees(order))
        tree_counts.append(len(trees))
        tree_types[order] = {catalog.tree_jet(tree) for tree in trees}
        peak = max(peak, catalog.gate())
    assert tuple(tree_counts) == EXPECTED_TREE_COUNTS

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 16):
        for component_order in range(1, total + 1):
            remainder = total - component_order
            sources = [
                (components, values)
                for (order, components), values in forests.items()
                if order == remainder
            ]
            for components, old_values in sources:
                target = forests.setdefault((total, components + 1), set())
                for old in old_values:
                    for component in tree_types[component_order]:
                        target.add(catalog.multiply(old, component))
        peak = max(peak, catalog.gate())

    type_counts = forest_type_counts(tree_counts)
    assert {
        order: sum(
            type_counts.get((order, components), 0)
            for components in range(1, order + 1)
        )
        for order in range(6, 16)
    } == EXPECTED_FOREST_TOTALS

    rows = []
    global_rows = []
    all_fingerprint_rows = []
    for order in range(6, 16):
        order_values = []
        component_rows = []
        for components in range(1, order + 1):
            values = forests[(order, components)]
            positive = [value for value in values if value[6] > 0]
            zero = [value for value in values if value[6] == 0]
            order_values.extend(values)
            row = {
                "order": order,
                "components": components,
                "unlabeled_forest_types": type_counts[(order, components)],
                "distinct_coefficient_jets": len(values),
                "all_minimum_f0_to_f4": minimum_prefix(values),
                "f6_positive": {
                    "jet_count": len(positive),
                    "minimum_f0_to_f4": minimum_prefix(positive) if positive else None,
                    "maximum_f5_over_f6": None,
                    "maximizing_jet_f0_to_f6": None,
                },
                "f6_zero": {
                    "jet_count": len(zero),
                    "minimum_f0_to_f4": minimum_prefix(zero) if zero else None,
                    "maximum_f5": max((value[5] for value in zero), default=None),
                },
            }
            if positive:
                maximum = max(
                    positive, key=lambda value: Fraction(value[5], value[6])
                )
                row["f6_positive"]["maximum_f5_over_f6"] = f"{maximum[5]}/{maximum[6]}"
                row["f6_positive"]["maximizing_jet_f0_to_f6"] = list(maximum)
            component_rows.append(row)
            all_fingerprint_rows.append(((order, components), values))
        positive_order = [value for value in order_values if value[6] > 0]
        maximum = max(
            positive_order, key=lambda value: Fraction(value[5], value[6])
        )
        global_rows.append(
            {
                "order": order,
                "unlabeled_forest_types": EXPECTED_FOREST_TOTALS[order],
                "distinct_coefficient_jets": sum(
                    row["distinct_coefficient_jets"] for row in component_rows
                ),
                "f6_positive_maximum_f5_over_f6": f"{maximum[5]}/{maximum[6]}",
                "f6_positive_maximizing_jet_f0_to_f6": list(maximum),
                "f6_zero_jet_count": sum(
                    row["f6_zero"]["jet_count"] for row in component_rows
                ),
            }
        )
        rows.extend(component_rows)

    payload = {
        "schema": "rank8-forest6-15-component-jet-bounds-v1",
        "status": "PASS_EXACT_FOREST6_15_COMPONENT_JET_BOUNDS",
        "theorem": (
            "For every forest of order 6..15 and every component count, the "
            "displayed lower bounds on i0..i4, f6=0/positive partition, and "
            "maximum i5/i6 ratios exhaust all coefficient jets."
        ),
        "enumeration": {
            "method": (
                "NetworkX free-tree catalogs, rooted included/excluded coefficient "
                "DP through rank 6, then exhaustive multiset-of-components jet DP."
            ),
            "tree_counts": {str(i): tree_counts[i] for i in range(1, 16)},
            "forest_totals": {str(k): v for k, v in EXPECTED_FOREST_TOTALS.items()},
            "component_jet_sparse_sha256": catalog.sparse_hash(all_fingerprint_rows),
        },
        "global_order_rows": global_rows,
        "component_rows": rows,
        "resources": {
            "abort_private_bytes": catalog.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "dependency_hashes": dependency_hashes,
        "proof_boundary": (
            "This finite catalog certifies only the displayed coefficient bounds "
            "for forest orders 6..15.  It does not by itself prove a mask0 cell, "
            "any other mask, q=v, connected Q8, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COMPONENT_ROWS", len(rows), "PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
