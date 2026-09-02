#!/usr/bin/env python3
"""Finite exact probe of a factor route for the rank-five C5 reserve.

In the nonadjacent, no-shared-A-component geometry, write the two one-mark
components as X=P+xP0 and Y=Q+xQ0 and the untouched forest as R.  Direct
substitution in the four-minor defect gives

  R_defect = R(z)R(w) Phi(X,P) Phi(Y,Q),
  Phi(X,P) = z X(w)P(z) + w X(z)P(w).

If every fixed-total slice of the three symmetric bivariate factors is
centrally unimodal through total degree eight, convolution proves
[z^4w^4]R_defect >= [z^3w^5]R_defect.  This script tests the proposed local
slice statements exactly on finite forests/rooted trees.  It is diagnostic,
not an all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_g1_h_all_forest_root import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_factor_slice_unimodality_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_C5_FACTOR_SLICE_UNIMODALITY_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def product_factor(row, maximum=8):
    return {
        (i, j): at(row, i) * at(row, j)
        for i in range(maximum + 1)
        for j in range(maximum + 1 - i)
    }


def phi_factor(p, p0, maximum=8):
    # X=P+xP0.  Phi=(z+w)P(z)P(w)+zw(P0(w)P(z)+P0(z)P(w)).
    values = {}
    for i in range(maximum + 1):
        for j in range(maximum + 1 - i):
            values[(i, j)] = (
                at(p, i - 1) * at(p, j)
                + at(p, i) * at(p, j - 1)
                + at(p0, j - 1) * at(p, i - 1)
                + at(p0, i - 1) * at(p, j - 1)
            )
    return values


def new_bucket():
    return {
        "objects": 0,
        "slice_steps": 0,
        "negative_steps": 0,
        "minimum_step": None,
        "witness": None,
        "by_slice_step": {},
    }


def audit_slices(values, bucket, witness, maximum=8):
    bucket["objects"] += 1
    for total in range(maximum + 1):
        for left in range(total // 2):
            outer = values.get((left, total - left), 0)
            inner = values.get((left + 1, total - left - 1), 0)
            step = inner - outer
            key = f"{total}:{left}"
            local = bucket["by_slice_step"].setdefault(
                key,
                {"checks": 0, "negative": 0, "minimum_step": None, "witness": None},
            )
            local["checks"] += 1
            local["negative"] += int(step < 0)
            if local["minimum_step"] is None or step < local["minimum_step"]:
                local["minimum_step"] = step
                local["witness"] = {
                    **witness,
                    "outer": outer,
                    "inner": inner,
                }
            bucket["slice_steps"] += 1
            bucket["negative_steps"] += int(step < 0)
            if bucket["minimum_step"] is None or step < bucket["minimum_step"]:
                bucket["minimum_step"] = step
                bucket["witness"] = {
                    **witness,
                    "total_degree": total,
                    "outer_index": [left, total - left],
                    "outer": outer,
                    "inner": inner,
                }


def rooted_rows(tree, root):
    deleted_root = tree.copy()
    deleted_root.remove_node(root)
    deleted_closed = tree.copy()
    deleted_closed.remove_nodes_from({root, *tree.neighbors(root)})
    return tuple(poly_forest(deleted_root)), tuple(poly_forest(deleted_closed))


def graph6(graph):
    return nx.to_graph6_bytes(graph, header=False).decode().strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-forest-order", type=int, default=12)
    parser.add_argument("--max-tree-order", type=int, default=14)
    args = parser.parse_args()

    report = {
        "marker": MARKER,
        "factor_identity": (
            "R_defect(R*(XY,PY,XQ,PQ))="
            "R(z)R(w)*Phi(X,P)*Phi(Y,Q)"
        ),
        "common_forest_factor": new_bucket(),
        "one_mark_phi_factor": new_bucket(),
    }

    for order in range(args.max_forest_order + 1):
        for forest in forest_graphs(order):
            row = tuple(poly_forest(forest))
            audit_slices(
                product_factor(row),
                report["common_forest_factor"],
                {"order": order, "graph6": graph6(forest), "row": row},
            )

    for order in range(1, args.max_tree_order + 1):
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                p, p0 = rooted_rows(tree, root)
                audit_slices(
                    phi_factor(p, p0),
                    report["one_mark_phi_factor"],
                    {
                        "order": order,
                        "graph6": graph6(tree),
                        "root": root,
                        "P": p,
                        "P0": p0,
                    },
                )

    report["orders"] = {
        "forests": [0, args.max_forest_order],
        "rooted_trees": [1, args.max_tree_order],
    }
    report["scope"] = (
        "Finite exact factor diagnostic only. Passing does not prove the all-order "
        "slice properties or the unique-shared-component case."
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
