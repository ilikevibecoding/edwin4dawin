#!/usr/bin/env python3
"""Independent literal audit of the strengthened rooted-deletion floor."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_extension_floor_independent_audit_root_20260825.json"
EXPECTED = {
    "verify_rank8_root_deletion_extension_floor_root.py":
        "2BB6CE48D9A8B49BCDE3B65FF07AB8F11FACC6397CC2A4E6064B6B5F5AEB76B3",
    "rank8_root_deletion_extension_floor_exact_root_20260825.json":
        "BEE275224112110FEFBE2985EC3F58C039CF158371F58C3FC23AF89DD58D31D9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_add(left: list[int], right: list[int], cap: int) -> list[int]:
    return [
        (left[j] if j < len(left) else 0) + (right[j] if j < len(right) else 0)
        for j in range(min(cap, max(len(left), len(right)) - 1) + 1)
    ]


def polynomial_multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    answer = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a_value in enumerate(left):
        for j, b_value in enumerate(right):
            if i + j <= cap:
                answer[i + j] += a_value * b_value
    return answer


def forest_polynomial(graph: nx.Graph, cap: int = 7) -> list[int]:
    """Fresh include/exclude DP; deliberately imports no producer code."""
    answer = [1]
    seen: set[int] = set()

    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in graph.neighbors(vertex):
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = polynomial_multiply(
                excluded,
                polynomial_add(child_excluded, child_included, cap),
                cap,
            )
            included = polynomial_multiply(included, child_excluded, cap)
        return excluded, included

    for root in graph:
        if root in seen:
            continue
        excluded, included = visit(root, None)
        answer = polynomial_multiply(
            answer, polynomial_add(excluded, included, cap), cap
        )
    return answer


def independent_subsets(graph: nx.Graph, vertices: tuple[int, ...]) -> list[tuple[int, ...]]:
    edge_indices = tuple((vertices.index(u), vertices.index(v)) for u, v in graph.edges())
    answer = []
    for mask in range(1 << len(vertices)):
        if any((mask >> u) & 1 and (mask >> v) & 1 for u, v in edge_indices):
            continue
        answer.append(tuple(vertices[j] for j in range(len(vertices)) if (mask >> j) & 1))
    return answer


def extension_floor(order: int) -> Fraction:
    return Fraction(order * order - 26 * order + 100, order * order - 19 * order + 72)


def binomial_floor(order: int) -> Fraction:
    path = math.comb(order - 7, 7)
    containing = math.comb(order - 5, 6)
    return Fraction(path, path + containing)


def deterministic_trees(order: int) -> list[nx.Graph]:
    return [
        nx.path_graph(order),
        nx.star_graph(order - 1),
        nx.from_prufer_sequence([((5 * j * j + 7 * j + 3) % order) for j in range(order - 2)]),
        nx.from_prufer_sequence([((11 * j + 1) % order) for j in range(order - 2)]),
    ]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    producer = json.loads(
        (HERE / "rank8_root_deletion_extension_floor_exact_root_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_EXTENSION_FLOOR"

    literal_trees = literal_roots = rank_cells = subset_cells = 0
    minimum_final_slack = None
    minimum_final_witness = None
    for order in range(2, 12):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            whole = forest_polynomial(tree, 8)
            literal_trees += 1
            for root in tree:
                deleted_graph = tree.copy()
                deleted_graph.remove_node(root)
                deleted = forest_polynomial(deleted_graph, 8)
                boundary = set(tree.neighbors(root))
                far_vertices = tuple(v for v in tree if v != root and v not in boundary)
                far_graph = tree.subgraph(far_vertices).copy()
                far_sets = independent_subsets(far_graph, far_vertices)
                far_by_rank: dict[int, list[tuple[int, ...]]] = {}
                for selected in far_sets:
                    far_by_rank.setdefault(len(selected), []).append(selected)
                degree = tree.degree(root)
                far_order = len(far_vertices)
                literal_roots += 1
                for rank in range(2, min(8, order) + 1):
                    selected_rank = rank - 1
                    selected_sets = far_by_rank.get(selected_rank, [])
                    a_value = len(selected_sets)
                    h_value = deleted[rank] if rank < len(deleted) else 0
                    c_value = whole[rank] if rank < len(whole) else 0
                    assert c_value == h_value + a_value, (
                        order,
                        tree_index,
                        root,
                        rank,
                        c_value,
                        h_value,
                        a_value,
                        far_vertices,
                    )
                    if not a_value:
                        continue
                    rank_cells += 1

                    selected_degree_sum = 0
                    extension_sum = 0
                    for selected_tuple in selected_sets:
                        selected = set(selected_tuple)
                        # A far vertex cannot touch two different root neighbors.
                        assert all(len(set(tree.neighbors(v)) & boundary) <= 1 for v in selected)
                        selected_degree_sum += sum(far_graph.degree(v) for v in selected)
                        extensions = 0
                        for candidate in deleted_graph:
                            if candidate in selected:
                                continue
                            if all(not tree.has_edge(candidate, v) for v in selected):
                                extensions += 1
                        extension_sum += extensions
                        subset_cells += 1

                    # Recheck every link of the proof separately with integers.
                    assert (
                        far_order * selected_degree_sum
                        <= (2 * selected_rank * far_order - 2 * selected_rank) * a_value
                    )
                    r_num = (
                        (order - 1 - 3 * selected_rank - min(selected_rank, degree))
                        * far_order
                        + 2 * selected_rank
                    )
                    assert far_order * extension_sum >= a_value * r_num
                    assert extension_sum <= rank * h_value
                    final_slack = rank * h_value * far_order - a_value * r_num
                    assert final_slack >= 0
                    row = (
                        final_slack,
                        order,
                        tree_index,
                        root,
                        degree,
                        rank,
                        h_value,
                        a_value,
                        extension_sum,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
                    if minimum_final_slack is None or row < minimum_final_witness:
                        minimum_final_slack = final_slack
                        minimum_final_witness = row

    algebra_cells = 0
    for order in range(28, 1001):
        e3 = extension_floor(order)
        b4 = binomial_floor(order)
        cubic = order**3 - 53 * order**2 + 520 * order - 1288
        assert (e3 <= b4) == (order <= 41)
        assert (cubic <= 0) == (order <= 41)
        universal = min(e3, b4)
        for degree in range(1, min(order - 6, 20)):
            far_order = order - degree - 1
            r_num = (order - 19 - min(6, degree)) * far_order + 12
            e_degree = Fraction(r_num, r_num + 7 * far_order)
            path = math.comb(order - 7, 7)
            containing = math.comb(far_order, 6)
            b_degree = Fraction(path, path + containing)
            assert universal <= max(e_degree, b_degree)
            algebra_cells += 1

    large_checks = 0
    minimum_large_slack = None
    minimum_large_witness = None
    for order in (28, 31, 40, 41, 42, 80, 200):
        floor = min(extension_floor(order), binomial_floor(order))
        for family_index, tree in enumerate(deterministic_trees(order)):
            whole = forest_polynomial(tree)
            c7 = whole[7]
            for root in tree:
                deleted_graph = tree.copy()
                deleted_graph.remove_node(root)
                h7 = forest_polynomial(deleted_graph)[7]
                slack = h7 * floor.denominator - c7 * floor.numerator
                assert slack >= 0
                large_checks += 1
                row = (slack, order, family_index, root, tree.degree(root), h7, c7)
                if minimum_large_slack is None or row < minimum_large_witness:
                    minimum_large_slack = slack
                    minimum_large_witness = row

    payload = {
        "schema": "rank8-root-deletion-extension-floor-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_ROOT_DELETION_EXTENSION_FLOOR_AUDIT",
        "method": (
            "No producer imports. Fresh bit-mask independent-set enumeration "
            "checks selected degrees and every literal extension; a separate "
            "fresh include/exclude tree DP checks the live rank-seven floor."
        ),
        "literal_census": {
            "orders": "2..11",
            "trees": literal_trees,
            "roots": literal_roots,
            "active_rank_cells": rank_cells,
            "independent_subsets": subset_cells,
            "minimum_final_slack": minimum_final_slack,
            "minimum_final_witness": list(minimum_final_witness) if minimum_final_witness else None,
        },
        "algebra_cells": algebra_cells,
        "fresh_dp_large_rank7": {
            "checks": large_checks,
            "minimum_slack": minimum_large_slack,
            "minimum_witness": list(minimum_large_witness) if minimum_large_witness else None,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
