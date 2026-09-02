#!/usr/bin/env python3
"""Exact replay for V on the unique-maximum E=M(n-2-M) face."""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import networkx as nx

from verify_tree_rank45_path_ratio import connected_four_count, degree_statistics


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_terminal_broom_edge_equality_connected_four_exact_20260817.json"


def equality_face_connected_four(partition):
    maximum = partition[0]
    assert partition.count(maximum) == 1
    children = partition[1:]
    remaining = sum(children)
    stars = comb(maximum + 1, 4) + sum(comb(value + 1, 4) for value in children)
    brooms = comb(maximum, 2) * remaining + maximum * sum(
        comb(value, 2) for value in children
    )
    paths = sum(
        children[i] * children[j]
        for i in range(len(children))
        for j in range(i + 1, len(children))
    )
    return stars + brooms + paths, {
        "stars": stars,
        "brooms": brooms,
        "paths": paths,
    }


def build_equality_tree(partition):
    """Build the forced positive-core star, attaching the required leaves."""
    maximum = partition[0]
    assert partition.count(maximum) == 1
    children = partition[1:]
    graph = nx.Graph()
    center = 0
    graph.add_node(center)
    next_vertex = 1
    child_vertices = []
    for value in children:
        child = next_vertex
        next_vertex += 1
        child_vertices.append((child, value))
        graph.add_edge(center, child)
    center_leaves = maximum + 1 - len(children)
    assert center_leaves >= 0
    for _ in range(center_leaves):
        graph.add_edge(center, next_vertex)
        next_vertex += 1
    for child, value in child_vertices:
        for _ in range(value):
            graph.add_edge(child, next_vertex)
            next_vertex += 1
    return graph


def main() -> int:
    # Equality proof: root at the unique M-vertex.  The upper bound
    # E<=M sum_{v!=root}x_v is a sum of nonnegative termwise slacks
    # (M-x_parent)x_v.  Equality makes every positive nonroot vertex's
    # parent the unique M-vertex, forcing the positive core to be a star.
    witness = (8, 4, 3, 2, 1, 1, 1, 1)
    maximum = witness[0]
    total_excess = sum(witness)
    order = total_excess + 2
    assert order == 23
    assert witness.count(maximum) == 1

    formula_value, shape_terms = equality_face_connected_four(witness)
    assert shape_terms == {"stars": 132, "brooms": 444, "paths": 68}
    assert formula_value == 644

    tree = build_equality_tree(witness)
    assert nx.is_tree(tree)
    assert tree.number_of_nodes() == order
    excess_partition = tuple(
        sorted(
            (degree - 1 for _, degree in tree.degree() if degree > 1),
            reverse=True,
        )
    )
    assert excess_partition == witness
    beta, gamma, edge, connected_four = degree_statistics(tree)
    assert (beta, gamma, edge, connected_four) == (38, 61, 104, 644)
    assert edge == maximum * (order - 2 - maximum)
    assert connected_four_count(tree) == formula_value

    first_general_lower = order - 4 + beta + gamma
    second_general_lower = first_general_lower + edge - (order - 3)
    assert first_general_lower == 118
    assert second_general_lower == 202
    exact_lift = connected_four - second_general_lower
    assert exact_lift == 442

    report = {
        "status": "PASS_EXACT_UNIQUE_MAX_EDGE_EQUALITY_CONNECTED_FOUR_REDUCTION_ONLY",
        "warning": "This supplies the missing c5 lift on one structural face; B2>=6 endpoint positivity is not yet proved.",
        "hypotheses": {
            "excess_partition": "positive x_v=deg(v)-1 values",
            "maximum": "M is unique in the positive excess partition",
            "edge_equality": "E=M(n-2-M)",
        },
        "structural_conclusion": "Every other positive-excess vertex is adjacent to the unique M-vertex; the positive core is a star.",
        "connected_four_formula": "C(M+1,4)+sum_i C(y_i+1,4)+C(M,2)sum_i y_i+M sum_i C(y_i,2)+sum_{i<j}y_i y_j",
        "witness": {
            "n": order,
            "partition": list(witness),
            "M": maximum,
            "B2": beta,
            "B3": gamma,
            "E": edge,
            "V": connected_four,
            "shape_terms": shape_terms,
            "previous_stronger_V_lower": second_general_lower,
            "exact_V_lift": exact_lift,
        },
        "c5_effect": "In the exact rank-(4,5) motif identity, replacing the previous V lower by this exact V raises the c5 lower by exact_V_lift.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
