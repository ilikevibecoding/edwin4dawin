#!/usr/bin/env python3
"""Probe a third-leaf recursion for the ISO four-minor remainder.

For a forest B and distinct marked vertices u,v, put E=I(B),
U=I(B-u), V=I(B-v), W=I(B-{u,v}).  The function N_r(B;u,v)
is the exact nonsibling nested-leaf remainder obtained after attaching
one leaf at each of u and v.  This script tests

    N_r(B;u,v)-N_r(B-z;u,v) >= N_{r-1}(B-{z,s};u,v)

for a third leaf z~s, omitting the lower term when s is marked.  This is
finite exact evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6, poly_forest


def coefficient(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def four_minor_vector(g: nx.Graph, u: int, v: int) -> list[int]:
    if u == v or u not in g or v not in g:
        raise ValueError("marks must be distinct vertices")
    gu = g.copy()
    gu.remove_node(u)
    gv = g.copy()
    gv.remove_node(v)
    guv = g.copy()
    guv.remove_nodes_from([u, v])
    e, a, b, c = map(poly_forest, [g, gu, gv, guv])
    out = []
    for r in range(len(e) + 2):
        value = (
            2 * r * coefficient(e, r) * coefficient(c, r - 2)
            - (r + 1) * coefficient(e, r + 1) * coefficient(c, r - 3)
            + coefficient(e, r - 1)
            * (2 * coefficient(c, r - 3) - (r + 1) * coefficient(c, r - 1))
            + coefficient(a, r)
            * (-(r + 1) * coefficient(b, r - 2) - coefficient(c, r - 3))
            + coefficient(a, r - 1)
            * (2 * r * coefficient(b, r - 1) + 2 * coefficient(c, r - 2))
            + coefficient(a, r - 2)
            * (
                -(r + 1) * coefficient(b, r)
                + 2 * coefficient(b, r - 2)
                - coefficient(c, r - 1)
            )
            - coefficient(b, r) * coefficient(c, r - 3)
            + 2 * coefficient(b, r - 1) * coefficient(c, r - 2)
            - coefficient(b, r - 2) * coefficient(c, r - 1)
        )
        out.append(value)
    return out


def audit_tree(g: nx.Graph, summary: dict, negatives: list[dict]) -> None:
    alpha = len(poly_forest(g)) - 1
    leaves = [z for z in g if g.degree(z) == 1]
    for u in g:
        for v in g:
            if u == v:
                continue
            full = four_minor_vector(g, u, v)
            for z in leaves:
                if z in (u, v):
                    continue
                s = next(iter(g.neighbors(z)))
                h = g.copy()
                h.remove_node(z)
                if u not in h or v not in h:
                    continue
                deleted = four_minor_vector(h, u, v)
                q = None
                lower = None
                if s not in (u, v):
                    q = g.copy()
                    q.remove_nodes_from([z, s])
                    if u in q and v in q:
                        lower = four_minor_vector(q, u, v)
                for r in range(3, alpha + 1):
                    f = full[r] if r < len(full) else 0
                    d = deleted[r] if r < len(deleted) else 0
                    l = lower[r - 1] if lower is not None and r - 1 < len(lower) else 0
                    value = f - d - l
                    summary["checks"] += 1
                    summary["collision_checks" if s in (u, v) else "ordinary_checks"] += 1
                    if value < 0:
                        summary["negatives"] += 1
                    old = summary.get("minimum")
                    if old is None or value < old["value"]:
                        summary["minimum"] = {
                            "value": value,
                            "n": len(g),
                            "r": r,
                            "u": int(u),
                            "v": int(v),
                            "z": int(z),
                            "support": int(s),
                            "collision": s in (u, v),
                            "full": f,
                            "deleted": d,
                            "lower": l,
                            "graph6": graph6(nx.convert_node_labels_to_integers(g)),
                            "polynomial": poly_forest(g),
                        }
                    if value < 0 and len(negatives) < 50:
                        negatives.append(summary["minimum"].copy())

            for z in [x for x in g if g.degree(x) == 0 and x not in (u, v)]:
                h = g.copy()
                h.remove_node(z)
                deleted = four_minor_vector(h, u, v)
                for r in range(3, alpha + 1):
                    f = full[r] if r < len(full) else 0
                    d = deleted[r] if r < len(deleted) else 0
                    l = deleted[r - 1] if r - 1 < len(deleted) else 0
                    value = f - d - l
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
                            "u": int(u),
                            "v": int(v),
                            "z": int(z),
                            "kind": "isolate",
                            "full": f,
                            "deleted": d,
                            "lower": l,
                            "graph6": graph6(nx.convert_node_labels_to_integers(g)),
                            "polynomial": poly_forest(g),
                        }
                    if value < 0 and len(negatives) < 50:
                        negatives.append(summary["minimum"].copy())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=9)
    args = parser.parse_args()
    summary = {
        "max_n": args.max_n,
        "checks": 0,
        "ordinary_checks": 0,
        "collision_checks": 0,
        "isolate_checks": 0,
        "negatives": 0,
    }
    negatives: list[dict] = []
    for n in range(3, args.max_n + 1):
        for g in nx.nonisomorphic_trees(n):
            audit_tree(g, summary, negatives)
    for g in nx.graph_atlas_g():
        if len(g) >= 3 and nx.is_forest(g):
            audit_tree(g, summary, negatives)
    report = {
        "marker": "PROBE_EXACT_ISO_FOUR_MINOR_THIRD_LEAF_RECURSION",
        "summary": summary,
        "negative_records": negatives,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_four_minor_third_leaf_probe_root_20260829.json").write_text(raw, encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print("PROBE_EXACT_ISO_FOUR_MINOR_THIRD_LEAF_RECURSION")


if __name__ == "__main__":
    main()
