#!/usr/bin/env python3
"""Find the first tree/root where I(T) and I(T-v) are not partially synced."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import networkx as nx

PUBLIC = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC))
from indpoly import independence_poly  # noqa: E402

from toeplitz_pair_closure_search import partial_failure  # noqa: E402


def adjacency(graph: nx.Graph) -> list[list[int]]:
    return [sorted(graph.neighbors(v)) for v in range(len(graph))]


def delete_vertex(adj: list[list[int]], removed: int) -> list[list[int]]:
    keep = [v for v in range(len(adj)) if v != removed]
    renumber = {v: i for i, v in enumerate(keep)}
    return [
        [renumber[u] for u in adj[v] if u != removed]
        for v in keep
    ]


def edges(adj: list[list[int]]) -> list[list[int]]:
    return [
        [v, u]
        for v, nbrs in enumerate(adj)
        for u in nbrs
        if v < u
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-n", type=int, default=18)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("tree_deletion_partial_sync_first_failure.json"),
    )
    args = parser.parse_args()
    checked_trees = 0
    checked_roots = 0
    first = None
    first_prefix = None
    for n in range(2, args.max_n + 1):
        for rank, graph in enumerate(nx.generators.nonisomorphic_trees(n), start=1):
            checked_trees += 1
            adj = adjacency(graph)
            t = independence_poly(n, adj)
            for v in range(n):
                checked_roots += 1
                e_adj = delete_vertex(adj, v)
                e = independence_poly(n - 1, e_adj)
                failure = partial_failure(t, e)
                if failure is None:
                    continue
                alpha = len(t) - 1
                tail_start = (2 * alpha + 1) // 3
                item = {
                    "n": n,
                    "tree_rank": rank,
                    "root": v,
                    "degrees": [len(nbrs) for nbrs in adj],
                    "root_degree": len(adj[v]),
                    "degree_two_count": sum(len(nbrs) == 2 for nbrs in adj),
                    "edges": edges(adj),
                    "T": t,
                    "E": e,
                    "alpha": alpha,
                    "tail_start": tail_start,
                    **failure,
                }
                if first is None:
                    first = item
                if max(failure["m"], failure["n"]) < tail_start:
                    first_prefix = item
                    break
            if first_prefix is not None:
                break
        print(
            f"n={n} trees={checked_trees} roots={checked_roots} "
            f"first_full={first is not None} first_prefix={first_prefix is not None}",
            flush=True,
        )
        if first_prefix is not None:
            break
    report = {
        "max_n_completed": n,
        "checked_trees": checked_trees,
        "checked_roots": checked_roots,
        "first_full_failure": first,
        "first_prefix_failure": first_prefix,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
