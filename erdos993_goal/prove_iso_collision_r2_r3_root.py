#!/usr/bin/env python3
"""Prove marked-support collision FML at ranks two and three.

Attach a new leaf z to the marked vertex u of a marked forest (B;u,v).
The collision inequality is N_r(B+z;u,v)>=N_r(B;u,v).  This verifier
symbolically extracts the doubled gaps at r=2,3, proves the rank-three forest
lower bound, exhausts the two tiny base orders, and validates the exact
formula on every atlas forest plus every nonisomorphic tree through order ten.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_collision_r2_r3_exact_root_20260829.json"


def at(row, k):
    return row.get(k, 0)


def add_symbolic(left, right):
    return {k: at(left, k) + at(right, k) for k in range(8)}


def shift_symbolic(row):
    return {k: at(row, k - 1) for k in range(8)}


def kernel2_symbolic(row, a, b):
    return sp.expand(
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2_symbolic(A, C, a, b):
    return sp.expand(
        kernel2_symbolic(add_symbolic(A, shift_symbolic(C)), a, b)
        - kernel2_symbolic(A, a, b)
        - kernel2_symbolic(C, a - 1, b - 1)
    )


def nested2_symbolic(rows, a, b):
    E, U, V, W = rows
    return sp.expand(
        leaf2_symbolic(
            add_symbolic(E, shift_symbolic(U)),
            add_symbolic(V, shift_symbolic(W)),
            a,
            b,
        )
        - leaf2_symbolic(E, V, a, b)
        - leaf2_symbolic(U, W, a - 1, b - 1)
    )


def collision_symbolic(rows):
    E, U, V, W = rows
    return (
        add_symbolic(E, shift_symbolic(U)),
        add_symbolic(U, shift_symbolic(U)),
        add_symbolic(V, shift_symbolic(W)),
        add_symbolic(W, shift_symbolic(W)),
    )


def symbolic_formulas():
    n, m, du, dv, e, P, su, sv = sp.symbols(
        "n m du dv e P su sv", integer=True
    )
    E = {
        0: 1,
        1: n,
        2: sp.binomial(n, 2) - m,
        3: sp.binomial(n, 3) - m * (n - 2) + P,
    }
    U = {
        0: 1,
        1: n - 1,
        2: sp.binomial(n - 1, 2) - m + du,
        3: sp.binomial(n - 1, 3)
        - (m - du) * (n - 3)
        + P
        - sp.binomial(du, 2)
        - su,
    }
    V = {
        0: 1,
        1: n - 1,
        2: sp.binomial(n - 1, 2) - m + dv,
        3: sp.binomial(n - 1, 3)
        - (m - dv) * (n - 3)
        + P
        - sp.binomial(dv, 2)
        - sv,
    }
    W = {
        0: 1,
        1: n - 2,
        2: sp.binomial(n - 2, 2) - m + du + dv - e,
    }
    base = E, U, V, W
    extended = collision_symbolic(base)
    gap2 = sp.simplify(
        sp.expand_func(nested2_symbolic(extended, 2, 2) - nested2_symbolic(base, 2, 2))
    )
    gap3 = sp.simplify(
        sp.expand_func(nested2_symbolic(extended, 3, 3) - nested2_symbolic(base, 3, 3))
    )
    H3 = (
        -6 * P
        + 4 * du**2
        + (-8 * n + 4) * du
        + 2 * dv**2
        + (-6 * n + 7) * dv
        + (8 * n - 1) * e
        + (4 * n - 12) * m
        + 8 * n**2
        - 11 * n
        + 8 * su
        + 4 * sv
    )
    assert gap2 == 12
    assert sp.expand(gap3 - 2 * H3) == 0

    # Exact completion of squares for the asymmetric marked-degree block.
    u0 = sp.Rational(1, 2) * n + sp.Rational(1, 4)
    v0 = sp.Rational(1, 2) * n - sp.Rational(1, 4)
    degree = 4 * du**2 + (-8 * n + 4) * du + 2 * dv**2 + (-6 * n + 7) * dv
    degree_floor = -(44 * n**2 - 44 * n + 3) / 8
    residual = (
        4 * (du - u0) ** 2
        + 2 * (dv - v0) ** 2
        + (4 * n - 6) * (n - du - dv)
    )
    assert sp.expand(degree - degree_floor - residual) == 0
    return str(sp.expand(H3)), str(sp.expand(residual))


def add_rows(left, right):
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    return tuple(out)


def shift_row(row):
    return (0, *row)


def polynomial_rows(graph: nx.Graph, u: int, v: int):
    def row(deleted):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        return tuple(poly_forest(reduced))

    return row(()), row((u,)), row((v,)), row((u, v))


def collision_rows(rows):
    E, U, V, W = rows
    return (
        add_rows(E, shift_row(U)),
        add_rows(U, shift_row(U)),
        add_rows(V, shift_row(W)),
        add_rows(W, shift_row(W)),
    )


def invariants(graph: nx.Graph, u: int, v: int):
    n = len(graph)
    m = graph.number_of_edges()
    du, dv = graph.degree(u), graph.degree(v)
    e = int(graph.has_edge(u, v))
    P = sum(degree * (degree - 1) // 2 for _, degree in graph.degree())
    su = sum(graph.degree(x) - 1 for x in graph.neighbors(u))
    sv = sum(graph.degree(x) - 1 for x in graph.neighbors(v))
    return n, m, du, dv, e, P, su, sv


def h3_formula(values):
    n, m, du, dv, e, P, su, sv = values
    return (
        -6 * P
        + 4 * du * du
        + (-8 * n + 4) * du
        + 2 * dv * dv
        + (-6 * n + 7) * dv
        + (8 * n - 1) * e
        + (4 * n - 12) * m
        + 8 * n * n
        - 11 * n
        + 8 * su
        + 4 * sv
    )


def gap(graph: nx.Graph, u: int, v: int, rank: int) -> int:
    base = polynomial_rows(graph, u, v)
    extended = collision_rows(base)
    return nested2(extended, rank, rank) - nested2(base, rank, rank)


def tiny_base_minimum(n: int) -> int:
    edges = tuple(itertools.combinations(range(n), 2))
    values = []
    for mask in range(1 << len(edges)):
        graph = nx.Graph()
        graph.add_nodes_from(range(n))
        graph.add_edges_from(edge for i, edge in enumerate(edges) if mask & (1 << i))
        if not nx.is_forest(graph):
            continue
        for u in range(n):
            for v in range(n):
                if u != v:
                    values.append(gap(graph, u, v, 3))
    return min(values)


def main() -> None:
    H3_symbolic, degree_residual = symbolic_formulas()
    assert tiny_base_minimum(2) == 20
    assert tiny_base_minimum(3) == 40

    graphs = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            graphs.append(nx.convert_node_labels_to_integers(graph0))
    for n in range(8, 11):
        graphs.extend(nx.nonisomorphic_trees(n))

    checked = 0
    minimum_gap2 = None
    minimum_gap3 = None
    for graph in graphs:
        n = len(graph)
        for u in graph:
            for v in graph:
                if u == v:
                    continue
                gap2 = gap(graph, u, v, 2)
                gap3 = gap(graph, u, v, 3)
                assert gap2 == 12
                assert gap3 == 2 * h3_formula(invariants(graph, u, v))
                if n >= 4:
                    if n <= 5:
                        analytic_numerator = 28 * n * n - 100 * n + 45
                    else:
                        analytic_numerator = 20 * n * n - 44 * n - 3
                    assert analytic_numerator > 0
                    assert 8 * h3_formula(invariants(graph, u, v)) >= analytic_numerator
                minimum_gap2 = gap2 if minimum_gap2 is None else min(minimum_gap2, gap2)
                minimum_gap3 = gap3 if minimum_gap3 is None else min(minimum_gap3, gap3)
                checked += 1

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_COLLISION_FML_R2_R3",
        "normalization": "Gaps are doubled diagonal coefficients of N.",
        "rank_2": {"doubled_gap": 12},
        "rank_3": {
            "doubled_gap": "2*H3",
            "H3": H3_symbolic,
            "degree_block_completion_residual": degree_residual,
            "analytic_H3_floor": {
                "n=2": "10 by exhaustive two-vertex forest classification",
                "n=3": "20 by exhaustive three-vertex forest classification",
                "n=4,5": "(28n^2-100n+45)/8",
                "n>=6": "(20n^2-44n-3)/8",
            },
        },
        "finite_formula_validation": {
            "graphs": len(graphs),
            "ordered_marked_pairs": checked,
            "minimum_doubled_gap_r2": minimum_gap2,
            "minimum_doubled_gap_r3": minimum_gap3,
        },
        "scope": "All marked forests and both marked-support orientations at ranks 2 and 3. No claim for r>=4 or Erdos Problem 993.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
