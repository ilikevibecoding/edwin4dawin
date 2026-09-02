#!/usr/bin/env python3
"""Generic exact weighted-core table for an r=1, fixed-neighbor-excess row."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from enumerate_rank7_b2_42_root_profile_all_partitions import (
    assignment_count,
    exact_c5,
    multiset_permutations,
    statistics,
)
from verify_rank7_terminal_broom_rooted_c4_moment import partitions


def tree_shapes(order):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        return [graph]
    return list(nx.nonisomorphic_trees(order))


def enumerate_partition(partition, neighbor_excess):
    order = len(partition)
    shapes = tree_shapes(order)
    assignments = list(multiset_permutations(partition))
    assert len(assignments) == assignment_count(partition)
    tested = degree_feasible = root_feasible = 0
    by_edge = {}
    for shape_index, tree in enumerate(shapes):
        assert set(tree) == set(range(order))
        degrees = [tree.degree(vertex) for vertex in range(order)]
        for weights in assignments:
            tested += 1
            if any(degrees[i] > weights[i] + 1 for i in range(order)):
                continue
            degree_feasible += 1
            if not any(
                weights[i] == neighbor_excess and degrees[i] <= weights[i]
                for i in range(order)
            ):
                continue
            root_feasible += 1
            core_degree, leaf_slots, edge, connected_four, terms = statistics(tree, weights)
            assert core_degree == degrees
            assert all(value >= 0 for value in leaf_slots)
            assert any(
                weights[i] == neighbor_excess and leaf_slots[i] >= 1
                for i in range(order)
            )
            current = by_edge.get(edge)
            if current is None or connected_four < current["V_min"]:
                by_edge[edge] = {
                    "V_min": connected_four,
                    "shape_index": shape_index,
                    "core_edges": [list(item) for item in tree.edges()],
                    "weights_by_vertex": list(weights),
                    "core_degree": core_degree,
                    "leaf_slots": leaf_slots,
                    "shape_terms": terms,
                }
    return {
        "partition": list(partition),
        "B2": sum(comb(value, 2) for value in partition),
        "B3": sum(comb(value, 3) for value in partition),
        "unlabeled_core_shapes": len(shapes),
        "distinct_weight_assignments_per_shape": len(assignments),
        "shape_assignment_pairs": tested,
        "degree_feasible_pairs": degree_feasible,
        "root_feasible_pairs": root_feasible,
        "edge_rows": {str(edge): by_edge[edge] for edge in sorted(by_edge, reverse=True)},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--b2", type=int, required=True)
    parser.add_argument("--neighbor-x", type=int, required=True)
    parser.add_argument("--critical-width", type=int, default=20)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    total = args.n - 2
    compatible = [
        part
        for part in partitions(total, total)
        if sum(comb(value, 2) for value in part) == args.b2
        and Counter(part)[args.neighbor_x] >= 1
    ]
    assert compatible
    partition_reports = [
        enumerate_partition(partition, args.neighbor_x)
        for partition in compatible
    ]
    c4_constant = (
        comb(args.n - 3, 4) + (args.n - 5) * args.b2 + (args.n - 3)
    )
    combined = {}
    for report in partition_reports:
        gamma = report["B3"]
        for edge_text, row in report["edge_rows"].items():
            edge = int(edge_text)
            c4 = c4_constant - gamma - edge
            c5 = exact_c5(
                args.n, args.b2, gamma, edge, row["V_min"], c4
            )
            candidate = {
                "c5_min": str(c5),
                "partition": report["partition"],
                "B3": gamma,
                "E": edge,
                "V_min": row["V_min"],
                "core_witness": row,
            }
            current = combined.get(c4)
            if current is None or c5 < sp.Rational(current["c5_min"]):
                combined[c4] = candidate

    first_c4 = min(combined)
    critical = {
        str(c4): combined.get(
            c4, {"status": "IMPOSSIBLE_FOR_ALL_COMPATIBLE_PARTITIONS"}
        )
        for c4 in range(first_c4, first_c4 + args.critical_width + 1)
    }
    report = {
        "status": "PASS_EXACT_GENERIC_R1_ROOT_PROFILE_ALL_COMPATIBLE_PARTITIONS",
        "scope": {
            "n": args.n,
            "B2": args.b2,
            "root_profile": f"r=1 and the root is a leaf adjacent to an x={args.neighbor_x} vertex",
        },
        "method": "all nonisomorphic positive-core shapes crossed with all distinct excess assignments; exact capacity/root-slot filters, V, and motif c5",
        "compatible_partition_count": len(compatible),
        "compatible_partitions": partition_reports,
        "first_attainable_c4": first_c4,
        "critical_c4_rows": critical,
        "all_c4_rows": {str(value): combined[value] for value in sorted(combined)},
    }
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary = {
        "status": report["status"],
        "scope": report["scope"],
        "compatible_partition_count": len(compatible),
        "partition_counts": [
            {
                "partition": item["partition"],
                "shapes": item["unlabeled_core_shapes"],
                "assignments": item["distinct_weight_assignments_per_shape"],
                "pairs": item["shape_assignment_pairs"],
                "root_feasible": item["root_feasible_pairs"],
                "edge_levels": len(item["edge_rows"]),
            }
            for item in partition_reports
        ],
        "critical": {
            key: (
                value
                if value.get("status")
                else {
                    "c5_min": value["c5_min"],
                    "partition": value["partition"],
                    "B3": value["B3"],
                    "E": value["E"],
                    "V_min": value["V_min"],
                }
            )
            for key, value in critical.items()
        },
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
