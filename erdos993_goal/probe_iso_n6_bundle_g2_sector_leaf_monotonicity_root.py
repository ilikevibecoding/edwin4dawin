#!/usr/bin/env python3
"""Test same-sector leaf monotonicity for all 256 g2 box vertices."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from search_iso_n6_bundle_g2_category_box_root import category_counts


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_sector_leaf_monotonicity_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_SECTOR_LEAF_MONOTONICITY_ROOT"


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    cvars = tuple(sorted(expression.free_symbols - set(dvars), key=str))
    cnames = tuple(map(str, cvars))
    base = expression.subs({x: 0 for x in dvars})
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    functions = []
    for mask in range(1 << len(mixed)):
        selected = always_negative | {label for bit, label in enumerate(mixed) if mask & (1 << bit)}
        value = base
        for dvar in dvars:
            if str(dvar) in selected:
                value += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        functions.append(sp.lambdify(cvars, value, "math"))

    cells = negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for order in range(3, 10):
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(graph, 2):
                before_values = category_counts(graph, u, v)
                before_args = tuple(before_values[name] for name in cnames)
                before = tuple(int(fn(*before_args)) for fn in functions)
                for leaf in graph:
                    if leaf in (u, v) or graph.degree(leaf) > 1:
                        continue
                    reduced = graph.copy()
                    reduced.remove_node(leaf)
                    after_values = category_counts(reduced, u, v)
                    after_args = tuple(after_values[name] for name in cnames)
                    after = tuple(int(fn(*after_args)) for fn in functions)
                    for mask, (left, right) in enumerate(zip(before, after)):
                        delta = left - right
                        cells += 1
                        negative += int(delta < 0)
                        if minimum is None or delta < minimum:
                            minimum = delta
                            witness = {
                                "delta": delta, "before": left, "after": right,
                                "order": order, "graph6": graph6,
                                "marks": [u, v], "leaf": leaf, "mask": mask,
                            }
                    stream.update(f"{order}|{graph6}|{u}|{v}|{leaf}|{min(x-y for x,y in zip(before,after))};".encode())
                    if negative:
                        break
                if negative:
                    break
            if negative:
                break
        if negative:
            break
    report = {
        "marker": MARKER, "orders": [3, 9], "sector_leaf_cells": cells,
        "negative_delta": negative, "minimum_delta": minimum, "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic same-sector monotonicity test; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
