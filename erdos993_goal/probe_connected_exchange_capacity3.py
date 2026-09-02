"""Test a local capacity-three augmentation formulation of scaled-three.

For consecutive ranks r and r+1 of a tree, join independent sets S,T when
the induced graph on S triangle T is connected.  Such an edge is a single
alternating-tree exchange.  A matching of every r-set into three labelled
copies of the (r+1)-sets is a local combinatorial certificate of

    i_r <= 3 i_(r+1).

This script checks the certificate by exact integer max flow in the dangerous
prefix.  It is a bounded probe, not an all-order proof.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import networkx as nx


def independent_sets(g: nx.Graph, r: int) -> list[frozenset[int]]:
    out = []
    nodes = sorted(g.nodes())
    for comb in itertools.combinations(nodes, r):
        s = frozenset(comb)
        if all(not (u in s and v in s) for u, v in g.edges()):
            out.append(s)
    return out


def alpha_tree(g: nx.Graph) -> int:
    # Tree DP, sizes only.
    root = min(g.nodes())
    parent = {root: None}
    order = [root]
    for v in order:
        for w in g.neighbors(v):
            if w == parent[v]:
                continue
            parent[w] = v
            order.append(w)
    take, skip = {}, {}
    for v in reversed(order):
        children = [w for w in g.neighbors(v) if parent.get(w) == v]
        take[v] = 1 + sum(skip[w] for w in children)
        skip[v] = sum(max(take[w], skip[w]) for w in children)
    return max(take[root], skip[root])


def connected_exchange(g: nx.Graph, s: frozenset[int], t: frozenset[int]) -> bool:
    diff = s ^ t
    return len(diff) > 0 and nx.is_connected(g.subgraph(diff))


def capacity3_certificate(g: nx.Graph, r: int):
    left = independent_sets(g, r)
    right = independent_sets(g, r + 1)
    flow = nx.DiGraph()
    source, sink = ("source",), ("sink",)
    for i in range(len(left)):
        flow.add_edge(source, ("L", i), capacity=1)
    for j in range(len(right)):
        flow.add_edge(("R", j), sink, capacity=3)
    edge_count = 0
    left_degree = [0] * len(left)
    right_degree = [0] * len(right)
    for i, s in enumerate(left):
        for j, t in enumerate(right):
            if connected_exchange(g, s, t):
                flow.add_edge(("L", i), ("R", j), capacity=1)
                edge_count += 1
                left_degree[i] += 1
                right_degree[j] += 1
    value, _ = nx.maximum_flow(flow, source, sink, flow_func=nx.algorithms.flow.dinitz)
    return {
        "domain": len(left),
        "codomain": len(right),
        "exchange_edges": edge_count,
        "flow": int(value),
        "defect": len(left) - int(value),
        "min_left_degree": min(left_degree) if left_degree else 0,
        "max_right_degree": max(right_degree) if right_degree else 0,
        "degree_ratio_bound": bool(left_degree and 3 * min(left_degree) >= max(right_degree)),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=11)
    ap.add_argument("--output", type=Path, default=Path("connected_exchange_capacity3_probe.json"))
    args = ap.parse_args()
    totals = {"trees": 0, "rank_checks": 0, "failures": 0, "exchange_edges": 0,
              "degree_ratio_failures": 0}
    first_failure = None
    tightest = None
    for n in range(2, args.max_order + 1):
        for ti, g0 in enumerate(nx.generators.nonisomorphic_trees(n)):
            g = nx.convert_node_labels_to_integers(g0, ordering="sorted")
            totals["trees"] += 1
            alpha = alpha_tree(g)
            for target_rank in range(1, (2 * alpha) // 3 + 1):
                rec = capacity3_certificate(g, target_rank - 1)
                totals["rank_checks"] += 1
                totals["exchange_edges"] += rec["exchange_edges"]
                if not rec["degree_ratio_bound"]:
                    totals["degree_ratio_failures"] += 1
                slack = 3 * rec["codomain"] - rec["domain"]
                item = {
                    "n": n,
                    "tree_index": ti,
                    "alpha": alpha,
                    "target_rank": target_rank,
                    "slack": slack,
                    **rec,
                    "edges": sorted(tuple(sorted(e)) for e in g.edges()),
                }
                if tightest is None or slack < tightest["slack"]:
                    tightest = item
                if rec["defect"]:
                    totals["failures"] += 1
                    if first_failure is None:
                        first_failure = item
    status = "PASS_BOUNDED_LOCAL_CAPACITY3_NOT_PROOF" if not first_failure else "FAIL_LOCAL_CAPACITY3"
    report = {
        "status": status,
        "max_order": args.max_order,
        "totals": totals,
        "tightest_count_slack": tightest,
        "first_failure": first_failure,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
