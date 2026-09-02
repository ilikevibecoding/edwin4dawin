#!/usr/bin/env python3
"""Verify the matching-critical reduction of the pointed WR boundary."""

from __future__ import annotations

import json
from math import ceil
from pathlib import Path

import networkx as nx

from probe_weak_prefix_ratio_forests_root import forest_polynomial


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def alpha(graph: nx.Graph) -> int:
    return len(forest_polynomial(graph)) - 1


def matching_number(graph: nx.Graph) -> int:
    return len(nx.max_weight_matching(graph, maxcardinality=True))


def main() -> None:
    cutoff_checks = 0
    for beta in range(2, 10001):
        if beta % 3 not in (0, 2):
            continue
        a = beta - 1
        rank = cutoff(beta)
        if a % 3 == 2:
            assert rank == cutoff(a) + 1
            assert rank - 2 == cutoff(a) - 1
        else:
            assert a % 3 == 1
            assert rank == cutoff(a)
            assert rank - 2 == cutoff(a) - 2
        cutoff_checks += 1

    nine_cutoff_checks = 0
    for a in range(1, 10001):
        rank = (2 * a + 2) // 3
        if a % 3 in (1, 2):
            assert rank == cutoff(a) + (1 if a % 3 == 2 else 0)
        beta = a - 1
        if beta >= 0:
            jump = (2 * a + 2) // 3 - (2 * beta + 2) // 3
            assert jump == (1 if beta % 3 in (0, 1) else 0)
        nine_cutoff_checks += 1

    forests = 0
    pointed_instances = 0
    matched_edges = 0
    leaf_recurrence_checks = 0
    two_step_failures = []
    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        row_a = forest_polynomial(graph)
        beta = len(row_a) - 1
        nu_a = matching_number(graph)
        assert beta + nu_a == graph.number_of_nodes()
        for point in tuple(graph):
            graph_minus = graph.copy()
            graph_minus.remove_node(point)
            if alpha(graph_minus) != beta:
                continue
            pointed_instances += 1
            nu_minus = matching_number(graph_minus)
            assert nu_minus == nu_a - 1
            matching = nx.max_weight_matching(graph, maxcardinality=True)
            incident = [edge for edge in matching if point in edge]
            assert len(incident) == 1
            mate = next(v for v in incident[0] if v != point)
            core = graph.copy()
            core.remove_nodes_from((point, mate))
            assert matching_number(core) == nu_a - 1
            assert alpha(core) == beta - 1
            matched_edges += 1

            closed = {point, *graph[point]}
            residual = graph.subgraph([v for v in graph if v not in closed]).copy()
            row_h = forest_polynomial(residual)
            row_d = forest_polynomial(core)
            for rank in range(max(len(row_h), len(row_d), len(row_a))):
                assert coefficient(row_h, rank) <= coefficient(row_d, rank)
                assert coefficient(row_d, rank) <= coefficient(row_a, rank)

            if beta % 3 in (0, 2):
                rank = cutoff(beta)
                premise_margin = (
                    rank * coefficient(row_d, rank)
                    - coefficient(row_d, rank - 2)
                )
                target_margin = (
                    rank * coefficient(row_a, rank)
                    - coefficient(row_h, rank - 2)
                )
                assert target_margin >= premise_margin
                if premise_margin < 0:
                    two_step_failures.append({
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "point": point,
                        "mate": mate,
                        "beta": beta,
                        "rank": rank,
                        "premise_margin": premise_margin,
                        "target_margin": target_margin,
                    })

        for leaf in tuple(graph):
            if graph.degree(leaf) != 1:
                continue
            parent = next(iter(graph[leaf]))
            left = graph.copy()
            left.remove_node(leaf)
            right = left.copy()
            right.remove_node(parent)
            row_t = forest_polynomial(graph)
            row_left = forest_polynomial(left)
            row_right = forest_polynomial(right)
            for rank in range(max(len(row_t), len(row_left), len(row_right)) + 2):
                et = 9 * coefficient(row_t, rank) - coefficient(row_t, rank - 2)
                ea = 9 * coefficient(row_left, rank) - coefficient(row_left, rank - 2)
                ec = (9 * coefficient(row_right, rank - 1)
                      - coefficient(row_right, rank - 3))
                assert et == ea + ec
                leaf_recurrence_checks += 1

    payload = {
        "status": "PASS_EXACT_POINTED_BOUNDARY_MATCHING_CRITICAL_REDUCTION",
        "cutoff_checks": cutoff_checks,
        "constant_nine_cutoff_checks": nine_cutoff_checks,
        "atlas_forests": forests,
        "pointed_instances": pointed_instances,
        "matched_edge_reductions": matched_edges,
        "constant_nine_leaf_recurrence_checks": leaf_recurrence_checks,
        "finite_two_step_premise_failures": len(two_step_failures),
        "scope": "exact conditional reduction; the two all-order row inequalities remain open",
    }
    assert not two_step_failures, two_step_failures[0]
    output = Path("pointed_boundary_matching_critical_reduction_exact_root_20260829.json")
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
