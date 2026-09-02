#!/usr/bin/env python3
"""Exact finite scan for the rooted rank-5 cross-drop inequality.

For every unlabeled tree (T,p), let

    d=i_3(T), e=i_4(T), f=i_5(T),
    h=i_3(T-p), k=i_4(T-p).

The scan checks

    d(e^2-df) - 2e(eh-dk) >= 0.

It also records the stronger large-order sufficient margin

    d(2e+d) - 20(eh-dk).
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6
from scan_rank4_leaf_curvature_fast import all_root_states, coefficient


TREE_COUNTS = {
    13: 1301,
    14: 3159,
    15: 7741,
    16: 19320,
    17: 48629,
    18: 123867,
    19: 317955,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-order", type=int, default=13)
    parser.add_argument("--max-order", type=int, default=19)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    rows = []
    total_trees = 0
    total_roots = 0
    total_cross_failures = 0
    for order in range(args.min_order, args.max_order + 1):
        trees = 0
        roots = 0
        cross_failures = 0
        simple_failures = 0
        minimum_cross = None
        minimum_cross_witness = None
        minimum_simple = None
        minimum_simple_witness = None
        for tree_index, tree in enumerate(
            nx.nonisomorphic_trees(order)
        ):
            trees += 1
            deleted_by_root, whole = all_root_states(tree)
            d = coefficient(whole, 3)
            e = coefficient(whole, 4)
            f = coefficient(whole, 5)
            code = None
            for root, deleted in deleted_by_root.items():
                roots += 1
                h = coefficient(deleted, 3)
                k = coefficient(deleted, 4)
                root_determinant = e * h - d * k
                cross = d * (e * e - d * f) - 2 * e * (
                    root_determinant
                )
                simple = d * (2 * e + d) - 20 * root_determinant
                if cross < 0:
                    cross_failures += 1
                if simple < 0:
                    simple_failures += 1
                if minimum_cross is None or cross < minimum_cross:
                    if code is None:
                        code = graph6(tree)
                    minimum_cross = cross
                    minimum_cross_witness = {
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "window": [d, e, f, h, k],
                        "cross_margin": cross,
                    }
                if minimum_simple is None or simple < minimum_simple:
                    if code is None:
                        code = graph6(tree)
                    minimum_simple = simple
                    minimum_simple_witness = {
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "window": [d, e, f, h, k],
                        "simple_margin": simple,
                    }
        assert trees == TREE_COUNTS[order]
        assert roots == order * trees
        assert minimum_cross is not None
        assert minimum_simple is not None
        total_trees += trees
        total_roots += roots
        total_cross_failures += cross_failures
        rows.append(
            {
                "order": order,
                "trees": trees,
                "roots": roots,
                "cross_failures": cross_failures,
                "simple_failures": simple_failures,
                "minimum_cross": minimum_cross,
                "minimum_cross_witness": minimum_cross_witness,
                "minimum_simple": minimum_simple,
                "minimum_simple_witness": minimum_simple_witness,
            }
        )
        print(
            f"n={order} trees={trees:,} roots={roots:,} "
            f"min_cross={minimum_cross} "
            f"simple_failures={simple_failures:,} "
            f"min_simple={minimum_simple}",
            flush=True,
        )

    payload = {
        "claim_scope": (
            "Exact rooted cross-drop scan on every unlabeled tree and "
            "every root in the stated order range."
        ),
        "parameters": {
            "min_order": args.min_order,
            "max_order": args.max_order,
        },
        "totals": {
            "trees": total_trees,
            "roots": total_roots,
            "cross_failures": total_cross_failures,
        },
        "per_order": rows,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    assert total_cross_failures == 0
    print("finite rooted cross-drop scan: PASS", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
