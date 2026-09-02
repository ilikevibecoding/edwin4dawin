#!/usr/bin/env python3
"""Test coefficientwise-containment relaxations for the coupled L/K debt.

For each exact forest independence row A through a chosen order, enumerate
box corners 0<=B,C<=A.  In the nonadjacent case choose each D coordinate at
the endpoint minimizing K(A,D), subject only to 0<=D<=B,C.  A negative row is
an exact obstruction to proving the g1 partition from coefficientwise
containment alone; it is not a forest counterexample unless the four rows are
jointly realizable.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_no_mark_root_compact_components_root import h_block, k_block, l_block


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_lk_box_relaxation_probe_root_20260829.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_LK_BOX_RELAXATION_ROOT"


def forest_polynomials(maximum_order: int):
    seen = set()
    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0:
            row = (1,)
            if row not in seen:
                seen.add(row)
                yield row
        elif len(graph0) <= maximum_order and nx.is_forest(graph0):
            row = tuple(poly_forest(graph0))
            if row not in seen:
                seen.add(row)
                yield row
    for order in range(8, maximum_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            row = tuple(poly_forest(graph))
            if row not in seen:
                seen.add(row)
                yield row


def corner(row: tuple[int, ...], mask: int, maximum: int = 5) -> tuple[int, ...]:
    return tuple(
        1 if rank == 0 else (row[rank] if rank < len(row) and mask & (1 << (rank - 1)) else 0)
        for rank in range(maximum + 1)
    )


def optimal_d(a, b, c):
    # K(A,D) is coordinatewise linear.  Probe each available coordinate and
    # retain its upper endpoint exactly when that lowers the value.
    d = [1, 0, 0, 0, 0]
    for rank in range(1, 5):
        upper = min(b[rank], c[rank])
        if upper == 0:
            continue
        test = d.copy()
        test[rank] = upper
        if k_block(a, tuple(test)) < k_block(a, tuple(d)):
            d = test
    return tuple(d)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=12)
    args = parser.parse_args()
    report = {
        "marker": MARKER,
        "maximum_order": args.max_order,
        "polynomials": 0,
        "corner_pairs": 0,
        "adjacent_minimum": None,
        "nonadjacent_minimum": None,
        "scope": "Relaxed coefficient box only; witnesses need not be jointly forest-realizable.",
    }
    for a in forest_polynomials(args.max_order):
        report["polynomials"] += 1
        h = h_block(a)
        for bmask in range(1 << 5):
            b = corner(a, bmask)
            for cmask in range(1 << 5):
                c = corner(a, cmask)
                base = h + l_block(a, b) + l_block(a, c) + k_block(b, c)
                d = optimal_d(a, b, c)
                values = {"adjacent_minimum": base, "nonadjacent_minimum": base + k_block(a, d)}
                for name, value in values.items():
                    old = report[name]
                    if old is None or value < old["value"]:
                        report[name] = {
                            "value": value,
                            "A": a, "B_mask": bmask, "C_mask": cmask, "D": d,
                        }
                report["corner_pairs"] += 1
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
