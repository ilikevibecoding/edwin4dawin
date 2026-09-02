#!/usr/bin/env python3
"""Independent literal audit of the forest-base terminal-q3 m=2 rows.

This checker intentionally does not import any row-building or forest-census
helpers from the symbolic forest verifier.  It enumerates vertex subsets,
constructs independent-set and exactly-one-edge rows literally, adds the
terminal isolates as actual graph vertices, and compares the resulting Newton
coefficient with the pinned canonical ``terminal_rows`` implementation.

The computation is finite evidence and an indexing audit, not the all-order
proof.  Its purpose is to fail closed if the fixed low rank-three block is
accidentally moved with the high target j.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections.abc import Iterator
from pathlib import Path

import networkx as nx

import audit_terminal_q3_low_newton_adversarial_agent as canonical


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_low_newton_m2_forest_canonical_root_20260829.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def literal_rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    """Return rows counting induced subsets with zero and exactly one edge."""
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    order = len(graph)
    zero = [0] * (order + 1)
    one = [0] * (order + 1)
    edge_masks = [(1 << left) | (1 << right) for left, right in graph.edges()]
    for mask in range(1 << order):
        rank = mask.bit_count()
        induced_edges = 0
        for edge_mask in edge_masks:
            if mask & edge_mask == edge_mask:
                induced_edges += 1
                if induced_edges > 1:
                    break
        if induced_edges == 0:
            zero[rank] += 1
        elif induced_edges == 1:
            one[rank] += 1
    return zero, one


class LiteralMessages:
    def __init__(
        self,
        deleted_rows: tuple[list[int], list[int]],
        closed_rows: tuple[list[int], list[int]],
    ) -> None:
        self.deleted_rows = deleted_rows
        self.closed_rows = closed_rows

    def forest_after_deleting_root(self, _root: int):
        return self.deleted_rows

    def forest_after_closed_neighborhood(self, _root: int):
        return self.closed_rows


def tree_types(max_order: int) -> list[tuple[int, nx.Graph]]:
    result: list[tuple[int, nx.Graph]] = []
    for order in range(1, max_order + 1):
        family = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        result.extend((order, nx.convert_node_labels_to_integers(graph)) for graph in family)
    return result


def component_multisets(
    types: list[tuple[int, nx.Graph]],
    total_order: int,
    start: int = 0,
) -> Iterator[tuple[int, ...]]:
    if total_order == 0:
        yield ()
        return
    for index in range(start, len(types)):
        order = types[index][0]
        if order > total_order:
            continue
        for rest in component_multisets(types, total_order - order, index):
            yield (index, *rest)


def build_forest(types: list[tuple[int, nx.Graph]], components: tuple[int, ...]) -> nx.Graph:
    graph = nx.Graph()
    for index in components:
        graph = nx.disjoint_union(graph, types[index][1])
    return graph


def delete_vertices(graph: nx.Graph, vertices: set[int]) -> nx.Graph:
    kept = [vertex for vertex in graph if vertex not in vertices]
    return nx.convert_node_labels_to_integers(graph.subgraph(kept).copy(), ordering="sorted")


def audit(max_order: int) -> dict[str, object]:
    types = tree_types(max_order)
    forests = roots = targets = shifts = identities = 0
    by_order: dict[str, int] = {}
    by_target: dict[str, int] = {}
    minimum: int | None = None
    minimum_cell: dict[str, object] | None = None

    for order in range(1, max_order + 1):
        order_forests = 0
        for components in component_multisets(types, order):
            graph = build_forest(types, components)
            assert len(graph) == order and nx.is_forest(graph)
            forests += 1
            order_forests += 1
            whole_zero, whole_one = literal_rows(graph)
            augmented_rows: dict[int, tuple[list[int], list[int]]] = {}
            for t in (1, 2, 3):
                augmented = nx.disjoint_union(graph, nx.empty_graph(t))
                augmented_rows[t] = literal_rows(augmented)
            for root in graph:
                roots += 1
                deleted = delete_vertices(graph, {root})
                closed = delete_vertices(graph, {root, *graph.neighbors(root)})
                f_zero, f_one = literal_rows(deleted)
                h_zero, h_one = literal_rows(closed)
                messages = LiteralMessages((f_zero, f_one), (h_zero, h_one))
                canonical_rows = {
                    item[0]: item
                    for item in canonical.terminal_rows(
                        graph, root, whole_zero, whole_one, messages
                    )
                }

                # These are the fixed terminal-q3 low rows for every target j.
                a = coefficient(f_zero, 2)
                z2 = coefficient(f_one, 3)
                h2 = coefficient(h_zero, 2)
                for target in range(3, len(f_zero)):
                    b = coefficient(f_zero, target)
                    if b == 0:
                        continue
                    targets += 1
                    by_target[str(target)] = by_target.get(str(target), 0) + 1
                    assert target in canonical_rows
                    zj = coefficient(f_one, target + 1)
                    hj = coefficient(h_zero, target)
                    delta_values: list[int] = []
                    for t in (1, 2, 3):
                        augmented_zero, augmented_one = augmented_rows[t]
                        P = coefficient(augmented_zero, 3)
                        R = coefficient(augmented_one, 4)
                        U = coefficient(augmented_zero, target + 1)
                        c = z2 + h2 + t * a
                        e = zj + hj + t * b
                        M = (target + 1) * b * c - 3 * a * e
                        A = P * c - a * R
                        W = P * b - a * U
                        delta = P * (P + a) * M - (target + 1) * A * W

                        d0, d1 = 3 * P, 3 * a
                        D0, D1 = (target + 1) * U, (target + 1) * b
                        original_margin = (
                            (d0 + d1) * d0 * M
                            - (c * d0 - R * d1) * (d0 * D1 - d1 * D0)
                        )
                        assert original_margin == 9 * delta
                        Q = (target + 1) * b * (c + R) - 3 * (P + a) * e
                        split = (target + 1) * a * A * U + a * P * Q
                        assert delta == split
                        identities += 2
                        shifts += 1
                        delta_values.append(delta)

                    m2 = delta_values[2] - 2 * delta_values[1] + delta_values[0]
                    canonical_m2 = canonical_rows[target][1][2]
                    assert m2 == canonical_m2
                    assert m2 >= 0
                    if minimum is None or m2 < minimum:
                        minimum = m2
                        minimum_cell = {
                            "order": order,
                            "components": list(components),
                            "root": root,
                            "target": target,
                            "m2": m2,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        }
        by_order[str(order)] = order_forests

    return {
        "schema": "terminal-q3-low-newton-m2-forest-canonical-literal-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_LITERAL_CANONICAL_FOREST_M2_INDEX_AUDIT",
        "claim_scope": (
            "Literal finite indexing audit only; the separate symbolic verifier "
            "is required for the all-order theorem."
        ),
        "max_order": max_order,
        "forests": forests,
        "roots": roots,
        "supported_targets": targets,
        "terminal_shifts": shifts,
        "independent_identities": identities,
        "forests_by_order": by_order,
        "supported_targets_by_j": by_target,
        "minimum_m2": minimum,
        "minimum_cell": minimum_cell,
        "fixed_low_block": "a=i2(F), z2=one_edge_rank3(F), h2=i2(H)",
        "moving_high_block": "b=i_j(F), zj=one_edge_rank_(j+1)(F), hj=i_j(H)",
        "pins": {
            "canonical_source_sha256": sha256(HERE / "audit_terminal_q3_low_newton_adversarial_agent.py"),
            "auditor_source_sha256": sha256(Path(__file__).resolve()),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=9)
    args = parser.parse_args()
    report = audit(args.max_order)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
