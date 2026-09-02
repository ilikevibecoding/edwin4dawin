#!/usr/bin/env python3
"""Classify B2=5 skeletons and count subdivision orbits exactly.

This is setup only.  It does not evaluate C7 and intentionally does not launch
the large subdivision census.
"""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_rooted_cross_b2_5_skeleton_classification_20260816.json"
RESIDUAL = HERE / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def graph(edges: list[tuple[int, int]]) -> nx.Graph:
    output = nx.Graph()
    output.add_edges_from(edges)
    assert nx.is_tree(output)
    assert all(output.degree(vertex) != 2 for vertex in output)
    return output


def skeletons() -> dict[str, nx.Graph]:
    # One degree-four branch in the middle of two degree-three branches.
    mixed_middle = graph(
        [(0, 1), (0, 2), (0, 3), (0, 4), (1, 5), (1, 6), (2, 7), (2, 8)]
    )
    # One degree-four branch at an endpoint of the three-branch path.
    mixed_end = graph(
        [(0, 1), (1, 2), (0, 3), (0, 4), (0, 5), (1, 6), (2, 7), (2, 8)]
    )
    # Five degree-three branches whose branch tree is P5.
    cubic_path = graph(
        [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (0, 6), (1, 7), (2, 8), (3, 9), (4, 10), (4, 11),
        ]
    )
    # Five degree-three branches whose branch tree has degrees 3,2,1,1,1.
    cubic_t = graph(
        [
            (0, 1), (0, 2), (0, 3), (3, 4),
            (1, 5), (1, 6), (2, 7), (2, 8), (3, 9), (4, 10), (4, 11),
        ]
    )
    return {
        "degree4_middle_plus_two_degree3": mixed_middle,
        "degree4_end_plus_two_degree3": mixed_end,
        "five_degree3_branch_path": cubic_path,
        "five_degree3_branch_T": cubic_t,
    }


def b2(tree: nx.Graph) -> int:
    return sum(comb(tree.degree(vertex) - 1, 2) for vertex in tree)


def edge_cycle_types(tree: nx.Graph) -> Counter[tuple[int, ...]]:
    edges = [tuple(sorted(edge)) for edge in tree.edges()]
    edge_index = {edge: index for index, edge in enumerate(edges)}
    cycle_types: Counter[tuple[int, ...]] = Counter()
    matcher = nx.algorithms.isomorphism.GraphMatcher(tree, tree)
    for mapping in matcher.isomorphisms_iter():
        permutation = []
        for left, right in edges:
            image = tuple(sorted((mapping[left], mapping[right])))
            permutation.append(edge_index[image])
        seen = [False] * len(edges)
        cycles = []
        for start in range(len(edges)):
            if seen[start]:
                continue
            length = 0
            current = start
            while not seen[current]:
                seen[current] = True
                length += 1
                current = permutation[current]
            cycles.append(length)
        cycle_types[tuple(sorted(cycles))] += 1
    return cycle_types


def fixed_positive_compositions(total: int, cycles: tuple[int, ...]) -> int:
    # One positive length is assigned to each edge cycle.  A cycle of size c
    # contributes c*length to the total subdivided edge count.
    dp = [0] * (total + 1)
    dp[0] = 1
    for cycle in cycles:
        updated = [0] * (total + 1)
        for subtotal, count in enumerate(dp):
            if not count:
                continue
            for length in range(1, (total - subtotal) // cycle + 1):
                updated[subtotal + cycle * length] += count
        dp = updated
    return dp[total]


def orbit_count(total: int, cycle_types: Counter[tuple[int, ...]]) -> int:
    group_order = sum(cycle_types.values())
    fixed_sum = sum(
        multiplicity * fixed_positive_compositions(total, cycles)
        for cycles, multiplicity in cycle_types.items()
    )
    assert fixed_sum % group_order == 0
    return fixed_sum // group_order


def main() -> int:
    shapes = skeletons()
    expected_automorphisms = {
        "degree4_middle_plus_two_degree3": 16,
        "degree4_end_plus_two_degree3": 12,
        "five_degree3_branch_path": 8,
        "five_degree3_branch_T": 16,
    }
    shape_rows = []
    cycles_by_name = {}
    for name, tree in shapes.items():
        assert b2(tree) == 5
        cycles = edge_cycle_types(tree)
        assert sum(cycles.values()) == expected_automorphisms[name]
        cycles_by_name[name] = cycles
        branch_degrees = sorted(
            (tree.degree(vertex) for vertex in tree if tree.degree(vertex) >= 3),
            reverse=True,
        )
        shape_rows.append(
            {
                "name": name,
                "vertices": tree.number_of_nodes(),
                "edges": tree.number_of_edges(),
                "branch_degrees": branch_degrees,
                "automorphism_group_order": sum(cycles.values()),
                "edge_cycle_index": [
                    {"cycles": list(cycle_type), "multiplicity": multiplicity}
                    for cycle_type, multiplicity in sorted(cycles.items())
                ],
            }
        )

    order_rows = []
    total_trees = 0
    total_root_upper = 0
    for order in range(23, 39):
        counts = {
            name: orbit_count(order - 1, cycles)
            for name, cycles in cycles_by_name.items()
        }
        trees = sum(counts.values())
        rooted_upper = order * trees
        total_trees += trees
        total_root_upper += rooted_upper
        order_rows.append(
            {
                "order": order,
                "nonisomorphic_subdivisions": trees,
                "all_vertex_root_checks_upper": rooted_upper,
                "by_skeleton": counts,
            }
        )

    residual = json.loads(RESIDUAL.read_text(encoding="utf-8"))
    assert residual["status"] == "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4"
    affected = [
        cell
        for cell in residual["residual"]["cells"]
        if cell["B2_min"] <= 5 <= cell["B2_max"]
    ]
    assert len(affected) == 57

    prior_b2_4_trees = 24_074_951
    prior_b2_4_roots = 845_798_479
    report = {
        "status": "PASS_EXACT_B2_5_SKELETON_CLASSIFICATION_ONLY",
        "contribution_partitions": ["3+1+1", "1+1+1+1+1"],
        "skeleton_count": len(shape_rows),
        "skeletons": shape_rows,
        "orders": order_rows,
        "workload": {
            "nonisomorphic_subdivisions_n23_through_n38": total_trees,
            "all_vertex_root_checks_upper": total_root_upper,
            "tree_count_multiple_of_completed_B2_4_census": str(
                Fraction(total_trees, prior_b2_4_trees)
            ),
            "root_check_multiple_of_completed_B2_4_census": str(
                Fraction(total_root_upper, prior_b2_4_roots)
            ),
        },
        "coverage_if_closed": {
            "affected_current_residual_cells": len(affected),
            "integer_parameter_levels_removed": len(affected),
            "residual_cell_count_after": residual["residual"]["cell_count"],
            "residual_integer_levels_after": (
                residual["residual"]["integer_parameter_levels"] - len(affected)
            ),
        },
        "residual_prerequisite": {
            "file": RESIDUAL.name,
            "sha256": sha256(RESIDUAL),
        },
        "scope_warning": "Classification and Burnside workload only; no B2=5 C7 values were evaluated.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"skeletons={len(shape_rows)} subdivisions={total_trees} root_upper={total_root_upper}")
    print(f"affected residual cells={len(affected)}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
