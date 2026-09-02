#!/usr/bin/env python3
"""Exact nested-leaf probe for the ISO leaf mixed remainder.

For a distinguished leaf ell of F, define

    D_r(F,ell)=Q_r(F)-Q_r(F-ell)-Q_{r-1}(F-{ell,v}),

where v supports ell.  For another leaf w with support u, this audits

    D_r(F,ell)-D_r(F-w,ell)-D_{r-1}(F-{w,u},ell) >= 0

when the lower distinguished leaf survives.  In the sibling-support case
u=v the lower term is omitted.  This is an exact diagnostic, not a proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6, iso, poly_forest


def leaf_remainder(g: nx.Graph, ell: int, r: int) -> int:
    if ell not in g or g.degree(ell) != 1:
        raise ValueError("distinguished vertex is not a leaf")
    v = next(iter(g.neighbors(ell)))
    a = g.copy()
    a.remove_node(ell)
    c = g.copy()
    c.remove_nodes_from([ell, v])
    return iso(poly_forest(g), r) - iso(poly_forest(a), r) - iso(poly_forest(c), r - 1)


def leaf_remainder_vector(g: nx.Graph, ell: int) -> list[int]:
    if ell not in g or g.degree(ell) != 1:
        raise ValueError("distinguished vertex is not a leaf")
    v = next(iter(g.neighbors(ell)))
    a = g.copy()
    a.remove_node(ell)
    c = g.copy()
    c.remove_nodes_from([ell, v])
    pg, pa, pc = poly_forest(g), poly_forest(a), poly_forest(c)
    return [iso(pg, r) - iso(pa, r) - iso(pc, r - 1) for r in range(len(pg))]


def audit(g: nx.Graph, summary: dict, records: list[dict]) -> None:
    p = poly_forest(g)
    alpha = len(p) - 1
    leaves = [v for v in g if g.degree(v) == 1]
    for ell in leaves:
        full_vector = leaf_remainder_vector(g, ell)
        support = next(iter(g.neighbors(ell)))
        for w in leaves:
            if w == ell:
                continue
            u = next(iter(g.neighbors(w)))
            # Deleting w must leave the distinguished leaf intact.
            h = g.copy()
            h.remove_node(w)
            if ell not in h or h.degree(ell) != 1:
                continue
            sibling = u == support
            deleted_vector = leaf_remainder_vector(h, ell)
            q = None
            if not sibling:
                q = g.copy()
                q.remove_nodes_from([w, u])
                if ell not in q or q.degree(ell) != 1:
                    continue
            lower_vector = leaf_remainder_vector(q, ell) if q is not None else None
            for r in range(2, alpha):
                value = full_vector[r] - (deleted_vector[r] if r < len(deleted_vector) else 0)
                lower = 0
                if lower_vector is not None and r >= 3:
                    lower = lower_vector[r - 1] if r - 1 < len(lower_vector) else 0
                    value -= lower
                summary["checks"] += 1
                if sibling:
                    summary["sibling_checks"] += 1
                else:
                    summary["separated_checks"] += 1
                if value < 0:
                    summary["negatives"] += 1
                old = summary.get("minimum")
                if old is None or value < old["value"]:
                    summary["minimum"] = {
                        "value": value,
                        "n": len(g),
                        "r": r,
                        "ell": int(ell),
                        "support": int(support),
                        "w": int(w),
                        "w_support": int(u),
                        "sibling": sibling,
                        "lower": lower,
                        "D_full": full_vector[r],
                        "D_deleted": deleted_vector[r] if r < len(deleted_vector) else 0,
                        "graph6": graph6(nx.convert_node_labels_to_integers(g)),
                        "polynomial": p,
                    }
                if value < 0 and len(records) < 50:
                    records.append(summary["minimum"].copy())

        # Isolate pruning uses the same graph at the lower rank.
        for w in [x for x in g if g.degree(x) == 0]:
            h = g.copy()
            h.remove_node(w)
            deleted_vector = leaf_remainder_vector(h, ell)
            for r in range(2, alpha):
                d0 = deleted_vector[r] if r < len(deleted_vector) else 0
                lower = deleted_vector[r - 1] if r >= 3 and r - 1 < len(deleted_vector) else 0
                value = full_vector[r] - d0 - lower
                summary["checks"] += 1
                summary["isolate_checks"] += 1
                if value < 0:
                    summary["negatives"] += 1
                old = summary.get("minimum")
                if old is None or value < old["value"]:
                    summary["minimum"] = {
                        "value": value,
                        "n": len(g),
                        "r": r,
                        "ell": int(ell),
                        "support": int(support),
                        "w": int(w),
                        "kind": "isolate",
                        "lower": lower,
                        "D_full": full_vector[r],
                        "D_deleted": d0,
                        "graph6": graph6(nx.convert_node_labels_to_integers(g)),
                        "polynomial": p,
                    }
                if value < 0 and len(records) < 50:
                    records.append(summary["minimum"].copy())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=11)
    args = parser.parse_args()
    summary = {
        "checks": 0,
        "sibling_checks": 0,
        "separated_checks": 0,
        "isolate_checks": 0,
        "negatives": 0,
        "max_n": args.max_n,
    }
    records: list[dict] = []
    for n in range(3, args.max_n + 1):
        for g in nx.nonisomorphic_trees(n):
            audit(g, summary, records)
    for g in nx.graph_atlas_g():
        if len(g) >= 3 and nx.is_forest(g):
            audit(g, summary, records)
    report = {
        "marker": "PROBE_EXACT_ISO_NESTED_LEAF_REMAINDER",
        "summary": summary,
        "negative_records": records,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_nested_leaf_remainder_probe_root_20260829.json").write_text(raw, encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print("PROBE_EXACT_ISO_NESTED_LEAF_REMAINDER")


if __name__ == "__main__":
    main()
