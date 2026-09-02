#!/usr/bin/env python3
"""Independent literal audit of the all-forest attachment deletion floor."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from fractions import Fraction
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest_root_deletion_attachment_floor_independent_audit_root_20260825.json"
EXPECTED = {
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "RANK8_ROOT_DELETION_ATTACHMENT_FLOOR_THEOREM_2026-08-25.md":
        "584D6B0E9DB3FEEF3B5A56DBA319E9351A92DC3AE53E4A24EFA8561A3C502E83",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    return [
        (left[j] if j < len(left) else 0) + (right[j] if j < len(right) else 0)
        for j in range(min(cap, max(len(left), len(right)) - 1) + 1)
    ]


def multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    answer = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a_value in enumerate(left):
        for j, b_value in enumerate(right):
            if i + j <= cap:
                answer[i + j] += a_value * b_value
    return answer


def forest_polynomial(graph: nx.Graph, cap: int = 8) -> list[int]:
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
            excluded = multiply(excluded, add(child_excluded, child_included, cap), cap)
            included = multiply(included, child_excluded, cap)
        return excluded, included

    for root in graph:
        if root in seen:
            continue
        excluded, included = visit(root, None)
        answer = multiply(answer, add(excluded, included, cap), cap)
    return answer


def independent_sets(graph: nx.Graph, vertices: tuple[int, ...]) -> list[frozenset[int]]:
    positions = {vertex: j for j, vertex in enumerate(vertices)}
    edges = tuple((positions[u], positions[v]) for u, v in graph.edges())
    answer = []
    for mask in range(1 << len(vertices)):
        if any((mask >> u) & 1 and (mask >> v) & 1 for u, v in edges):
            continue
        answer.append(
            frozenset(vertices[j] for j in range(len(vertices)) if (mask >> j) & 1)
        )
    return answer


def rooted_far_forest(
    forest: nx.Graph, root: int
) -> tuple[nx.Graph, set[int], dict[int, int | None], set[int], set[int]]:
    boundary = set(forest.neighbors(root))
    far_vertices = set(forest) - boundary - {root}
    far = forest.subgraph(far_vertices).copy()
    parent: dict[int, int | None] = {}
    attachments: set[int] = set()
    component_roots: set[int] = set()
    for component in nx.connected_components(far):
        cut_edges = [
            (u, v)
            for u in component
            for v in forest.neighbors(u)
            if v in boundary
        ]
        assert len(cut_edges) <= 1
        if cut_edges:
            component_root = cut_edges[0][0]
            attachments.add(component_root)
        else:
            component_root = min(component)
        component_roots.add(component_root)
        parent[component_root] = None
        stack = [component_root]
        while stack:
            vertex = stack.pop()
            for child in far.neighbors(vertex):
                if child == parent[vertex]:
                    continue
                assert child not in parent
                parent[child] = vertex
                stack.append(child)
    assert set(parent) == far_vertices
    return far, boundary, parent, attachments, component_roots


def integer_partitions(total: int, minimum: int = 1) -> list[tuple[int, ...]]:
    if total == 0:
        return [()]
    answer = []
    for first in range(minimum, total + 1):
        for tail in integer_partitions(total - first, first):
            answer.append((first,) + tail)
    return answer


def tree_catalog(max_order: int) -> dict[int, list[nx.Graph]]:
    catalog = {1: [nx.empty_graph(1)]}
    for order in range(2, max_order + 1):
        catalog[order] = [
            nx.convert_node_labels_to_integers(tree, ordering="sorted")
            for tree in nx.nonisomorphic_trees(order)
        ]
    return catalog


def nonisomorphic_forests(order: int, catalog: dict[int, list[nx.Graph]]):
    for partition in integer_partitions(order):
        choices = []
        for component_order, multiplicity in sorted(Counter(partition).items()):
            choices.append(
                list(itertools.combinations_with_replacement(
                    range(len(catalog[component_order])), multiplicity
                ))
            )
        for selected_groups in itertools.product(*choices):
            components = []
            for component_order, selected_indices in zip(
                sorted(Counter(partition)), selected_groups
            ):
                components.extend(catalog[component_order][j] for j in selected_indices)
            yield nx.convert_node_labels_to_integers(nx.disjoint_union_all(components))


def deterministic_forests(order: int) -> list[nx.Graph]:
    path_isolates = nx.disjoint_union(nx.path_graph(order - 4), nx.empty_graph(4))
    star_path = nx.disjoint_union(nx.star_graph(order // 2), nx.path_graph(order - order // 2 - 1))
    matching = nx.Graph()
    matching.add_nodes_from(range(order))
    matching.add_edges_from((2 * j, 2 * j + 1) for j in range(order // 2))
    two_paths = nx.disjoint_union(nx.path_graph(order // 2), nx.path_graph(order - order // 2))
    return [path_isolates, star_path, matching, two_paths]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    max_order = 9
    catalog = tree_catalog(max_order)
    forests = roots = active_ranks = selected_sets = downward_sources = 0
    attached_components = unattached_components = 0
    minimum_slack = None
    minimum_witness = None

    for order in range(1, max_order + 1):
        for forest_index, forest in enumerate(nonisomorphic_forests(order, catalog)):
            assert nx.is_forest(forest)
            whole = forest_polynomial(forest)
            forests += 1
            for root in forest:
                deleted_graph = forest.copy()
                deleted_graph.remove_node(root)
                deleted = forest_polynomial(deleted_graph)
                far, boundary, parent, attachments, component_roots = rooted_far_forest(
                    forest, root
                )
                attached_components += len(attachments)
                unattached_components += len(component_roots - attachments)
                far_vertices = tuple(sorted(far))
                sets_by_rank: dict[int, list[frozenset[int]]] = {}
                for selected in independent_sets(far, far_vertices):
                    sets_by_rank.setdefault(len(selected), []).append(selected)
                roots += 1

                for rank in range(2, min(8, order) + 1):
                    s = rank - 1
                    family = sets_by_rank.get(s, [])
                    a_value = len(family)
                    h_value = deleted[rank] if rank < len(deleted) else 0
                    c_value = whole[rank] if rank < len(whole) else 0
                    assert c_value == h_value + a_value
                    if not a_value:
                        continue
                    active_ranks += 1
                    selected_sets += a_value
                    augmented_sum = extension_sum = 0
                    targets = set()

                    for selected in family:
                        real_degree = sum(far.degree(v) for v in selected)
                        attachment_occurrences = len(selected & attachments)
                        augmented_sum += real_degree + attachment_occurrences

                        for child, par in parent.items():
                            if par is None or par not in selected:
                                continue
                            selected_children = sorted(
                                v for v, v_parent in parent.items()
                                if v_parent == child and v in selected
                            )
                            if selected_children:
                                target = (tuple(sorted(selected)), selected_children[0], child)
                            else:
                                swapped = frozenset((selected - {par}) | {child})
                                assert all(
                                    not (u in swapped and v in swapped) for u, v in far.edges()
                                )
                                target = (tuple(sorted(swapped)), child, par)
                            assert target not in targets
                            targets.add(target)
                            downward_sources += 1

                        extensions = 0
                        for candidate in deleted_graph:
                            if candidate in selected:
                                continue
                            if all(not forest.has_edge(candidate, v) for v in selected):
                                extensions += 1
                        extension_sum += extensions

                        boundary_hits = {
                            b for b in boundary
                            if any(forest.has_edge(b, v) for v in selected)
                        }
                        assert len(boundary_hits) <= attachment_occurrences

                    assert augmented_sum <= 2 * s * a_value
                    assert extension_sum >= (order - 1 - 3 * s) * a_value
                    assert extension_sum <= rank * h_value
                    slack = rank * h_value - (order - 3 * rank + 2) * a_value
                    assert slack >= 0
                    witness = (
                        slack,
                        order,
                        forest_index,
                        root,
                        nx.number_connected_components(forest),
                        rank,
                        h_value,
                        a_value,
                        extension_sum,
                    )
                    if minimum_witness is None or witness < minimum_witness:
                        minimum_slack = slack
                        minimum_witness = witness

    large_checks = 0
    minimum_large_slack = None
    minimum_large_witness = None
    for order in (28, 40, 80, 120):
        floor = Fraction(order - 19, order - 12)
        for family_index, forest in enumerate(deterministic_forests(order)):
            whole = forest_polynomial(forest, 7)
            c7 = whole[7]
            for root in forest:
                deleted_graph = forest.copy()
                deleted_graph.remove_node(root)
                h7 = forest_polynomial(deleted_graph, 7)[7]
                slack = h7 * floor.denominator - c7 * floor.numerator
                assert slack >= 0
                large_checks += 1
                witness = (
                    slack,
                    order,
                    family_index,
                    root,
                    nx.number_connected_components(forest),
                    h7,
                    c7,
                )
                if minimum_large_witness is None or witness < minimum_large_witness:
                    minimum_large_slack = slack
                    minimum_large_witness = witness

    payload = {
        "schema": "rank8-forest-root-deletion-attachment-floor-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_ALL_FOREST_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT",
        "method": (
            "No producer imports. Every unlabeled forest through order 9 is generated as a "
            "multiset of unlabeled tree components. Fresh bit masks reconstruct every far "
            "forest, zero-or-one boundary attachments, every injection target, and every "
            "literal extension; separate include/exclude DP checks larger disconnected families."
        ),
        "literal_census": {
            "orders": "1..9",
            "forests": forests,
            "roots": roots,
            "active_rank_cells": active_ranks,
            "selected_sets": selected_sets,
            "downward_sources": downward_sources,
            "attached_components": attached_components,
            "unattached_components": unattached_components,
            "minimum_slack": minimum_slack,
            "minimum_witness": list(minimum_witness) if minimum_witness else None,
        },
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
