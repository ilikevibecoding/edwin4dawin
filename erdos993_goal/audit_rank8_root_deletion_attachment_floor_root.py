#!/usr/bin/env python3
"""Independent literal audit of the attachment-root deletion floor."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
EXPECTED = {
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
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
    tree: nx.Graph, root: int
) -> tuple[nx.Graph, set[int], dict[int, int | None], set[int]]:
    boundary = set(tree.neighbors(root))
    far_vertices = set(tree) - boundary - {root}
    far = tree.subgraph(far_vertices).copy()
    parent: dict[int, int | None] = {}
    attachments: set[int] = set()
    for component in nx.connected_components(far):
        cut_edges = [
            (u, v)
            for u in component
            for v in tree.neighbors(u)
            if v in boundary
        ]
        assert len(cut_edges) == 1
        attachment, _boundary_vertex = cut_edges[0]
        attachments.add(attachment)
        parent[attachment] = None
        stack = [attachment]
        while stack:
            vertex = stack.pop()
            for child in far.neighbors(vertex):
                if child == parent[vertex]:
                    continue
                assert child not in parent
                parent[child] = vertex
                stack.append(child)
    assert set(parent) == far_vertices
    return far, boundary, parent, attachments


def deterministic_trees(order: int) -> list[nx.Graph]:
    return [
        nx.path_graph(order),
        nx.star_graph(order - 1),
        nx.from_prufer_sequence([((17 * j + 3) % order) for j in range(order - 2)]),
        nx.from_prufer_sequence([((3 * j * j + 2 * j + 1) % order) for j in range(order - 2)]),
    ]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    producer = json.loads(
        (HERE / "rank8_root_deletion_attachment_floor_exact_root_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"

    trees = roots = active_ranks = selected_sets = downward_sources = 0
    minimum_slack = None
    minimum_witness = None
    for order in range(2, 12):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            whole = forest_polynomial(tree)
            trees += 1
            for root in tree:
                deleted_graph = tree.copy()
                deleted_graph.remove_node(root)
                deleted = forest_polynomial(deleted_graph)
                far, boundary, parent, attachments = rooted_far_forest(tree, root)
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
                        root_occurrences = len(selected & attachments)
                        augmented_sum += real_degree + root_occurrences

                        # Reconstruct the downward-to-upward injection literally.
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
                            if all(not tree.has_edge(candidate, v) for v in selected):
                                extensions += 1
                        extension_sum += extensions

                        boundary_hits = {
                            b for b in boundary
                            if any(tree.has_edge(b, v) for v in selected)
                        }
                        assert len(boundary_hits) <= root_occurrences

                    assert augmented_sum <= 2 * s * a_value
                    assert extension_sum >= (order - 1 - 3 * s) * a_value
                    assert extension_sum <= rank * h_value
                    slack = rank * h_value - (order - 3 * rank + 2) * a_value
                    assert slack >= 0
                    row = (
                        slack,
                        order,
                        tree_index,
                        root,
                        tree.degree(root),
                        rank,
                        h_value,
                        a_value,
                        extension_sum,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
                    if minimum_slack is None or row < minimum_witness:
                        minimum_slack = slack
                        minimum_witness = row

    large_checks = 0
    minimum_large_slack = None
    minimum_large_witness = None
    for order in (28, 31, 40, 80, 120, 200):
        floor = Fraction(order - 19, order - 12)
        for family_index, tree in enumerate(deterministic_trees(order)):
            whole = forest_polynomial(tree, 7)
            c7 = whole[7]
            for root in tree:
                deleted_graph = tree.copy()
                deleted_graph.remove_node(root)
                h7 = forest_polynomial(deleted_graph, 7)[7]
                slack = h7 * floor.denominator - c7 * floor.numerator
                assert slack >= 0
                large_checks += 1
                row = (slack, order, family_index, root, tree.degree(root), h7, c7)
                if minimum_large_slack is None or row < minimum_large_witness:
                    minimum_large_slack = slack
                    minimum_large_witness = row

    payload = {
        "schema": "rank8-root-deletion-attachment-floor-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT",
        "method": (
            "No producer imports. Fresh bit masks reconstruct each far forest, "
            "its unique attachments, every downward-incidence injection target, "
            "and every literal extension; a separate include/exclude DP checks "
            "the live large-order ratio."
        ),
        "literal_census": {
            "orders": "2..11",
            "trees": trees,
            "roots": roots,
            "active_rank_cells": active_ranks,
            "selected_sets": selected_sets,
            "downward_sources": downward_sources,
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
