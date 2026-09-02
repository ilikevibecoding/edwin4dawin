#!/usr/bin/env python3
"""Exact replay for the addability-covariance form of the ISO inequality.

For a forest (indeed, for every graph) and a fixed rank k, let

    N = i_k,
    a_v = #{independent k-sets A : A union {v} is independent},
    J_uv = #{independent k-sets A : u and v are both addable to A}.

All vertex-pair sums below are over UNORDERED pairs.  Put

    q = sum_{uv nonedge} (N J_uv - a_u a_v),
    S0 = sum_v a_v^2,
    S1 = sum_{uv edge} a_u a_v.

The script verifies the two elementary double counts and the exact identity

    S0 + 2 S1 + (k+1) N^2 - 2q
      = (k+1)[(k+1)i_{k+1}^2+i_k^2-(k+2)i_k i_{k+2}].

Thus ISO at r=k+1 is equivalent to the covariance budget on the left.
The identity is graph-general; forest structure is needed only to prove its
nonnegativity in the required range.
"""

from __future__ import annotations

import hashlib
import json
from itertools import combinations
from pathlib import Path

import networkx as nx


def independent_masks(G: nx.Graph) -> list[list[int]]:
    n = G.number_of_nodes()
    edge_masks = [(1 << u) | (1 << v) for u, v in G.edges()]
    by_rank: list[list[int]] = [[] for _ in range(n + 1)]
    for mask in range(1 << n):
        if all(mask & em != em for em in edge_masks):
            by_rank[mask.bit_count()].append(mask)
    return by_rank


def audit_graph(G: nx.Graph) -> tuple[int, int]:
    G = nx.convert_node_labels_to_integers(G)
    n = G.number_of_nodes()
    adj = [0] * n
    for u, v in G.edges():
        adj[u] |= 1 << v
        adj[v] |= 1 << u
    by_rank = independent_masks(G)
    p = [len(row) for row in by_rank]

    cells = 0
    positive_iso = 0
    for k in range(n + 1):
        N = p[k]
        if N == 0:
            continue
        sets = by_rank[k]
        a = [0] * n
        J = [[0] * n for _ in range(n)]
        for mask in sets:
            addable = [v for v in range(n) if not (mask & (1 << v)) and not (mask & adj[v])]
            for v in addable:
                a[v] += 1
            for u, v in combinations(addable, 2):
                J[u][v] += 1

        d1 = sum(a)
        s0 = sum(x * x for x in a)
        s1 = sum(a[u] * a[v] for u, v in G.edges())
        q = 0
        sum_J_nonedge = 0
        for u, v in combinations(range(n), 2):
            if not G.has_edge(u, v):
                sum_J_nonedge += J[u][v]
                q += N * J[u][v] - a[u] * a[v]

        pk1 = p[k + 1] if k + 1 <= n else 0
        pk2 = p[k + 2] if k + 2 <= n else 0
        assert d1 == (k + 1) * pk1
        assert 2 * sum_J_nonedge == (k + 1) * (k + 2) * pk2

        iso = (k + 1) * pk1 * pk1 + N * N - (k + 2) * N * pk2
        covariance_budget = s0 + 2 * s1 + (k + 1) * N * N - 2 * q
        assert covariance_budget == (k + 1) * iso
        cells += 1
        positive_iso += iso >= 0
    return cells, positive_iso


def graph_suite() -> list[tuple[str, nx.Graph]]:
    suite: list[tuple[str, nx.Graph]] = []
    # Every graph in the NetworkX atlas (orders at most seven), including
    # nonforests as graph-general identity controls.
    for idx, G in enumerate(nx.graph_atlas_g()):
        suite.append((f"atlas_{idx}", G))
    # Every nonisomorphic tree through order 11.
    for n in range(2, 12):
        for idx, G in enumerate(nx.generators.nonisomorphic_trees(n)):
            suite.append((f"tree_{n}_{idx}", G))
    # A deterministic collection of disconnected forests made from pairs of
    # small nonisomorphic trees, plus isolated vertices.
    small_trees: list[nx.Graph] = [nx.empty_graph(1)]
    for n in range(2, 7):
        small_trees.extend(nx.generators.nonisomorphic_trees(n))
    for i, A in enumerate(small_trees):
        for j, B in enumerate(small_trees[i:], start=i):
            if A.number_of_nodes() + B.number_of_nodes() <= 11:
                suite.append((f"forest_pair_{i}_{j}", nx.disjoint_union(A, B)))
    # Deterministic larger nonforest stress controls.  These are not needed
    # for the identity proof; they help detect whether observed ISO positivity
    # is merely a small-order accident.
    for n in range(8, 15):
        for density_index, density in enumerate((0.12, 0.25, 0.4, 0.6, 0.8)):
            for seed in range(8):
                suite.append(
                    (
                        f"gnp_{n}_{density_index}_{seed}",
                        nx.gnp_random_graph(n, density, seed=10000 * n + 100 * density_index + seed),
                    )
                )
    # Bipartite stress controls (the theorem target is the much smaller class
    # of forests).  Include complete bipartite graphs and deterministic random
    # bipartite graphs with unbalanced sides.
    for left in range(1, 9):
        for right in range(1, 9):
            if left + right <= 14:
                suite.append((f"K_{left}_{right}", nx.complete_bipartite_graph(left, right)))
                for density_index, density in enumerate((0.15, 0.35, 0.6, 0.85)):
                    for seed in range(4):
                        suite.append(
                            (
                                f"bip_{left}_{right}_{density_index}_{seed}",
                                nx.bipartite.random_graph(
                                    left,
                                    right,
                                    density,
                                    seed=100000 * left + 1000 * right + 100 * density_index + seed,
                                ),
                            )
                        )
    return suite


def main() -> None:
    total_graphs = 0
    total_cells = 0
    iso_nonnegative_cells = 0
    forest_graphs = 0
    nonforest_graphs = 0
    for _name, G in graph_suite():
        cells, positive = audit_graph(G)
        total_graphs += 1
        total_cells += cells
        iso_nonnegative_cells += positive
        if G.number_of_nodes() == 0 or nx.is_forest(G):
            forest_graphs += 1
        else:
            nonforest_graphs += 1

    source = Path(__file__).read_bytes()
    report = {
        "marker": "PASS_EXACT_ISO_ADDABILITY_COVARIANCE_EQUIVALENCE",
        "pair_convention": "all edge and nonedge pairs are unordered",
        "identity_scope": "all finite simple graphs and all ranks k",
        "proof_double_counts": [
            "sum_v a_v = (k+1)i_(k+1)",
            "2 sum_{uv nonedge} J_uv = (k+1)(k+2)i_(k+2)",
            "2 sum_{uv nonedge} a_u a_v = (sum_v a_v)^2-S0-2S1",
        ],
        "exact_identity": "S0+2S1+(k+1)N^2-2q=(k+1)((k+1)i_(k+1)^2+i_k^2-(k+2)i_k i_(k+2))",
        "graphs_replayed": total_graphs,
        "forest_graphs_replayed": forest_graphs,
        "nonforest_graphs_replayed": nonforest_graphs,
        "rank_cells_replayed": total_cells,
        "iso_nonnegative_cells_observed": iso_nonnegative_cells,
        "source_sha256": hashlib.sha256(source).hexdigest().upper(),
    }
    out = Path("iso_addability_covariance_exact_root_20260829.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
