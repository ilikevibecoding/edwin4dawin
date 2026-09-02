#!/usr/bin/env python3
"""Exact all-compatible-core census for n=23, B2=42, r=1, x=4."""
from __future__ import annotations

import json
from collections import Counter
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_b2_42_root_profile_all_partitions_exact_20260817.json"
PARTITIONS = (
    (9, 4, 1, 1, 1, 1, 1, 1, 1, 1),
    (8, 4, 4, 2, 2, 1),
    (7, 6, 4, 1, 1, 1, 1),
    (6, 6, 4, 4, 1),
)


def multiset_permutations(values):
    counter = Counter(values)
    keys = sorted(counter, reverse=True)
    output = [None] * len(values)

    def visit(position):
        if position == len(output):
            yield tuple(output)
            return
        for value in keys:
            if counter[value] == 0:
                continue
            counter[value] -= 1
            output[position] = value
            yield from visit(position + 1)
            counter[value] += 1

    yield from visit(0)


def assignment_count(values):
    result = factorial(len(values))
    for multiplicity in Counter(values).values():
        result //= factorial(multiplicity)
    return result


def statistics(tree, weights):
    order = len(weights)
    core_degree = [tree.degree(vertex) for vertex in range(order)]
    leaf_slots = [weights[i] + 1 - core_degree[i] for i in range(order)]
    edge = 0
    brooms = 0
    neighbors = [[] for _ in range(order)]
    for left, right in tree.edges():
        x, y = weights[left], weights[right]
        edge += x * y
        brooms += comb(x, 2) * y + comb(y, 2) * x
        neighbors[left].append(y)
        neighbors[right].append(x)
    stars = sum(comb(value + 1, 4) for value in weights)
    paths = sum(
        values[i] * values[j]
        for values in neighbors
        for i in range(len(values))
        for j in range(i + 1, len(values))
    )
    return core_degree, leaf_slots, edge, stars + brooms + paths, {
        "stars": stars,
        "brooms": brooms,
        "paths": paths,
    }


def enumerate_partition(partition):
    order = len(partition)
    shapes = list(nx.nonisomorphic_trees(order))
    assignments = list(multiset_permutations(partition))
    assert len(assignments) == assignment_count(partition)
    tested = degree_feasible = root_feasible = 0
    by_edge = {}
    for shape_index, tree in enumerate(shapes):
        # NetworkX's generator uses consecutive integer labels.
        assert set(tree) == set(range(order))
        degrees = [tree.degree(vertex) for vertex in range(order)]
        for weights in assignments:
            tested += 1
            if any(degrees[i] > weights[i] + 1 for i in range(order)):
                continue
            degree_feasible += 1
            if not any(
                weights[i] == 4 and degrees[i] <= weights[i]
                for i in range(order)
            ):
                continue
            root_feasible += 1
            core_degree, leaf_slots, edge, connected_four, terms = statistics(tree, weights)
            assert core_degree == degrees
            assert all(value >= 0 for value in leaf_slots)
            assert any(weights[i] == 4 and leaf_slots[i] >= 1 for i in range(order))
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


def exact_c5(order, beta, gamma, edge, connected_four, c4):
    acoef = (
        sp.Rational(3, 2) * order**3
        - 20 * order**2
        + sp.Rational(133, 2) * order
        - 20
    )
    bcoef = 4 * order**2 - 35 * order + 49
    ccoef = 4 * order**2 - 30 * order + 34
    margin = (
        acoef * beta
        - bcoef * gamma
        - ccoef * (edge - (order - 3))
        + 5 * (order - 3) * (connected_four - (order - 4))
    )
    return sp.factor(
        ((order - 7) * (order - 8) * c4 + margin) / (5 * (order - 3))
    )


def main() -> int:
    order, beta = 23, 42
    c4_constant = comb(order - 3, 4) + (order - 5) * beta + (order - 3)
    assert c4_constant == 5621
    partition_reports = [enumerate_partition(partition) for partition in PARTITIONS]
    combined = {}
    for report in partition_reports:
        assert report["B2"] == beta
        gamma = report["B3"]
        for edge_text, row in report["edge_rows"].items():
            edge = int(edge_text)
            c4 = c4_constant - gamma - edge
            c5 = exact_c5(order, beta, gamma, edge, row["V_min"], c4)
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

    critical = {}
    for c4 in range(5425, 5441):
        critical[str(c4)] = combined.get(
            c4, {"status": "IMPOSSIBLE_FOR_ALL_COMPATIBLE_PARTITIONS"}
        )
    assert critical["5425"]["partition"] == list(PARTITIONS[0])
    assert critical["5425"]["E"] == 108

    report = {
        "status": "PASS_EXACT_B2_42_ROOT_PROFILE_ALL_COMPATIBLE_PARTITIONS",
        "scope": {
            "n": order,
            "B2": beta,
            "root_profile": "r=1 and the root is a leaf adjacent to an x=4 vertex",
        },
        "method": "all nonisomorphic positive-core trees crossed with every distinct excess-weight assignment, exact capacity/root-slot filters, exact V, and exact motif c5",
        "compatible_partitions": partition_reports,
        "critical_c4_rows": critical,
        "all_c4_rows": {str(value): combined[value] for value in sorted(combined)},
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary = {
        "status": report["status"],
        "partition_counts": [
            {
                "partition": item["partition"],
                "shapes": item["unlabeled_core_shapes"],
                "assignments": item["distinct_weight_assignments_per_shape"],
                "pairs": item["shape_assignment_pairs"],
                "degree_feasible": item["degree_feasible_pairs"],
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
