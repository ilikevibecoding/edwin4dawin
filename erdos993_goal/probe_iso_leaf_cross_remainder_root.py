#!/usr/bin/env python3
"""Exact probe of leaf-deletion decompositions for the forest ISO reserve.

For a leaf ell with neighbour v, write

    P = I(F) = A + x C,
    A = I(F-ell),
    C = I(F-{ell,v}).

The script audits the exact mixed remainder

    D_r = Q_r(P) - Q_r(A) - Q_{r-1}(C),

where Q_r(p)=r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}.
It also records several WR-compensated variants.  This is a diagnostic,
not a proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, x in enumerate(a):
        out[i] += x
    for i, x in enumerate(b):
        out[i] += x
    return out


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def poly_forest(g: nx.Graph) -> list[int]:
    """Independence polynomial by exact rooted-forest dynamic programming."""
    total = [1]
    seen: set[int] = set()
    for root in g.nodes():
        if root in seen:
            continue
        parent = {root: None}
        order = [root]
        seen.add(root)
        for v in order:
            for w in g.neighbors(v):
                if w == parent[v]:
                    continue
                if w in parent:
                    raise ValueError("input is not a forest")
                parent[w] = v
                seen.add(w)
                order.append(w)
        excluded: dict[int, list[int]] = {}
        included: dict[int, list[int]] = {}
        for v in reversed(order):
            e = [1]
            inc = [0, 1]
            for w in g.neighbors(v):
                if parent.get(w) != v:
                    continue
                e = mul(e, add(excluded[w], included[w]))
                inc = mul(inc, excluded[w])
            excluded[v] = e
            included[v] = inc
        total = mul(total, add(excluded[root], included[root]))
    while len(total) > 1 and total[-1] == 0:
        total.pop()
    return total


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def iso(p: list[int], r: int) -> int:
    return (
        r * coeff(p, r) ** 2
        + coeff(p, r - 1) ** 2
        - (r + 1) * coeff(p, r - 1) * coeff(p, r + 1)
    )


def wr(p: list[int], r: int) -> int:
    return r * coeff(p, r) - coeff(p, r - 1)


def cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def graph6(g: nx.Graph) -> str:
    return nx.to_graph6_bytes(g, header=False).decode().strip()


def audit_graph(
    g: nx.Graph,
    records: list[dict],
    summary: dict,
    all_ranks: bool,
    leaf_limit: int | None = None,
) -> None:
    p = poly_forest(g)
    alpha = len(p) - 1
    leaves = [ell for ell in g.nodes() if g.degree(ell) == 1]
    if leaf_limit is not None:
        leaves = leaves[:leaf_limit]
    for ell in leaves:
        v = next(iter(g.neighbors(ell)))
        a_graph = g.copy()
        a_graph.remove_node(ell)
        c_graph = g.copy()
        c_graph.remove_nodes_from([ell, v])
        a = poly_forest(a_graph)
        c = poly_forest(c_graph)
        upper = alpha if all_ranks else cutoff(alpha)
        for r in range(2, upper):
            d = iso(p, r) - iso(a, r) - iso(c, r - 1)
            candidates = {
                "bare": d,
                "plus_wr_c": d + wr(c, r - 1),
                "plus_wr_a": d + wr(a, r),
                "plus_both_wr": d + wr(c, r - 1) + wr(a, r),
                "plus_c_rminus1_sq": d + wr(c, r - 1) ** 2,
            }
            summary["checks"] += 1
            for name, value in candidates.items():
                key = f"min_{name}"
                old = summary.get(key)
                if old is None or value < old["value"]:
                    summary[key] = {
                        "value": value,
                        "n": g.number_of_nodes(),
                        "r": r,
                        "leaf": int(ell),
                        "support": int(v),
                        "graph6": graph6(nx.convert_node_labels_to_integers(g)),
                        "P": p,
                        "A": a,
                        "C": c,
                        "D": d,
                        "wr_A": wr(a, r),
                        "wr_C": wr(c, r - 1),
                    }
                if value < 0:
                    summary[f"negative_{name}"] = summary.get(f"negative_{name}", 0) + 1
            if d < 0 and len(records) < 100:
                records.append(summary["min_bare"] | {"all_candidates": candidates})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=14)
    parser.add_argument("--random", type=int, default=2000)
    parser.add_argument("--random-n", type=int, default=30)
    parser.add_argument("--random-leaves", type=int, default=3)
    parser.add_argument("--all-ranks", action="store_true")
    args = parser.parse_args()

    summary: dict = {"checks": 0, "max_n": args.max_n, "random": args.random}
    records: list[dict] = []

    # All nonisomorphic connected trees.  Small disconnected forests are
    # supplied independently by the graph atlas below.
    for n in range(2, args.max_n + 1):
        for g in nx.nonisomorphic_trees(n):
            audit_graph(g, records, summary, args.all_ranks)

    for g in nx.graph_atlas_g():
        if g.number_of_nodes() >= 2 and nx.is_forest(g):
            audit_graph(g, records, summary, args.all_ranks)

    rng_seed = 9930829
    import random

    rng = random.Random(rng_seed)
    for _ in range(args.random):
        n = rng.randint(2, args.random_n)
        g = nx.random_labeled_tree(n, seed=rng.randrange(1 << 63))
        audit_graph(g, records, summary, args.all_ranks, args.random_leaves)
        # A disconnected forest stress: delete each tree edge independently
        # with probability 1/4, retaining the same vertex set.
        h = g.copy()
        h.remove_edges_from([edge for edge in list(h.edges()) if rng.random() < 0.25])
        audit_graph(h, records, summary, args.all_ranks, args.random_leaves)

    report = {
        "marker": "PROBE_EXACT_ISO_LEAF_CROSS_REMAINDER",
        "summary": summary,
        "first_negative_records": records,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    out = Path("iso_leaf_cross_remainder_probe_root_20260829.json")
    out.write_text(raw, encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print("PROBE_EXACT_ISO_LEAF_CROSS_REMAINDER")


if __name__ == "__main__":
    main()
