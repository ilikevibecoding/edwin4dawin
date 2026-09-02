#!/usr/bin/env python3
"""Probe whether some leaf has a nonnegative ISO cross remainder.

For P=A+xC and Q_r the ISO quadratic, the exact cross is
Q_r(P)-Q_r(A)-Q_(r-1)(C).  This diagnostic records the best leaf at
each strict-prefix row, along with WR-compensated variants.  Evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest, iso, wr, cutoff


def graph_code(graph: nx.Graph) -> str | None:
    return nx.to_graph6_bytes(graph, header=False).decode().strip() if nx.is_connected(graph) else None


def audit(graph: nx.Graph, tag: str, summary: dict) -> bool:
    p = poly_forest(graph)
    alpha = len(p) - 1
    leaves = [vertex for vertex in graph if graph.degree(vertex) == 1]
    for rank in range(2, cutoff(alpha)):
        rows = []
        for leaf in leaves:
            parent = next(iter(graph[leaf]))
            agraph = graph.copy()
            agraph.remove_node(leaf)
            cgraph = graph.copy()
            cgraph.remove_nodes_from((leaf, parent))
            a = poly_forest(agraph)
            c = poly_forest(cgraph)
            cross = iso(p, rank) - iso(a, rank) - iso(c, rank - 1)
            rows.append({
                "leaf": leaf,
                "support": parent,
                "cross": cross,
                "cross_plus_wr_a": cross + wr(a, rank),
                "cross_plus_wr_c": cross + wr(c, rank - 1),
                "cross_plus_both_wr": cross + wr(a, rank) + wr(c, rank - 1),
                "cross_plus_iso_a": cross + iso(a, rank),
                "cross_plus_iso_c": cross + iso(c, rank - 1),
            })
        if not rows:
            continue
        summary["checks"] += 1
        for field in (
            "cross", "cross_plus_wr_a", "cross_plus_wr_c", "cross_plus_both_wr",
            "cross_plus_iso_a", "cross_plus_iso_c",
        ):
            best = max(rows, key=lambda row: row[field])
            key = f"min_best_{field}"
            record = {
                "value": best[field], "field": field, "tag": tag,
                "order": len(graph), "alpha": alpha, "rank": rank,
                "graph6": graph_code(graph), "edges": sorted(tuple(sorted(e)) for e in graph.edges()) if len(graph) <= 30 else None,
                "best_leaf": best, "P": p,
            }
            if key not in summary or record["value"] < summary[key]["value"]:
                summary[key] = record
            if best[field] < 0:
                summary[f"negative_best_{field}"] = summary.get(f"negative_best_{field}", 0) + 1
                if field == "cross" and summary.get("first_failure") is None:
                    summary["first_failure"] = record
        summary["stream"].update(f"{tag}|{rank}|{[(row['leaf'],row['cross']) for row in rows]}\n".encode())
    return summary.get("first_failure") is None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-max", type=int, default=15)
    parser.add_argument("--random", type=int, default=2000)
    parser.add_argument("--random-max", type=int, default=100)
    parser.add_argument("--seed", type=int, default=99320260829)
    args = parser.parse_args()
    summary = {"checks": 0, "first_failure": None, "stream": hashlib.sha256()}
    trees = 0
    for order in range(2, args.tree_max + 1):
        for index, graph in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            audit(graph, f"tree{order}:{index}", summary)
    rng = random.Random(args.seed)
    for index in range(args.random):
        order = rng.randint(2, args.random_max)
        graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 30))
        audit(graph, f"random{index}", summary)
    digest = summary.pop("stream").hexdigest().upper()
    report = {
        "status": "FAIL_BEST_LEAF_BARE" if summary["first_failure"] else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "finite selector diagnostic only; no theorem claim",
        "tree_max_order": args.tree_max,
        "trees": trees,
        "random_trees": args.random,
        **summary,
        "stream_sha256": digest,
    }
    Path("iso_leaf_selector_probe_agent_20260829.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
