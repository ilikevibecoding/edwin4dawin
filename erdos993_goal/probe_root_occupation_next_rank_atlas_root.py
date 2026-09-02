#!/usr/bin/env python3
"""Exact graph-atlas probe of the rank-weighted root-avoidance drift.

For every atlas forest F and every S meeting each component at most once,
this checks

    (j+2) c_j b_(j+1) >= (j+1) c_(j+1) b_j,

where b=I(F), c=I(F-S), in the pendant-cascade prefix.  It also scans
all independent S in every atlas graph as a negative-control search.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import networkx as nx


OUTPUT = Path("root_occupation_next_rank_atlas_exact_20260829.json")


def independence_polynomial(graph: nx.Graph) -> list[int]:
    vertices = list(graph)
    answer: list[int] = []
    for rank in range(len(vertices) + 1):
        count = 0
        for chosen in combinations(vertices, rank):
            if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2)):
                count += 1
        answer.append(count)
    while len(answer) > 1 and answer[-1] == 0:
        answer.pop()
    return answer


def component_separated_sets(graph: nx.Graph) -> list[tuple[int, ...]]:
    choices: list[tuple[int, ...]] = [()]
    for component in nx.connected_components(graph):
        choices = [
            (*prefix, *suffix)
            for prefix in choices
            for suffix in [(), *((vertex,) for vertex in component)]
        ]
    return choices


def independent_sets(graph: nx.Graph) -> list[tuple[int, ...]]:
    vertices = list(graph)
    return [
        chosen
        for rank in range(len(vertices) + 1)
        for chosen in combinations(vertices, rank)
        if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2))
    ]


def scan(graphs: list[nx.Graph], forest_mode: bool) -> dict[str, object]:
    graphs_checked = root_sets = rank_checks = failures = 0
    term_checks = term_failures = 0
    first_term_failure = None
    group_checks = group_failures = 0
    first_group_failure = None
    first_failure = None
    minimum = None
    minimum_witness = None
    for atlas_index, graph in enumerate(graphs):
        if graph.number_of_nodes() == 0:
            continue
        if forest_mode and not nx.is_forest(graph):
            continue
        graphs_checked += 1
        b = independence_polynomial(graph)
        alpha = len(b) - 1
        cutoff = (2 * alpha + 3) // 3
        sets = (
            component_separated_sets(graph)
            if forest_mode
            else independent_sets(graph)
        )
        for roots in sets:
            root_sets += 1
            deleted = graph.copy()
            deleted.remove_nodes_from(roots)
            c = independence_polynomial(deleted)
            subset_rows: list[tuple[int, list[int], tuple[int, ...]]] = []
            if forest_mode:
                for size in range(len(roots) + 1):
                    for selected_roots in combinations(roots, size):
                        residual = deleted.copy()
                        removed_neighbors = {
                            neighbor
                            for root in selected_roots
                            for neighbor in graph.neighbors(root)
                        }
                        residual.remove_nodes_from(removed_neighbors)
                        subset_rows.append(
                            (size, independence_polynomial(residual), selected_roots)
                        )
                reconstructed = [0] * len(b)
                for size, row_values, _ in subset_rows:
                    for rank, value in enumerate(row_values):
                        if rank + size < len(reconstructed):
                            reconstructed[rank + size] += value
                assert reconstructed == b
            for j in range(1, alpha):
                if j + 1 >= cutoff:
                    continue
                cj = c[j] if j < len(c) else 0
                cnext = c[j + 1] if j + 1 < len(c) else 0
                left = (j + 2) * cj * b[j + 1]
                right = (j + 1) * cnext * b[j]
                margin = left - right
                rank_checks += 1
                row = (margin, atlas_index, roots, j, b[j], b[j + 1], cj, cnext)
                if minimum is None or row < minimum_witness:
                    minimum = margin
                    minimum_witness = row
                if margin < 0:
                    failures += 1
                    if first_failure is None:
                        first_failure = {
                            "atlas_index": atlas_index,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "roots": roots,
                            "j": j,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "b_window": [b[j], b[j + 1]],
                            "c_window": [cj, cnext],
                            "margin": margin,
                        }
                if forest_mode:
                    for size, row_values, selected_roots in subset_rows:
                        previous_rank = j - size
                        next_rank = previous_rank + 1
                        r_previous = (
                            row_values[previous_rank]
                            if 0 <= previous_rank < len(row_values)
                            else 0
                        )
                        r_next = (
                            row_values[next_rank]
                            if 0 <= next_rank < len(row_values)
                            else 0
                        )
                        term_margin = (
                            (j + 2) * cj * r_next
                            - (j + 1) * cnext * r_previous
                        )
                        term_checks += 1
                        if term_margin < 0:
                            term_failures += 1
                            if first_term_failure is None:
                                first_term_failure = {
                                    "atlas_index": atlas_index,
                                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                    "roots": roots,
                                    "selected_roots": selected_roots,
                                    "j": j,
                                    "c_window": [cj, cnext],
                                    "r_window": [r_previous, r_next],
                                    "term_margin": term_margin,
                                }
                    for size in range(len(roots) + 1):
                        group_previous = 0
                        group_next = 0
                        for row_size, row_values, _ in subset_rows:
                            if row_size != size:
                                continue
                            previous_rank = j - size
                            next_rank = previous_rank + 1
                            if 0 <= previous_rank < len(row_values):
                                group_previous += row_values[previous_rank]
                            if 0 <= next_rank < len(row_values):
                                group_next += row_values[next_rank]
                        group_margin = (
                            (j + 2) * cj * group_next
                            - (j + 1) * cnext * group_previous
                        )
                        group_checks += 1
                        if group_margin < 0:
                            group_failures += 1
                            if first_group_failure is None:
                                first_group_failure = {
                                    "atlas_index": atlas_index,
                                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                    "roots": roots,
                                    "selected_root_count": size,
                                    "j": j,
                                    "c_window": [cj, cnext],
                                    "group_window": [group_previous, group_next],
                                    "group_margin": group_margin,
                                }
    return {
        "status": "PASS_EXACT_FINITE_ATLAS" if failures == 0 else "COUNTEREXAMPLE_IN_ATLAS",
        "graphs": graphs_checked,
        "root_sets": root_sets,
        "prefix_rank_checks": rank_checks,
        "failures": failures,
        "minimum_margin": minimum,
        "minimum_witness": list(minimum_witness) if minimum_witness else None,
        "first_failure": first_failure,
        "subset_expansion_term_checks": term_checks,
        "subset_expansion_term_failures": term_failures,
        "first_subset_expansion_term_failure": first_term_failure,
        "selected_root_count_group_checks": group_checks,
        "selected_root_count_group_failures": group_failures,
        "first_selected_root_count_group_failure": first_group_failure,
    }


def main() -> None:
    atlas = list(nx.graph_atlas_g())
    report = {
        "schema": "root-occupation-next-rank-atlas-root-v1",
        "candidate": "(j+2)c_j b_(j+1) >= (j+1)c_(j+1)b_j",
        "forest_component_separated": scan(atlas, True),
        "all_graph_independent_root_negative_control": scan(atlas, False),
        "scope": "finite atlas evidence only; not an all-order proof",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
