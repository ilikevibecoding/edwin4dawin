#!/usr/bin/env python3
"""Exact simplicial-complex reduction and finite boundary census for N_4.

For a down-closed set system Delta with two marked vertices u,v, split its
faces according to exact mark incidence.  After removing the marks, write

  P = faces containing neither mark,
  A = faces containing u but not v,
  B = faces containing v but not u,
  C = faces containing both marks.

Then C is a subcomplex of A intersect B, and A,B are subcomplexes of P.
This verifier derives the exact 33-monomial formula for N_4 in their face
numbers.  It also exhausts every down-closed set system on five labelled
vertices and every graph in the NetworkX atlas through order seven.

The censuses are finite evidence.  The symbolic reduction is universal.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import graph6


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_simplicial_decomposition_exact_root_20260829.json"


def at(row: tuple[int, ...] | list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def direct_n4(rows: tuple[tuple[int, ...], ...]) -> int:
    E, U, V, W = rows
    return (
        8 * at(E, 4) * at(W, 2)
        - 5 * at(E, 5) * at(W, 1)
        + at(E, 3) * (2 * at(W, 1) - 5 * at(W, 3))
        + at(U, 4) * (-5 * at(V, 2) - at(W, 1))
        + at(U, 3) * (8 * at(V, 3) + 2 * at(W, 2))
        + at(U, 2) * (-5 * at(V, 4) + 2 * at(V, 2) - at(W, 3))
        - at(V, 4) * at(W, 1)
        + 2 * at(V, 3) * at(W, 2)
        - at(V, 2) * at(W, 3)
    )


def decomposed_n4(
    p: tuple[int, ...],
    a: tuple[int, ...],
    b: tuple[int, ...],
    c: tuple[int, ...],
) -> int:
    return (
        2 * at(p, 2) ** 2
        + 3 * at(p, 3) ** 2
        - 5 * at(p, 1) * at(p, 5)
        - 2 * at(p, 1) * at(p, 4)
        - 2 * at(p, 2) * at(p, 4)
        + 2 * at(p, 1) * at(p, 3)
        + 2 * at(p, 2) * at(p, 3)
        # L(P,A)
        - at(a, 1) * at(p, 3)
        - at(a, 3) * at(p, 1)
        - 5 * at(a, 1) * at(p, 4)
        - 5 * at(a, 4) * at(p, 1)
        + 2 * at(a, 1) * at(p, 2)
        + 2 * at(a, 2) * at(p, 1)
        + 2 * at(a, 2) * at(p, 2)
        + 3 * at(a, 2) * at(p, 3)
        + 3 * at(a, 3) * at(p, 2)
        # L(P,B)
        - at(b, 1) * at(p, 3)
        - at(b, 3) * at(p, 1)
        - 5 * at(b, 1) * at(p, 4)
        - 5 * at(b, 4) * at(p, 1)
        + 2 * at(b, 1) * at(p, 2)
        + 2 * at(b, 2) * at(p, 1)
        + 2 * at(b, 2) * at(p, 2)
        + 3 * at(b, 2) * at(p, 3)
        + 3 * at(b, 3) * at(p, 2)
        # R(A,B)+R(P,C)
        + 2 * at(a, 1) * at(b, 1)
        + 8 * at(a, 2) * at(b, 2)
        - 5 * at(a, 1) * at(b, 3)
        - 5 * at(a, 3) * at(b, 1)
        + 2 * at(c, 1) * at(p, 1)
        + 8 * at(c, 2) * at(p, 2)
        - 5 * at(c, 1) * at(p, 3)
        - 5 * at(c, 3) * at(p, 1)
    )


def rows_and_layers(
    faces: set[int], order: int, u: int, v: int
) -> tuple[tuple[tuple[int, ...], ...], tuple[tuple[int, ...], ...]]:
    rows = [[0] * (order + 1) for _ in range(4)]
    layers = [[0] * (order + 1) for _ in range(4)]
    for face in faces:
        size = face.bit_count()
        has_u = bool(face >> u & 1)
        has_v = bool(face >> v & 1)
        rows[0][size] += 1
        if not has_u:
            rows[1][size] += 1
        if not has_v:
            rows[2][size] += 1
        if not has_u and not has_v:
            rows[3][size] += 1
            layers[0][size] += 1
        elif has_u and not has_v:
            layers[1][size - 1] += 1
        elif has_v and not has_u:
            layers[2][size - 1] += 1
        else:
            layers[3][size - 2] += 1
    return tuple(map(tuple, rows)), tuple(map(tuple, layers))


def assert_nested_layers(
    faces: set[int], order: int, u: int, v: int
) -> int:
    u_bit, v_bit = 1 << u, 1 << v
    rest_mask = (1 << order) - 1 ^ u_bit ^ v_bit
    checks = 0
    for rest in range(1 << order):
        if rest & ~rest_mask:
            continue
        if rest | u_bit in faces:
            assert rest in faces
            checks += 1
        if rest | v_bit in faces:
            assert rest in faces
            checks += 1
        if rest | u_bit | v_bit in faces:
            assert rest | u_bit in faces and rest | v_bit in faces
            checks += 2
    return checks


def symbolic_identity() -> dict[str, object]:
    p = sp.symbols("p0:7")
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")

    E = tuple(
        p[k]
        + (a[k - 1] + b[k - 1] if k >= 1 else 0)
        + (c[k - 2] if k >= 2 else 0)
        for k in range(7)
    )
    U = tuple(p[k] + (b[k - 1] if k >= 1 else 0) for k in range(7))
    V = tuple(p[k] + (a[k - 1] if k >= 1 else 0) for k in range(7))
    W = p
    direct = sp.expand(direct_n4((E, U, V, W)))
    claimed = sp.expand(decomposed_n4(p, a, b, c))
    assert sp.expand(direct - claimed) == 0
    terms = sp.Add.make_args(claimed)
    assert len(terms) == 33
    return {
        "combined_monomials": len(terms),
        "blocks": "K(P)+L(P,A)+L(P,B)+R(A,B)+R(P,C)",
        "identity_check": "expand(direct_N4-decomposed_N4)=0",
    }


def boolean_lattice(order: int) -> nx.DiGraph:
    lattice = nx.DiGraph()
    lattice.add_nodes_from(range(1 << order))
    for face in range(1 << order):
        for vertex in range(order):
            if not (face >> vertex & 1):
                lattice.add_edge(face, face | (1 << vertex))
    return lattice


def exhaustive_complexes_order_five() -> dict[str, object]:
    order = 5
    all_masks = tuple(range(1 << order))
    systems = cells = nested_checks = negatives = cross_checks = 0
    minimum = None
    for facets in nx.antichains(boolean_lattice(order)):
        faces = {
            face
            for facet in facets
            for face in all_masks
            if not (face & ~facet)
        }
        systems += 1
        for u, v in itertools.combinations(range(order), 2):
            rows, layers = rows_and_layers(faces, order, u, v)
            value = direct_n4(rows)
            assert value == decomposed_n4(*layers)
            nested_checks += assert_nested_layers(faces, order, u, v)
            cross_checks += 1
            negatives += int(value < 0)
            witness = {
                "N4": value,
                "facets": sorted(facets),
                "marks": [u, v],
                "face_count": len(faces),
            }
            if minimum is None or value < minimum["N4"]:
                minimum = witness
            cells += 1
    assert systems == 7581
    assert cells == cross_checks == 75810
    assert negatives == 0
    return {
        "labelled_downsets": systems,
        "marked_cells": cells,
        "formula_cross_checks": cross_checks,
        "nested_inclusion_checks": nested_checks,
        "negative": negatives,
        "minimum": minimum,
    }


def atlas_graph_census() -> dict[str, object]:
    graphs = cells = negatives = cross_checks = 0
    minimum = None
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2:
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        order = len(graph)
        edge_masks = tuple((1 << x) | (1 << y) for x, y in graph.edges())
        faces = {
            chosen
            for chosen in range(1 << order)
            if all(chosen & edge != edge for edge in edge_masks)
        }
        graphs += 1
        for u, v in itertools.combinations(range(order), 2):
            rows, layers = rows_and_layers(faces, order, u, v)
            value = direct_n4(rows)
            assert value == decomposed_n4(*layers)
            cross_checks += 1
            negatives += int(value < 0)
            witness = {
                "N4": value,
                "order": order,
                "graph6": graph6(graph),
                "edges": sorted(map(sorted, graph.edges())),
                "marks": [u, v],
            }
            if minimum is None or value < minimum["N4"]:
                minimum = witness
            cells += 1
    assert graphs == 1251
    assert cells == cross_checks == 24684
    assert negatives == 0
    return {
        "unlabelled_graphs_orders_2_to_7": graphs,
        "marked_cells": cells,
        "formula_cross_checks": cross_checks,
        "negative": negatives,
        "minimum": minimum,
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_N4_SIMPLICIAL_DECOMPOSITION_AND_BOUNDARY_CENSUS",
        "symbolic": symbolic_identity(),
        "universal_reduction": {
            "layers": (
                "P=neither-mark faces; A=u-only links; B=v-only links; "
                "C=both-mark links"
            ),
            "inclusions": "C subset A intersection B, and A,B subset P",
            "scope": (
                "The 33-monomial algebraic identity holds for every marked "
                "down-closed set system."
            ),
        },
        "exhaustive_complex_boundary": exhaustive_complexes_order_five(),
        "atlas_graph_boundary": atlas_graph_census(),
        "logical_scope": (
            "The symbolic decomposition is universal.  The two censuses are "
            "finite boundary evidence only; they do not prove N4 for all "
            "simplicial complexes, all graphs, or all forests."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
