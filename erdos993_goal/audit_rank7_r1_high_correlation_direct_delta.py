#!/usr/bin/env python3
"""Independent explicit-tree audit of the stored direct-Delta census."""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_r1_high_correlation_direct_delta_b26plus_exact_20260817.json"
BULK = HERE / "rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json"
MAX_RANK = 7


def add(left, right):
    return tuple(
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(max(len(left), len(right)))
    )


def multiply(left, right):
    result = [0] * min(MAX_RANK + 1, len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j > MAX_RANK:
                break
            result[i + j] += x * y
    return tuple(result)


def rooted_node_dp(graph, allowed, vertex, parent):
    excluded, included = (1,), (0, 1)
    for child in graph[vertex]:
        if child == parent or child not in allowed:
            continue
        child_excluded, child_included = rooted_node_dp(
            graph, allowed, child, vertex
        )
        excluded = multiply(excluded, add(child_excluded, child_included))
        included = multiply(included, child_excluded)
    return excluded, included


def induced_forest_polynomial(graph, allowed):
    allowed = set(allowed)
    result = (1,)
    seen = set()
    for vertex in sorted(allowed):
        if vertex in seen:
            continue
        component = nx.node_connected_component(graph.subgraph(allowed), vertex)
        seen.update(component)
        excluded, included = rooted_node_dp(graph, component, vertex, -1)
        result = multiply(result, add(excluded, included))
    return result + (0,) * (MAX_RANK + 1 - len(result))


def explicit_tree(witness):
    weights = witness["weights_by_vertex"]
    graph = nx.Graph()
    graph.add_nodes_from(range(len(weights)))
    graph.add_edges_from(witness["core_edges"])
    next_vertex = len(weights)
    pendant = {}
    for core_vertex, count in enumerate(witness["leaf_slots"]):
        pendant[core_vertex] = []
        for _ in range(count):
            graph.add_edge(core_vertex, next_vertex)
            pendant[core_vertex].append(next_vertex)
            next_vertex += 1
    assert next_vertex == 23
    assert nx.is_tree(graph)
    return graph, pendant


def functions():
    n, c2, c3, c4, c5, c6, c7, a, b = sp.symbols(
        "n c2 c3 c4 c5 c6 c7 a b", integer=True
    )
    substitutions = {
        c[0]: 1,
        c[1]: n,
        c[2]: c2,
        c[3]: c3,
        c[4]: c4,
        c[5]: c5,
        c[6]: c6,
        c[7]: c7,
        h[5]: c5 - a,
        h[6]: c6 - b,
    }
    arguments = (n, c2, c3, c4, c5, c6, c7, a, b)
    return [
        sp.lambdify(
            arguments,
            sp.expand(expression.subs(substitutions, simultaneous=True)),
            "math",
        )
        for expression in newton_coefficients(exact_decomposition())[:7]
    ]


def audit_witness(witness, delta_fns):
    graph, pendant = explicit_tree(witness)
    root_neighbor = witness["root_neighbor_vertex"]
    assert pendant[root_neighbor]
    root = pendant[root_neighbor][0]
    all_vertices = set(graph)
    coefficients = induced_forest_polynomial(graph, all_vertices)
    h_coefficients = induced_forest_polynomial(graph, all_vertices - {root})
    j_coefficients = induced_forest_polynomial(
        graph, all_vertices - {root, root_neighbor}
    )
    assert list(coefficients) == witness["c0_through_c7"]
    assert list(j_coefficients) == witness["J0_through_J7"]
    for rank in range(1, MAX_RANK + 1):
        assert coefficients[rank] == h_coefficients[rank] + j_coefficients[rank - 1]
    arguments = (
        23,
        coefficients[2],
        coefficients[3],
        coefficients[4],
        coefficients[5],
        coefficients[6],
        coefficients[7],
        j_coefficients[4],
        j_coefficients[5],
    )
    deltas = tuple(function(*arguments) for function in delta_fns)
    assert list(deltas) == witness["Delta0_through_Delta6"]
    return coefficients, h_coefficients, j_coefficients, deltas


def main() -> int:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_DIRECT_DELTA_NONNEGATIVE"
    assert report["scope"] == {
        "n": 23,
        "root_degree": 1,
        "B2_min": 26,
        "ranks": list(range(7)),
    }
    assert report["counts"] == {
        "excess_partitions": 579,
        "shape_assignment_pairs": 9762741,
        "degree_feasible_weighted_cores": 1622246,
        "root_neighbor_vertex_cases": 10067186,
        "pendant_root_vertices_collapsed_by_same_neighbor": 13223190,
    }
    assert report["failure"] is None
    delta_fns = functions()

    audited = 0
    all_stored = list(enumerate(report["rank_minima"]))
    for beta_report in report["B2_reports"].values():
        all_stored.extend(enumerate(beta_report["rank_minima"]))
    for rank, item in all_stored:
        _, _, _, deltas = audit_witness(item["witness"], delta_fns)
        assert item["value"] == deltas[rank]
        assert item["value"] > 0
        audited += 1

    # Independently reconstruct the concrete tree behind the original false
    # scalar-cone point B2=35,x=4,c4=5331.
    bulk = json.loads(BULK.read_text(encoding="utf-8"))
    row = bulk["profiles"]["B2=35,x=4"]["c4_rows"]["5331"]
    root_neighbor = next(
        vertex
        for vertex, (weight, slots) in enumerate(
            zip(row["weights_by_vertex"], row["leaf_slots"])
        )
        if weight == 4 and slots >= 1
    )
    fake_repair_witness = {
        **row,
        "root_neighbor_vertex": root_neighbor,
    }
    graph, pendant = explicit_tree(fake_repair_witness)
    root = pendant[root_neighbor][0]
    vertices = set(graph)
    coefficients = induced_forest_polynomial(graph, vertices)
    h_coefficients = induced_forest_polynomial(graph, vertices - {root})
    j_coefficients = induced_forest_polynomial(
        graph, vertices - {root, root_neighbor}
    )
    arguments = (
        23,
        coefficients[2],
        coefficients[3],
        coefficients[4],
        coefficients[5],
        coefficients[6],
        coefficients[7],
        j_coefficients[4],
        j_coefficients[5],
    )
    repaired_deltas = [function(*arguments) for function in delta_fns]
    assert list(coefficients) == [1, 23, 231, 1365, 5331, 14568, 28686, 41254]
    assert list(h_coefficients) == [1, 22, 210, 1172, 4286, 10828, 19342, 24544]
    assert repaired_deltas == [
        8592793862701529152,
        18977582628534140016,
        19824322306136653872,
        16977997815964937976,
        12357934108794924608,
        7428244441997670480,
        3593736288043850872,
    ]

    print(
        json.dumps(
            {
                "status": "PASS_EXACT_INDEPENDENT_EXPLICIT_TREE_AUDIT",
                "stored_minimum_witnesses_audited": audited,
                "rank_minima": [item["value"] for item in report["rank_minima"]],
                "scalar_fake_point_actual_tree": {
                    "A_coefficients": list(coefficients),
                    "H_coefficients": list(h_coefficients),
                    "J_coefficients": list(j_coefficients),
                    "Delta0_through_Delta6": repaired_deltas,
                },
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
