#!/usr/bin/env python3
"""Verify the exact rank-4 leaf-curvature identities on finite trees.

For a tree T on n vertices, write

    S = sum_v binom(deg(v), 2),
    R = number of connected 3-edge subsets,
    H = number of 3-edge stars,
    W = number of connected 4-edge subsets.

The first five independent-set coefficients are determined by these
statistics.  If a new leaf is attached at p, of old degree d, then

    S+ = S + d,
    R+ = R + Z,
    H+ = H + binom(d, 2),
    W+ = W + Y,

where Z and Y have exact local degree formulas below.  This script:

* proves the coefficient and curvature identities symbolically;
* verifies the local Z,Y formulas against direct edge-subset enumeration;
* exhaustively checks all unlabeled trees through a requested order;
* records the exact minima of C_4 and of its leaf increment.

It is a finite identity/evidence certificate, not a proof of rank-4
monotonicity for trees of arbitrary order.
"""

from __future__ import annotations

import argparse
import json
import time
from itertools import combinations
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def choose(n: int, k: int) -> int:
    return comb(n, k) if n >= k >= 0 else 0


def subset_vertices(edges: tuple, subset: tuple[int, ...]) -> set[int]:
    vertices: set[int] = set()
    for index in subset:
        vertices.update(edges[index])
    return vertices


def connected_profiles(
    tree: nx.Graph,
) -> tuple[int, int, dict[int, int], dict[int, int]]:
    """Return R,W and direct local Z,Y counts.

    Every selected edge subgraph of a tree is a forest.  A k-edge subset
    is connected exactly when it has k+1 incident vertices.  A connected
    subset contributes to the local count at p exactly when p is one of
    those incident vertices.
    """
    edges = tuple(tree.edges())
    z_by_vertex = {v: 0 for v in tree}
    y_by_vertex = {v: 0 for v in tree}
    for subset in combinations(range(len(edges)), 2):
        vertices = subset_vertices(edges, subset)
        if len(vertices) == 3:
            for vertex in vertices:
                z_by_vertex[vertex] += 1
    R = 0
    for subset in combinations(range(len(edges)), 3):
        vertices = subset_vertices(edges, subset)
        if len(vertices) == 4:
            R += 1
            for vertex in vertices:
                y_by_vertex[vertex] += 1
    W = sum(
        len(subset_vertices(edges, subset)) == 5
        for subset in combinations(range(len(edges)), 4)
    )
    return R, W, z_by_vertex, y_by_vertex


def tree_statistics(
    tree: nx.Graph,
) -> tuple[int, int, int, int, dict[int, int], dict[int, int]]:
    degrees = dict(tree.degree())
    S = sum(choose(value, 2) for value in degrees.values())
    R, W, z_by_vertex, y_by_vertex = connected_profiles(tree)
    H = sum(choose(value, 3) for value in degrees.values())
    return S, R, H, W, z_by_vertex, y_by_vertex


def local_Z(tree: nx.Graph, p: int) -> int:
    d = tree.degree(p)
    return choose(d, 2) + sum(tree.degree(u) - 1 for u in tree[p])


def local_Y(tree: nx.Graph, p: int) -> int:
    """Connected 3-edge subsets containing an edge incident with p."""
    d = tree.degree(p)
    neighbors = list(tree[p])
    stars_at_p = choose(d, 3)
    stars_at_neighbor = sum(
        choose(tree.degree(u) - 1, 2) for u in neighbors
    )
    paths_with_p_internal = (d - 1) * sum(
        tree.degree(u) - 1 for u in neighbors
    )
    paths_with_p_endpoint = sum(
        tree.degree(v) - 1
        for u in neighbors
        for v in tree[u]
        if v != p
    )
    return (
        stars_at_p
        + stars_at_neighbor
        + paths_with_p_internal
        + paths_with_p_endpoint
    )


def coefficient_formulas(
    n: int, S: int, R: int, H: int, W: int
) -> tuple[int, int, int, int]:
    e = n - 1
    i2 = choose(n, 2) - e
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    Q = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - Q
        + W
    )
    return i2, i3, i4, i5


def rank4_curvature_from_coefficients(coefficients: tuple[int, ...] | list[int]) -> int:
    def c(k: int) -> int:
        return coefficients[k] if 0 <= k < len(coefficients) else 0

    return 576 * c(4) ** 2 - 720 * c(3) * c(5)


def symbolic_certificate() -> dict[str, str]:
    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", integer=True
    )
    e = n - 1

    def C(a, b):
        return sp.prod(a - j for j in range(b)) / sp.factorial(b)

    i3 = C(n, 3) - e * (n - 2) + S
    i4 = C(n, 4) - e * C(n - 2, 2) + S * (n - 4) + C(e, 2) - R
    Q = S * (e - 2) - 2 * R - H
    i5 = (
        C(n, 5)
        - e * C(n - 2, 3)
        + S * C(n - 3, 2)
        + (C(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - Q
        + W
    )
    expanded_i5 = sp.factor(i5)
    expected_i5 = (
        120 * H
        - 120 * R * n
        + 720 * R
        + 60 * S * n**2
        - 660 * S * n
        + 1560 * S
        + 120 * W
        + n**5
        - 30 * n**4
        + 295 * n**3
        - 1170 * n**2
        + 1864 * n
        - 960
    ) / 120
    assert sp.expand(expanded_i5 - expected_i5) == 0

    C4 = sp.expand(576 * i4**2 - 720 * i3 * i5)
    substitutions = {
        n: n + 1,
        S: S + d,
        R: R + Z,
        H: H + C(d, 2),
        W: W + Y,
    }
    delta = sp.factor(C4.xreplace(substitutions) - C4)
    # xreplace is simultaneous, so this is the intended old-to-new update.
    assert sp.Poly(delta, n, S, R, H, W, d, Z, Y).total_degree() == 6
    return {
        "i5": str(sp.factor(expected_i5)),
        "C4": str(sp.factor(C4)),
        "leaf_delta_over_144": str(sp.factor(delta / 144)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-order", type=int, default=1)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument(
        "--direct-update-max-order",
        type=int,
        default=10,
        help=(
            "Directly enumerate the extended tree's statistics through "
            "this old-tree order; larger orders use the proved update."
        ),
    )
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    started = time.time()
    symbolic = symbolic_certificate()
    totals = {
        "trees": 0,
        "leaf_attachments": 0,
        "coefficient_identity_checks": 0,
        "local_update_identity_checks": 0,
        "negative_rank4_curvatures": 0,
        "negative_rank4_leaf_increments": 0,
    }
    per_order = []
    first_negative_curvature = None
    first_negative_increment = None

    for n in range(args.min_order, args.max_order + 1):
        if n == 1:
            trees = [nx.empty_graph(1)]
        elif n == 2:
            trees = [nx.path_graph(2)]
        else:
            trees = nx.nonisomorphic_trees(n)
        order_trees = 0
        minimum_curvature = None
        minimum_curvature_witness = None
        minimum_increment = None
        minimum_increment_witness = None

        for tree_index, tree in enumerate(trees):
            order_trees += 1
            totals["trees"] += 1
            code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            full = tuple(ip.polynomial((1 << n) - 1))
            S, R, H, W, direct_Z, direct_Y = tree_statistics(tree)
            formulas = coefficient_formulas(n, S, R, H, W)
            direct = tuple(full[k] if k < len(full) else 0 for k in range(2, 6))
            assert formulas == direct, (
                "coefficient identity failed",
                n,
                tree_index,
                code,
                formulas,
                direct,
            )
            totals["coefficient_identity_checks"] += 1

            curvature = rank4_curvature_from_coefficients(full)
            if curvature < 0:
                totals["negative_rank4_curvatures"] += 1
                if first_negative_curvature is None:
                    first_negative_curvature = {
                        "order": n,
                        "tree_index": tree_index,
                        "graph6": code,
                        "curvature": curvature,
                        "independence_coefficients": full,
                        "statistics": [S, R, H, W],
                    }
            if minimum_curvature is None or curvature < minimum_curvature:
                minimum_curvature = curvature
                minimum_curvature_witness = {
                    "tree_index": tree_index,
                    "graph6": code,
                    "independence_coefficients": full,
                    "statistics": [S, R, H, W],
                }

            for p in tree:
                d = tree.degree(p)
                Z = local_Z(tree, p)
                Y = local_Y(tree, p)
                assert Z == direct_Z[p], (
                    "local Z identity failed",
                    n,
                    tree_index,
                    code,
                    p,
                    Z,
                    direct_Z[p],
                )
                assert Y == direct_Y[p], (
                    "local Y identity failed",
                    n,
                    tree_index,
                    code,
                    p,
                    Y,
                    direct_Y[p],
                )

                S1, R1, H1, W1 = (
                    S + d,
                    R + Z,
                    H + choose(d, 2),
                    W + Y,
                )
                if n <= args.direct_update_max_order:
                    extended = tree.copy()
                    leaf = n
                    extended.add_edge(p, leaf)
                    direct_stats = tree_statistics(extended)[:4]
                    assert direct_stats == (S1, R1, H1, W1), (
                        "statistic update identity failed",
                        n,
                        tree_index,
                        code,
                        p,
                        direct_stats,
                        (S1, R1, H1, W1),
                    )
                totals["local_update_identity_checks"] += 1

                without_p = tuple(
                    ip.polynomial(
                        ((1 << n) - 1) ^ (1 << ip.position[p])
                    )
                )
                extended_ip = list(full)
                if len(extended_ip) < len(without_p) + 1:
                    extended_ip.extend(
                        [0] * (len(without_p) + 1 - len(extended_ip))
                    )
                for k, value in enumerate(without_p):
                    extended_ip[k + 1] += value

                formula_extended = coefficient_formulas(
                    n + 1, S1, R1, H1, W1
                )
                direct_extended = tuple(
                    extended_ip[k] if k < len(extended_ip) else 0
                    for k in range(2, 6)
                )
                assert formula_extended == direct_extended

                new_curvature = rank4_curvature_from_coefficients(extended_ip)
                increment = new_curvature - curvature
                totals["leaf_attachments"] += 1
                if increment < 0:
                    totals["negative_rank4_leaf_increments"] += 1
                    if first_negative_increment is None:
                        first_negative_increment = {
                            "old_order": n,
                            "tree_index": tree_index,
                            "graph6": code,
                            "attachment_vertex": p,
                            "attachment_degree": d,
                            "old_curvature": curvature,
                            "new_curvature": new_curvature,
                            "increment": increment,
                            "old_coefficients": full,
                            "new_coefficients": extended_ip,
                            "old_statistics": [S, R, H, W],
                            "local_statistics": [Z, Y],
                        }
                if minimum_increment is None or increment < minimum_increment:
                    minimum_increment = increment
                    minimum_increment_witness = {
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment_vertex": p,
                        "attachment_degree": d,
                        "old_curvature": curvature,
                        "new_curvature": new_curvature,
                        "old_coefficients": full,
                        "new_coefficients": extended_ip,
                        "old_statistics": [S, R, H, W],
                        "local_statistics": [Z, Y],
                    }

        row = {
            "order": n,
            "trees": order_trees,
            "minimum_rank4_curvature": minimum_curvature,
            "minimum_rank4_curvature_witness": minimum_curvature_witness,
            "minimum_rank4_leaf_increment": minimum_increment,
            "minimum_rank4_leaf_increment_witness": minimum_increment_witness,
        }
        per_order.append(row)
        print(
            f"n={n} trees={order_trees} "
            f"min_C4={minimum_curvature} min_delta={minimum_increment}",
            flush=True,
        )

    payload = {
        "claim_scope": (
            "Exact identities plus exhaustive finite verification; "
            "not an arbitrary-order proof."
        ),
        "min_order_old_tree": args.min_order,
        "max_order_old_tree": args.max_order,
        "direct_update_max_order": args.direct_update_max_order,
        "totals": totals,
        "first_negative_rank4_curvature": first_negative_curvature,
        "first_negative_rank4_leaf_increment": first_negative_increment,
        "symbolic_formulas": symbolic,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    if args.out:
        args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    assert first_negative_curvature is None
    assert first_negative_increment is None
    print("rank-4 leaf-curvature finite identity certificate: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
