#!/usr/bin/env python3
"""Finite route probe for eliminating a marked isolated terminal root.

For a forest R, form G0=R disjoint_union K1 with the new vertex w marked.
For a vertex v of R, form G1=G0+wv.  The nonisolated-root theorem applies
to G1.  This probe asks whether the exact comparison

    d1(G0,w,j) >= d1(G1,w,j)

holds for a useful canonical choice of v (in particular a leaf).  It is
finite route evidence only, not an all-order theorem.
"""

from __future__ import annotations

import hashlib
import json

import networkx as nx

from audit_terminal_q3_m1_leaf_bridge_correction_agent import Oracle, canonical_m1


def graph_code(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def supported_targets(oracle: Oracle, root: int):
    fmask = oracle.full & ~(1 << root)
    row = oracle.independent(fmask)
    return [j for j in range(3, len(row)) if row[j] > 0]


def main() -> None:
    checks = 0
    negatives = []
    per_forest_choice_failures = []
    minimum = None
    stream = hashlib.sha256()

    forests = [
        nx.convert_node_labels_to_integers(g)
        for g in nx.graph_atlas_g()
        if 1 <= len(g) <= 7 and nx.is_forest(g)
    ]
    for R in forests:
        n = len(R)
        G0 = nx.disjoint_union(R, nx.empty_graph(1))
        root = n
        oracle0 = Oracle(G0)
        targets = supported_targets(oracle0, root)
        if not targets:
            continue

        candidates = [v for v in R if R.degree(v) <= 1]
        forest_success = {j: False for j in targets}
        for v in candidates:
            G1 = G0.copy()
            G1.add_edge(root, v)
            oracle1 = Oracle(G1)
            for j in targets:
                d0 = canonical_m1(oracle0, root, j)
                d1 = canonical_m1(oracle1, root, j)
                difference = d0 - d1
                forest_success[j] |= difference >= 0
                record = (difference, n, graph_code(R), v, R.degree(v), j, d0, d1)
                minimum = record if minimum is None else min(minimum, record)
                stream.update(("|".join(map(str, record)) + "\n").encode())
                if difference < 0 and len(negatives) < 40:
                    negatives.append(record)
                checks += 1

        for j, success in forest_success.items():
            if not success:
                per_forest_choice_failures.append((n, graph_code(R), j))

    report = {
        "status": (
            "SEARCH_MARKED_ISOLATE_BRIDGE_NO_NEGATIVES"
            if not negatives
            else "SEARCH_MARKED_ISOLATE_BRIDGE_NEGATIVES_FOUND"
        ),
        "scope": "all atlas forests through order 7; route evidence only",
        "forests": len(forests),
        "checks": checks,
        "negative_candidate_comparisons": len(negatives),
        "first_negative_candidate_comparisons": negatives,
        "forest_target_cells_without_any_good_degree01_choice": per_forest_choice_failures,
        "minimum": minimum,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
