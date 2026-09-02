#!/usr/bin/env python3
"""Exact finite strata for the disconnected sum-16 structural slack.

For an active rooted tree pair P=T-u and H=T-N[u], put e=e(P),
q=sum_{v in N(u)} deg_P(v), and r=e-q.  Exactly |V(H)|=e and e(H)=r.
This probe compares the actual sum 16 with the formal edgeless-H row having
the same P and e.  It is finite reconnaissance, not an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_sum16_slack_strata_exploration_root_20260830.json"
MARKER = "EXPLORED_EXACT_ISO_N5_DISCONNECTED_SUM16_SLACK_STRATA_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def doubled_sum16(p, h):
    return (
        at(h, 1) * at(p, 3) - 6 * at(h, 1) * at(p, 5)
        + 2 * at(h, 2) * at(p, 2) - 2 * at(h, 2) * at(p, 4)
        + at(h, 3) * at(p, 1) + 8 * at(h, 3) * at(p, 3)
        - 2 * at(h, 4) * at(p, 2) - 6 * at(h, 5) * at(p, 1)
        + at(p, 1) * at(p, 4) - at(p, 1) * at(p, 5)
        - 6 * at(p, 1) * at(p, 6) + 3 * at(p, 2) * at(p, 3)
        - 8 * at(p, 2) * at(p, 5) + at(p, 3) ** 2
        + 6 * at(p, 3) * at(p, 4)
    )


def update(bucket, value, witness):
    bucket["checks"] += 1
    if value < 0:
        bucket["negative"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]:
        bucket["minimum"] = value
        bucket["witness"] = witness


def fresh():
    return {"checks": 0, "negative": 0, "minimum": None, "witness": None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-base-order", type=int, default=12)
    args = parser.parse_args()
    strata = {}
    totals = {"actual": fresh(), "edgeless_H": fresh(), "correction": fresh()}
    root_checks = 0
    for n in range(args.max_base_order + 1):
        tree_order = n + 1
        candidates = [nx.empty_graph(1)] if tree_order == 1 else nx.nonisomorphic_trees(tree_order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                root_checks += 1
                selected = set(tree.neighbors(root))
                p_graph = tree.copy()
                p_graph.remove_node(root)
                h_graph = tree.copy()
                h_graph.remove_nodes_from({root, *selected})
                p = tuple(poly_forest(p_graph))
                h = tuple(poly_forest(h_graph))
                components = len(selected)
                edges = n - components
                q = sum(p_graph.degree(vertex) for vertex in selected)
                slack = edges - q
                assert h_graph.number_of_nodes() == edges
                assert h_graph.number_of_edges() == slack
                edgeless = tuple(math.comb(edges, rank) if rank <= edges else 0 for rank in range(7))
                actual = doubled_sum16(p, h)
                boundary = doubled_sum16(p, edgeless)
                correction = actual - boundary
                witness = {
                    "base_order": n,
                    "tree_graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    "root": root,
                    "e": edges,
                    "q": q,
                    "r": slack,
                    "P": list(p[:7]),
                    "H": list(h[:6]),
                    "doubled_actual": actual,
                    "doubled_edgeless_H": boundary,
                    "doubled_correction": correction,
                }
                key = str(slack)
                if key not in strata:
                    strata[key] = {"actual": fresh(), "edgeless_H": fresh(), "correction": fresh()}
                for name, value in (("actual", actual), ("edgeless_H", boundary), ("correction", correction)):
                    update(strata[key][name], value, witness)
                    update(totals[name], value, witness)
                assert actual >= 0
    report = {
        "marker": MARKER,
        "base_orders": [0, args.max_base_order],
        "root_checks": root_checks,
        "identity": "r=e-q=e(H), |V(H)|=e",
        "quantities_are_doubled": True,
        "totals": totals,
        "strata_by_r": strata,
        "scope": "finite active-root sum16 reconnaissance only; no all-order theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "base_orders": report["base_orders"],
        "root_checks": root_checks,
        "total_summaries": {
            name: {key: row[key] for key in ("checks", "negative", "minimum")}
            for name, row in totals.items()
        },
        "strata": {
            key: {
                name: {field: row[field] for field in ("checks", "negative", "minimum")}
                for name, row in data.items()
            }
            for key, data in strata.items()
        },
    }, indent=2))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
