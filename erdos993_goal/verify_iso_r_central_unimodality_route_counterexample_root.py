#!/usr/bin/env python3
"""Freeze an exact forest obstruction to global R central unimodality.

For a marked forest (B;u,v), write

    E=I(B), U=I(B-u), V=I(B-v), W=I(B-{u,v})

and

    R(z,w)=z^2 E(w)W(z)+w^2 E(z)W(w)
           +zw(U(w)V(z)+U(z)V(w)).

The isolate hierarchy proposed using

    C_r=[z^(r-1)w^(r-1)]R-[z^(r-2)w^r]R

as a separately nonnegative central-unimodality payment.  This script gives
an exact 12-vertex forest with alpha(B)=7 and C_8=-3.  Thus the obstruction
occurs at r=alpha(B)+1, an actual rank after adjoining one isolate, rather
than only in zero padding beyond the applicable isolate range.

The witness independence polynomials are recomputed by literal enumeration
of all vertex subsets.  A separate exact census constructs every unlabeled
forest through order 11 as a multiset of nonisomorphic trees and verifies
that no smaller marked forest has a negative C_r in 2<=r<=alpha+1.

This refutes only the componentwise C_r/Schur-positive route.  The coupled
isolate gap M_r+C_r is positive on the witness, so the script does not refute
the third-leaf recurrence, forest ISO, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_r_central_unimodality_route_counterexample_exact_root_20260829.json"

# Vertex 0 is an isolated marked vertex.  Vertices 1,...,11 induce a spider
# with arm lengths 2,2,2,4.  Vertex 2 is the first vertex on the long arm.
WITNESS_VERTICES = tuple(range(12))
WITNESS_EDGES = (
    (1, 2),
    (1, 3),
    (1, 5),
    (1, 7),
    (2, 9),
    (3, 4),
    (5, 6),
    (7, 8),
    (9, 10),
    (10, 11),
)
MARK_U = 0
MARK_V = 2
RANK = 8


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def trim(row: list[int]) -> tuple[int, ...]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return tuple(row)


def brute_independence_polynomial(
    vertices: tuple[int, ...],
    edges: tuple[tuple[int, int], ...],
    deleted: frozenset[int] = frozenset(),
) -> tuple[int, ...]:
    """Literal independent-subset enumeration for the frozen witness."""
    active = tuple(vertex for vertex in vertices if vertex not in deleted)
    position = {vertex: index for index, vertex in enumerate(active)}
    active_edges = tuple(
        (position[left], position[right])
        for left, right in edges
        if left in position and right in position
    )
    row = [0] * (len(active) + 1)
    for mask in range(1 << len(active)):
        if any((mask >> left) & 1 and (mask >> right) & 1 for left, right in active_edges):
            continue
        row[mask.bit_count()] += 1
    return trim(row)


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    return tuple(out)


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return trim(out)


def forest_independence_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    """Independent rooted-tree DP, used only for the minimal-order census."""
    total = (1,)
    seen: set[int] = set()
    for root in graph:
        if root in seen:
            continue
        parent: dict[int, int | None] = {root: None}
        order = [root]
        seen.add(root)
        for vertex in order:
            for neighbor in graph.neighbors(vertex):
                if neighbor == parent[vertex]:
                    continue
                if neighbor in parent:
                    raise AssertionError("census object is not a forest")
                parent[neighbor] = vertex
                seen.add(neighbor)
                order.append(neighbor)
        excluded: dict[int, tuple[int, ...]] = {}
        included: dict[int, tuple[int, ...]] = {}
        for vertex in reversed(order):
            out = (1,)
            inside = (0, 1)
            for child in graph.neighbors(vertex):
                if parent.get(child) != vertex:
                    continue
                out = multiply(out, add(excluded[child], included[child]))
                inside = multiply(inside, excluded[child])
            excluded[vertex] = out
            included[vertex] = inside
        total = multiply(total, add(excluded[root], included[root]))
    return total


def r_terms(
    rows: tuple[tuple[int, ...], ...], a: int, b: int
) -> tuple[int, int, int, int]:
    """The four summands of [z^a w^b]R."""
    E, U, V, W = rows
    return (
        at(W, a - 2) * at(E, b),
        at(E, a) * at(W, b - 2),
        at(V, a - 1) * at(U, b - 1),
        at(U, a - 1) * at(V, b - 1),
    )


def r_coefficient(rows: tuple[tuple[int, ...], ...], a: int, b: int) -> int:
    return sum(r_terms(rows, a, b))


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def kernel2(row: tuple[int, ...], a: int, b: int) -> int:
    """Twice [z^a w^b] of the base symmetric ISO kernel K."""
    return (
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2(A: tuple[int, ...], C: tuple[int, ...], a: int, b: int) -> int:
    return (
        kernel2(add(A, shift(C)), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2(rows: tuple[tuple[int, ...], ...], a: int, b: int) -> int:
    """Twice [z^a w^b]N, hence M_r when (a,b)=(r-1,r)."""
    E, U, V, W = rows
    return (
        leaf2(add(E, shift(U)), add(V, shift(W)), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def witness_rows() -> tuple[tuple[int, ...], ...]:
    return tuple(
        brute_independence_polynomial(WITNESS_VERTICES, WITNESS_EDGES, deleted)
        for deleted in (
            frozenset(),
            frozenset((MARK_U,)),
            frozenset((MARK_V,)),
            frozenset((MARK_U, MARK_V)),
        )
    )


def component_types(max_order: int) -> list[tuple[int, int, nx.Graph]]:
    out: list[tuple[int, int, nx.Graph]] = []
    for order in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for index, tree in enumerate(trees):
            out.append(
                (order, index, nx.convert_node_labels_to_integers(tree))
            )
    return out


def component_multisets(
    types: list[tuple[int, int, nx.Graph]],
    total: int,
    start: int = 0,
    chosen: tuple[int, ...] = (),
):
    if total == 0:
        yield chosen
        return
    for index in range(start, len(types)):
        order = types[index][0]
        if order > total:
            break
        yield from component_multisets(
            types, total - order, index, chosen + (index,)
        )


def build_forest(
    types: list[tuple[int, int, nx.Graph]], indices: tuple[int, ...]
) -> nx.Graph:
    graph = nx.Graph()
    for index in indices:
        graph = nx.disjoint_union(graph, types[index][2])
    return graph


def minimal_order_census(max_order: int = 11) -> dict:
    """Check every unlabeled forest and every marked pair through max_order."""
    types = component_types(max_order)
    by_order: dict[str, dict[str, int]] = {}
    total_forests = 0
    total_marked_pairs = 0
    total_rank_checks = 0
    minimum = None
    for order in range(2, max_order + 1):
        forest_count = 0
        marked_pairs = 0
        rank_checks = 0
        for indices in component_multisets(types, order):
            graph = build_forest(types, indices)
            assert len(graph) == order
            forest_count += 1
            E = forest_independence_polynomial(graph)
            alpha = len(E) - 1
            singles: dict[int, tuple[int, ...]] = {}
            for u in graph:
                reduced = graph.copy()
                reduced.remove_node(u)
                singles[u] = forest_independence_polynomial(reduced)
            for u in range(order):
                for v in range(u + 1, order):
                    reduced = graph.copy()
                    reduced.remove_nodes_from((u, v))
                    rows = (
                        E,
                        singles[u],
                        singles[v],
                        forest_independence_polynomial(reduced),
                    )
                    marked_pairs += 1
                    for rank in range(2, alpha + 2):
                        value = r_coefficient(rows, rank - 1, rank - 1) - r_coefficient(
                            rows, rank - 2, rank
                        )
                        rank_checks += 1
                        if minimum is None or value < minimum:
                            minimum = value
                        assert value >= 0
        by_order[str(order)] = {
            "forests": forest_count,
            "marked_pairs": marked_pairs,
            "rank_checks": rank_checks,
        }
        total_forests += forest_count
        total_marked_pairs += marked_pairs
        total_rank_checks += rank_checks
    return {
        "max_order": max_order,
        "by_order": by_order,
        "forests": total_forests,
        "marked_pairs": total_marked_pairs,
        "rank_checks": total_rank_checks,
        "negative": 0,
        "minimum": minimum,
        "enumeration": (
            "Every unlabeled forest is generated uniquely as a nondecreasing "
            "multiset of NetworkX nonisomorphic-tree types. Every unordered "
            "marked pair and every 2<=r<=alpha+1 is checked exactly."
        ),
    }


def main() -> None:
    rows = witness_rows()
    expected_rows = (
        (1, 12, 56, 132, 168, 111, 31, 1),
        (1, 11, 45, 87, 81, 30, 1),
        (1, 11, 47, 100, 112, 63, 15, 1),
        (1, 10, 37, 63, 49, 14, 1),
    )
    assert rows == expected_rows
    alpha = len(rows[0]) - 1
    assert alpha == 7 and RANK == alpha + 1

    outer_terms = r_terms(rows, RANK - 2, RANK)
    inner_terms = r_terms(rows, RANK - 1, RANK - 1)
    outer = sum(outer_terms)
    inner = sum(inner_terms)
    curvature = inner - outer
    assert outer_terms == (0, 31, 0, 30)
    assert inner_terms == (14, 14, 15, 15)
    assert outer == 61 and inner == 58 and curvature == -3
    assert r_coefficient(rows, RANK, RANK - 2) == outer

    adjacent = nested2(rows, RANK - 1, RANK)
    coupled_gap = adjacent + curvature
    assert adjacent == 2036 and coupled_gap == 2033

    census = minimal_order_census()
    source_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "marker": "PASS_EXACT_ISO_R_CENTRAL_UNIMODALITY_ROUTE_COUNTEREXAMPLE",
        "definitions": {
            "rows": "E=I(B), U=I(B-u), V=I(B-v), W=I(B-{u,v})",
            "R": (
                "z^2 E(w)W(z)+w^2 E(z)W(w)+"
                "zw[U(w)V(z)+U(z)V(w)]"
            ),
            "C_r": "R_(r-1,r-1)-R_(r-2,r)",
            "M_r": "2N_(r-1,r)",
            "G_r": "M_r+C_r",
        },
        "witness": {
            "n": len(WITNESS_VERTICES),
            "components": [
                "one isolated marked vertex u=0",
                "an 11-vertex spider with arm lengths 2,2,2,4",
            ],
            "vertices": WITNESS_VERTICES,
            "edges": WITNESS_EDGES,
            "marks": {"u": MARK_U, "v": MARK_V},
            "long_arm": [1, 2, 9, 10, 11],
            "alpha": alpha,
            "rank": RANK,
            "rank_applicability": "r=alpha(B)+1, the upper rank after adjoining one isolate",
            "rows": {name: row for name, row in zip("EUVW", rows)},
            "R_outer": {
                "coefficient": "R_(6,8)",
                "four_terms": outer_terms,
                "value": outer,
            },
            "R_inner": {
                "coefficient": "R_(7,7)",
                "four_terms": inner_terms,
                "value": inner,
            },
            "C_8": curvature,
            "degree_14_schur_coefficient_s_7_7": curvature,
            "M_8": adjacent,
            "G_8": coupled_gap,
        },
        "minimal_order_census": census,
        "obstruction": {
            "refutes": (
                "All-forest central unimodality or Schur positivity of R "
                "strong enough to require every applicable C_r>=0."
            ),
            "does_not_refute": (
                "The coupled isolate payment G_r, the arbitrary-forest "
                "third-leaf recurrence, forest ISO, or Erdos Problem 993."
            ),
            "remaining_viable_direction": (
                "A coupled cone retaining M_r+C_r, rather than a separate "
                "nonnegative C_r payment."
            ),
        },
        "source_sha256": source_sha256,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    # Write the exact bytes that are hashed, avoiding platform newline drift.
    OUTPUT.write_bytes(raw.encode("utf-8"))
    report_sha256 = hashlib.sha256(raw.encode()).hexdigest().upper()
    print(json.dumps(report, indent=2, sort_keys=True))
    print("SOURCE_SHA256", source_sha256)
    print("REPORT_SHA256", report_sha256)
    print(report["marker"])


if __name__ == "__main__":
    main()
