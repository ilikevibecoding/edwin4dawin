#!/usr/bin/env python3
"""Exact replay for a counterexample to the second Boundary-SM3 split.

This is a route counterexample, not a counterexample to Boundary-SM3 or to
unimodality.  All arithmetic is Python integer arithmetic.  The relevant
independence polynomials are computed twice: from closed formulas and from a
tree dynamic program on the explicitly constructed graphs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


Polynomial = tuple[int, ...]


def add(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, av in enumerate(a):
        for j, bv in enumerate(b):
            out[i + j] += av * bv
    return tuple(out)


def power(a: Polynomial, exponent: int) -> Polynomial:
    out = (1,)
    for _ in range(exponent):
        out = multiply(out, a)
    return out


def shift(a: Polynomial) -> Polynomial:
    return (0,) + a


def coeff(a: Polynomial, rank: int) -> int:
    return a[rank] if 0 <= rank < len(a) else 0


def difference(a: Polynomial, rank: int) -> int:
    return 3 * coeff(a, rank) - coeff(a, rank - 1)


def make_t_m(m: int) -> tuple[dict[int, set[int]], int]:
    """Central vertex, m supports, and two leaves at every support."""
    graph: dict[int, set[int]] = {0: set()}
    for branch in range(m):
        support = 1 + 3 * branch
        leaves = (support + 1, support + 2)
        for vertex in (support, *leaves):
            graph[vertex] = set()
        for u, v in ((0, support), (support, leaves[0]), (support, leaves[1])):
            graph[u].add(v)
            graph[v].add(u)
    return graph, 0


def copy_graph(graph: dict[int, set[int]]) -> dict[int, set[int]]:
    return {vertex: set(neighbors) for vertex, neighbors in graph.items()}


def tree_polynomial(graph: dict[int, set[int]], root: int) -> Polynomial:
    """Independence polynomial of one tree by include/exclude DP."""
    def states(vertex: int, parent: int) -> tuple[Polynomial, Polynomial]:
        excluded = (1,)
        included = (0, 1)  # the x for taking vertex
        for child in sorted(graph[vertex]):
            if child == parent:
                continue
            child_excluded, child_included = states(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, included

    excluded, included = states(root, -1)
    return add(excluded, included)


def forest_polynomial(graph: dict[int, set[int]]) -> Polynomial:
    unseen = set(graph)
    out = (1,)
    while unseen:
        root = min(unseen)
        stack = [root]
        component = set()
        while stack:
            vertex = stack.pop()
            if vertex in component:
                continue
            component.add(vertex)
            stack.extend(graph[vertex] - component)
        unseen -= component
        out = multiply(out, tree_polynomial(graph, root))
    return out


def delete_vertices(
    graph: dict[int, set[int]], deleted: set[int]
) -> dict[int, set[int]]:
    return {
        vertex: neighbors - deleted
        for vertex, neighbors in graph.items()
        if vertex not in deleted
    }


def is_unimodal(poly: Polynomial) -> tuple[bool, int]:
    peak = max(range(len(poly)), key=lambda i: poly[i])
    good = all(poly[i] <= poly[i + 1] for i in range(peak)) and all(
        poly[i] >= poly[i + 1] for i in range(peak, len(poly) - 1)
    )
    return good, peak


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branches", type=int, default=17)
    parser.add_argument("--isolates", type=int, default=3)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("boundary_sm3_second_split_counterexample_exact.json"),
    )
    args = parser.parse_args()
    m, isolates = args.branches, args.isolates
    if (m, isolates) != (17, 3):
        raise ValueError("the certified counterexample uses --branches 17 --isolates 3")

    # Closed formulas.
    branch_poly = (1, 3, 1)
    t_formula = add(power(branch_poly, m), shift(power((1, 1), 2 * m)))
    f_formula = multiply(t_formula, power((1, 1), isolates))
    h_formula = power(branch_poly, m)

    # Explicit graphs.  F=T_m union isolates.  Add p adjacent to the center
    # and all isolates, then add a pendant leaf ell at p to obtain G.
    f_graph, center = make_t_m(m)
    next_vertex = max(f_graph) + 1
    isolated_vertices = list(range(next_vertex, next_vertex + isolates))
    for vertex in isolated_vertices:
        f_graph[vertex] = set()
    p = next_vertex + isolates
    ell = p + 1
    t_graph = copy_graph(f_graph)
    t_graph[p] = set([center, *isolated_vertices])
    for neighbor in t_graph[p]:
        t_graph[neighbor].add(p)
    g_graph = copy_graph(t_graph)
    g_graph[ell] = {p}
    g_graph[p].add(ell)
    h_graph = delete_vertices(t_graph, {p, *t_graph[p]})

    f_dp = forest_polynomial(f_graph)
    h_dp = forest_polynomial(h_graph)
    t_dp = forest_polynomial(t_graph)
    g_dp = forest_polynomial(g_graph)
    assert f_dp == f_formula
    assert h_dp == h_formula
    assert t_dp == add(f_dp, shift(h_dp))
    assert g_dp == add(t_dp, shift(f_dp))

    beta = len(f_dp) - 1
    rank = (2 * beta) // 3
    assert beta == 38 and rank == 25
    assert len(t_dp) - 1 == beta

    second_margin = (
        3 * coeff(f_dp, rank + 1)
        + coeff(f_dp, rank)
        - coeff(f_dp, rank - 1)
    )
    pair_reserve = difference(f_dp, rank + 1) + difference(f_dp, rank)
    boundary = pair_reserve + difference(h_dp, rank)
    strengthened_boundary = boundary - coeff(f_dp, rank)
    unimodal, peak = is_unimodal(g_dp)

    assert coeff(h_dp, 24) == 3_136_893_890
    assert coeff(h_dp, 25) == 1_009_840_494
    assert difference(h_dp, 25) == -107_372_408
    assert coeff(f_dp, 24) == 126_425_113_970
    assert coeff(f_dp, 25) == 57_533_461_624
    assert coeff(f_dp, 26) == 22_850_730_982
    assert second_margin == -339_459_400
    assert boundary == 57_086_629_816
    assert strengthened_boundary == -446_831_808
    assert unimodal

    graph_edges = sorted(
        [u, v] for u in g_graph for v in g_graph[u] if u < v
    )
    report = {
        "status": "COUNTEREXAMPLE_TO_SECOND_CONDITIONAL_SPLIT_NOT_TO_BOUNDARY_SM3",
        "construction": {
            "branches": m,
            "isolates_in_F": isolates,
            "orders": {
                "F": len(f_graph), "T": len(t_graph), "G": len(g_graph), "H": len(h_graph)
            },
            "center": center,
            "p": p,
            "pendant_leaf": ell,
            "neighbors_of_p": sorted(t_graph[p]),
            "G_edges": graph_edges,
            "G_edges_sha256": hashlib.sha256(
                json.dumps(graph_edges, separators=(",", ":")).encode("ascii")
            ).hexdigest(),
        },
        "parameters": {"beta": beta, "rank": rank},
        "coefficients": {
            "H_24": coeff(h_dp, 24), "H_25": coeff(h_dp, 25),
            "F_24": coeff(f_dp, 24), "F_25": coeff(f_dp, 25),
            "F_26": coeff(f_dp, 26),
        },
        "margins": {
            "D_25_H": difference(h_dp, rank),
            "second_conditional_margin": second_margin,
            "D_26_F_plus_D_25_F": pair_reserve,
            "Boundary_SM3_margin": boundary,
            "strong_single_target_margin": strengthened_boundary,
        },
        "checks": {
            "formula_equals_graph_DP_for_F": f_dp == f_formula,
            "formula_equals_graph_DP_for_H": h_dp == h_formula,
            "alpha_T_equals_alpha_F": len(t_dp) - 1 == beta,
            "negative_closed_row_condition": difference(h_dp, rank) < 0,
            "second_conditional_split_fails": second_margin < 0,
            "Boundary_SM3_survives": boundary >= 0,
            "strong_single_target_fails": strengthened_boundary < 0,
            "G_independence_polynomial_unimodal": unimodal,
            "G_peak_rank": peak,
        },
        "polynomial_sha256": {
            name: hashlib.sha256(
                json.dumps(list(poly), separators=(",", ":")).encode("ascii")
            ).hexdigest()
            for name, poly in (("F", f_dp), ("H", h_dp), ("T", t_dp), ("G", g_dp))
        },
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
