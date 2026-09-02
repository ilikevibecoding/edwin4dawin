#!/usr/bin/env python3
"""Exact replay for the all-rank residual-forest moment identity."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path

import networkx as nx
import sympy as sp


def independence_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    vertices = list(graph.nodes())
    counts = [0] * (len(vertices) + 1)
    for size in range(len(vertices) + 1):
        for chosen in combinations(vertices, size):
            if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2)):
                counts[size] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return tuple(counts)


def residual_statistics(
    graph: nx.Graph, rank: int
) -> tuple[Fraction, Fraction, Fraction, Fraction, Fraction]:
    vertices = list(graph.nodes())
    chosen_sets = []
    for chosen in combinations(vertices, rank):
        if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2)):
            chosen_sets.append(chosen)
    return residual_statistics_for_sets(graph, chosen_sets)


def residual_statistics_for_sets(
    graph: nx.Graph, chosen_sets: list[tuple[int, ...]]
) -> tuple[Fraction, Fraction, Fraction, Fraction, Fraction]:
    vertices = list(graph.nodes())
    xs: list[int] = []
    components: list[int] = []
    edges: list[int] = []
    for chosen in chosen_sets:
        removed = set(chosen)
        for vertex in chosen:
            removed.update(graph.neighbors(vertex))
        residual_vertices = [v for v in vertices if v not in removed]
        residual = graph.subgraph(residual_vertices)
        xs.append(len(residual_vertices))
        components.append(nx.number_connected_components(residual) if residual_vertices else 0)
        edges.append(residual.number_of_edges())
    assert xs
    count = len(xs)
    mu = Fraction(sum(xs), count)
    variance = sum((Fraction(x) - mu) ** 2 for x in xs) / count
    mean_components = Fraction(sum(components), count)
    mean_edges = Fraction(sum(edges), count)
    return mu, variance, mean_components, mean_edges, variance + 2 * mean_components


def symbolic_replay() -> None:
    k = sp.symbols("k", positive=True, integer=True)
    a, b, c = sp.symbols("a b c", positive=True)
    mu = k * b / a
    nu = (k + 1) * c / b
    dstat = sp.expand(mu * (3 - mu + nu))
    q = 2 * k * b**2 - a * b - 2 * (k + 1) * a * c
    h = k**2 * (b**2 - a * c) / a + k * (b - c)
    assert sp.simplify(q - a * b * (5 - 2 * dstat / mu)) == 0
    assert sp.simplify(h - a * (4 * mu - dstat)) == 0

    na, nz = sp.symbols("na nz", positive=True)
    ma, mz, da, dz = sp.symbols("ma mz da dz", real=True)
    total = na + nz
    mixed_mu = (na * ma + nz * mz) / total
    mixed_d = (
        (na * da + nz * dz) / total
        + na * nz * (ma - mz) ** 2 / total**2
    )
    mixed_functional = total * (4 * mixed_mu - mixed_d)
    separated = (
        na * (4 * ma - da)
        + nz * (4 * mz - dz)
        - na * nz * (ma - mz) ** 2 / total
    )
    assert sp.simplify(mixed_functional - separated) == 0


def finite_forest_replay() -> tuple[int, int, int]:
    forests = 0
    ranks = 0
    pendant_checks = 0
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() == 0 or not nx.is_forest(graph):
            continue
        forests += 1
        poly = independence_polynomial(graph)
        for j in range(len(poly) - 1):
            mu, variance, mean_components, mean_edges, dstat = residual_statistics(
                graph, j
            )
            assert mu == Fraction((j + 1) * poly[j + 1], poly[j])
            assert mean_edges == mu - mean_components
            assert dstat == variance + 2 * mean_components
            # The direct ordered-compatible-pair count is equivalent to (1).
            nu = (
                Fraction((j + 2) * poly[j + 2], poly[j + 1])
                if j + 2 < len(poly)
                else Fraction(0)
            )
            assert mu - nu == 3 - dstat / mu
            k = j + 1
            a = poly[j]
            b = poly[j + 1]
            c = poly[j + 2] if j + 2 < len(poly) else 0
            q = 2 * k * b * b - a * b - 2 * (k + 1) * a * c
            h = Fraction(k * k * (b * b - a * c), a) + k * (b - c)
            assert Fraction(q, a * b) == 5 - 2 * dstat / mu
            assert h == a * (4 * mu - dstat)
            ranks += 1
        leaves = [vertex for vertex in graph if graph.degree(vertex) == 1]
        for leaf in leaves:
            support = next(iter(graph.neighbors(leaf)))
            reduced = graph.copy()
            reduced.remove_nodes_from([leaf, support])
            reduced_poly = independence_polynomial(reduced)
            for k in range(2, len(poly)):
                j = k - 1
                chosen_sets = []
                for chosen in combinations(list(graph.nodes()), j):
                    if all(
                        not graph.has_edge(u, v)
                        for u, v in combinations(chosen, 2)
                    ):
                        chosen_sets.append(chosen)
                class_a = [chosen for chosen in chosen_sets if leaf in chosen]
                class_z = [chosen for chosen in chosen_sets if leaf not in chosen]
                if not class_a or not class_z:
                    continue
                na = len(class_a)
                nz = len(class_z)
                ma, _, _, _, da = residual_statistics_for_sets(graph, class_a)
                mz, _, _, _, dz = residual_statistics_for_sets(graph, class_z)
                assert na == (reduced_poly[k - 2] if k - 2 < len(reduced_poly) else 0)
                reduced_mu, _, _, _, reduced_d = residual_statistics(reduced, k - 2)
                assert (ma, da) == (reduced_mu, reduced_d)
                pprev = poly[k - 1]
                pk = poly[k]
                pnext = poly[k + 1] if k + 1 < len(poly) else 0
                h_left = Fraction(k * k * (pk * pk - pprev * pnext), pprev) + k * (
                    pk - pnext
                )
                bprev = reduced_poly[k - 2]
                b = reduced_poly[k - 1] if k - 1 < len(reduced_poly) else 0
                bnext = reduced_poly[k] if k < len(reduced_poly) else 0
                h_right = Fraction(
                    (k - 1) ** 2 * (b * b - bprev * bnext), bprev
                ) + (k - 1) * (b - bnext)
                mixture_gap = (
                    nz * (4 * mz - dz)
                    - Fraction(na * nz, na + nz) * (ma - mz) ** 2
                )
                assert h_left - h_right == mixture_gap
                pendant_checks += 1
    return forests, ranks, pendant_checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("general_pgc_residual_moment_identity_exact_20260816.json"),
    )
    args = parser.parse_args()
    symbolic_replay()
    forests, ranks, pendant_checks = finite_forest_replay()
    report = {
        "status": "PASS_EXACT_GENERAL_PGC_RESIDUAL_MOMENT_IDENTITY",
        "symbolic_identities": {
            "extension_drop": "mu_j-mu_(j+1)=3-(Var(X)+2E[C])/mu_j",
            "q_reserve": "Q_k/(p_(k-1)p_k)=5-2(Var(X)+2E[C])/mu_(k-1)",
            "cascade_functional": "H_k=p_(k-1)(4mu_(k-1)-Var(X)-2E[C])",
            "pendant_mixture": "H_k(P)-H_(k-1)(B)=z(4mu_Z-D_Z)-az(mu_A-mu_Z)^2/(a+z)",
        },
        "atlas_forests": forests,
        "exact_residual_ranks": ranks,
        "exact_pendant_mixture_checks": pendant_checks,
        "scope": "exact identities; final coupled PGC moment inequality remains open",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"atlas_forests={forests}")
    print(f"exact_residual_ranks={ranks}")
    print(f"exact_pendant_mixture_checks={pendant_checks}")
    print("PASS_EXACT_GENERAL_PGC_RESIDUAL_MOMENT_IDENTITY")


if __name__ == "__main__":
    main()
