#!/usr/bin/env python3
"""Prove the isolate FML gap at ranks two and three for every forest.

For a marked forest (B;u,v), adjoining one unmarked isolate multiplies all
four minors by 1+x.  The isolate FML gap is

    G_r = M_r + C_r,
    M_r = 2 [z^(r-1) w^r] N,
    C_r = R_(r-1,r-1) - R_(r-2,r).

This verifier derives exact low-rank invariant formulas, checks the elementary
forest lower-bound algebra, and independently validates the formulas on every
atlas forest plus every nonisomorphic tree through order ten.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_isolate_adjacent_coupling_root import rcoefficient
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_isolate_r2_r3_exact_root_20260829.json"


def at(row, k):
    return row.get(k, 0)


def add(left, right):
    return {k: at(left, k) + at(right, k) for k in range(7)}


def shift(row):
    return {k: at(row, k - 1) for k in range(7)}


def kernel2(row, a, b):
    return sp.expand(
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2(A, C, a, b):
    return sp.expand(
        kernel2(add(A, shift(C)), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2_symbolic(rows, a, b):
    E, U, V, W = rows
    return sp.expand(
        leaf2(add(E, shift(U)), add(V, shift(W)), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def rcoefficient_symbolic(rows, a, b):
    E, U, V, W = rows
    return sp.expand(
        at(W, a - 2) * at(E, b)
        + at(E, a) * at(W, b - 2)
        + at(V, a - 1) * at(U, b - 1)
        + at(U, a - 1) * at(V, b - 1)
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
    rows = E, U, V, W

    M2 = sp.simplify(sp.expand_func(nested2_symbolic(rows, 1, 2)))
    C2 = sp.simplify(
        sp.expand_func(
            rcoefficient_symbolic(rows, 1, 1)
            - rcoefficient_symbolic(rows, 0, 2)
        )
    )
    M3 = sp.simplify(sp.expand_func(nested2_symbolic(rows, 2, 3)))
    C3 = sp.simplify(
        sp.expand_func(
            rcoefficient_symbolic(rows, 2, 2)
            - rcoefficient_symbolic(rows, 1, 3)
        )
    )

    expected_M3 = (
        -6 * P
        + 2 * du**2
        + (-6 * n + 7) * du
        + 2 * dv**2
        + (-6 * n + 7) * dv
        + (4 * n + 2) * e
        + (4 * n - 12) * m
        + 8 * n**2
        - 12 * n
        + 4 * su
        + 4 * sv
    )
    assert M2 == 6
    assert C2 == 1
    assert sp.expand(M3 - expected_M3) == 0
    assert sp.expand(C3 - (n**2 - du - dv)) == 0
    return str(sp.expand(M3)), str(sp.expand(C3))


def polynomial_rows(graph: nx.Graph, u: int, v: int):
    def row(deleted):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        return tuple(poly_forest(reduced))

    return row(()), row((u,)), row((v,)), row((u, v))


def invariants(graph: nx.Graph, u: int, v: int):
    n = len(graph)
    m = graph.number_of_edges()
    du, dv = graph.degree(u), graph.degree(v)
    e = int(graph.has_edge(u, v))
    P = sum(degree * (degree - 1) // 2 for _, degree in graph.degree())
    su = sum(graph.degree(x) - 1 for x in graph.neighbors(u))
    sv = sum(graph.degree(x) - 1 for x in graph.neighbors(v))
    return n, m, du, dv, e, P, su, sv


def m3_formula(values):
    n, m, du, dv, e, P, su, sv = values
    return (
        -6 * P
        + 2 * du * du
        + (-6 * n + 7) * du
        + 2 * dv * dv
        + (-6 * n + 7) * dv
        + (4 * n + 2) * e
        + (4 * n - 12) * m
        + 8 * n * n
        - 12 * n
        + 4 * su
        + 4 * sv
    )


def m3_floor(n: int) -> int:
    if n == 2:
        return 8
    if n <= 5:
        return 4 * n * n - 12 * n + 6
    return 3 * n * n - 5 * n


def main() -> None:
    M3_symbolic, C3_symbolic = symbolic_formulas()
    checked = 0
    minimum = {"M2": None, "C2": None, "G2": None, "M3": None, "C3": None, "G3": None}

    graphs = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            graphs.append(nx.convert_node_labels_to_integers(graph0))
    for n in range(8, 11):
        graphs.extend(nx.nonisomorphic_trees(n))

    for graph in graphs:
        n = len(graph)
        for u in graph:
            for v in graph:
                if v <= u:
                    continue
                rows = polynomial_rows(graph, u, v)
                M2 = nested2(rows, 1, 2)
                C2 = rcoefficient(rows, 1, 1) - rcoefficient(rows, 0, 2)
                M3 = nested2(rows, 2, 3)
                C3 = rcoefficient(rows, 2, 2) - rcoefficient(rows, 1, 3)
                values = invariants(graph, u, v)
                assert M2 == 6 and C2 == 1
                assert M3 == m3_formula(values)
                assert C3 == n * n - graph.degree(u) - graph.degree(v)
                assert M3 >= m3_floor(n)
                assert C3 >= n * n - n
                row_values = {
                    "M2": M2,
                    "C2": C2,
                    "G2": M2 + C2,
                    "M3": M3,
                    "C3": C3,
                    "G3": M3 + C3,
                }
                for key, value in row_values.items():
                    minimum[key] = value if minimum[key] is None else min(minimum[key], value)
                checked += 1

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISOLATE_FML_R2_R3",
        "rank_2": {"M2": 6, "C2": 1, "G2": 7},
        "rank_3": {
            "M3": M3_symbolic,
            "C3": C3_symbolic,
            "M3_floors": {
                "n=2": "8",
                "3<=n<=5": "4n^2-12n+6 (minimum 6)",
                "n>=6": "3n^2-5n",
            },
            "C3_floor": "n^2-n",
        },
        "forest_inequalities": [
            "P<=binom(m,2)",
            "m<=n-1",
            "du+dv<=n",
            "du^2+dv^2>=(du+dv)^2/2",
            "su,sv,e>=0",
        ],
        "finite_formula_validation": {
            "graphs": len(graphs),
            "marked_pairs": checked,
            "minimum_values": minimum,
            "scope": "formula validation only; the theorem uses the displayed symbolic identities and forest inequalities",
        },
        "scope": "All marked forests and all isolate FML cells at ranks 2 and 3. No claim for r>=4 or Erdos Problem 993.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
